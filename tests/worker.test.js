// The Worker's rules: sign-in through the user list, own keys never leave, shared links only by admins, the browser never
// picks a URL, and the hand-written Ozonetel GET-with-body request.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { getWithBody } from "../src/worker.js";

const ENV = { SUPABASE_URL: "https://sb.test", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_KEY: "service", ASSETS: { fetch: async () => new Response("asset") } };
const db = { erc_users: [{ email: "amit@x.in", role: "admin" }, { email: "user@x.in", role: "viewer" }],
             erc_settings: [{ key: "ROSTER_URL", value: "https://docs.google.com/roster.csv" }],
             lc_user_settings: [{ email: "amit@x.in", key: "ACEFONE_TOKEN", value: "AMIT-LC-ACE" }],
             erc_user_settings: [{ email: "user@x.in", key: "LSQ_ACCESS_KEY", value: "SECRET-AK" }, { email: "user@x.in", key: "LSQ_SECRET_KEY", value: "SECRET-SK" }] };
const upstream = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.startsWith("https://sb.test/auth/v1/user")) {
    const tok = (init.headers.Authorization || "").slice(7);
    return tok === "bad" ? new Response("{}", { status: 401 }) : new Response(JSON.stringify({ email: `${tok}@x.in` }));
  }
  if (url.startsWith("https://sb.test/rest/v1/")) {
    const u = new URL(url), table = u.pathname.split("/").pop();
    if (init.method === "POST") {
      for (const row of JSON.parse(init.body)) {
        const t = db[table];
        const same = table === "erc_user_settings" ? (r) => r.email === row.email && r.key === row.key : (r) => r.key === row.key;
        const i = t.findIndex(same); if (i >= 0) t[i] = { ...t[i], ...row }; else t.push(row);
      }
      return new Response("", { status: 201 });
    }
    let rows = db[table] || [];
    for (const [k, v] of u.searchParams) if (v.startsWith("eq.")) rows = rows.filter((r) => String(r[k]) === v.slice(3));
    return new Response(JSON.stringify(rows));
  }
  upstream.push({ url, init });
  return new Response("Caller Name,Team Name\nA,B\n", { status: 200 });
};
const call = (who, op, args = {}) => worker.fetch(new Request("https://erc.test/x/op", { method: "POST",
  headers: { Authorization: `Bearer ${who}`, "content-type": "application/json" }, body: JSON.stringify({ op, args }) }), ENV);

test("only people on the console's list get in", async () => {
  assert.equal((await call("bad", "me")).status, 401);
  assert.equal((await call("stranger", "me")).status, 403);
  assert.equal((await (await call("user", "me")).json()).admin, false);
  assert.equal((await (await call("amit", "me")).json()).admin, true);
});
test("own keys are masked even to their owner, and nobody else has them", async () => {
  const mine = await (await call("user", "settings.get")).json();
  assert.equal(mine.settings.LSQ_ACCESS_KEY, "************");
  assert.ok(!/SECRET-(AK|SK)/.test(JSON.stringify(mine)));
  const admin = await (await call("amit", "settings.get")).json();
  assert.equal(admin.settings.LSQ_ACCESS_KEY, "");
});
test("shared links: admins change them, others cannot; a masked key sent back keeps the saved one", async () => {
  const r = await call("user", "settings.set", { settings: { CER_PUSH_URL: "https://script.google.com/other" } });
  assert.equal(r.status, 403);
  assert.equal((await call("amit", "settings.set", { settings: { CER_PUSH_URL: "https://script.google.com/new" } })).status, 200);
  assert.equal(db.erc_settings.find((x) => x.key === "CER_PUSH_URL").value, "https://script.google.com/new");
  assert.equal((await call("amit", "settings.set", { settings: { ROSTER_URL: "not a link" } })).status, 400);
  await call("user", "settings.set", { settings: { LSQ_ACCESS_KEY: "************", DEFAULT_FETCH_DAYS: "45" } });
  assert.equal(db.erc_user_settings.find((x) => x.email === "user@x.in" && x.key === "LSQ_ACCESS_KEY").value, "SECRET-AK");
  assert.equal(db.erc_user_settings.find((x) => x.email === "user@x.in" && x.key === "DEFAULT_FETCH_DAYS").value, "45");
});
test("sheets are read by setting name only — never a URL from the browser", async () => {
  assert.equal((await call("user", "sheet.read", { key: "https://evil.test/x" })).status, 400);
  assert.equal((await call("user", "sheet.read", { key: "CER_PUSH_URL" })).status, 400);       // a push link is not readable
  const r = await call("user", "sheet.read", { key: "ROSTER_URL" });
  assert.equal(r.headers.get("x-up-status"), "200");
  assert.equal(upstream.at(-1).url, "https://docs.google.com/roster.csv");
  assert.equal((await call("user", "sheet.push", { key: "ROSTER_URL", rows: [["a"]] })).status, 400);  // a read link cannot be pushed to
});
test("LeadSquared calls use the caller's own keys", async () => {
  await call("user", "lsq.users");
  assert.ok(upstream.at(-1).url.includes("accessKey=SECRET-AK"));
  const r = await call("amit", "lsq.users");
  assert.equal(r.status, 400);                                   // the admin has no keys of their own: no shared fallback
});
test("a key saved in the Leads Console is used until the person saves one here — only their own", async () => {
  const amit = await (await call("amit", "settings.get")).json();
  assert.equal(amit.settings.ACEFONE_TOKEN, "************");
  const user = await (await call("user", "settings.get")).json();
  assert.equal(user.settings.ACEFONE_TOKEN, "");
});
test("Ozonetel: GET with a JSON body is written by hand, and a chunked reply is read back", async () => {
  let sent = "";
  const reply = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n" +
    "a\r\n{\"status\":\r\n10\r\n\"success\",\"n\":1}\r\n0\r\n\r\n";
  const connect = () => ({
    writable: new WritableStream({ write(chunk) { sent += new TextDecoder().decode(chunk); } }),
    readable: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(reply)); c.close(); } }),
    close: async () => {},
  });
  const body = JSON.stringify({ fromDate: "2026-11-20 00:00:00", toDate: "2026-11-20 23:59:59", userName: "u" });
  const r = await getWithBody("https://in1-ccaas-api.ozonetel.com/ca_reports/fetchCDRDetails?pageNo=1&pageSize=500&apiKey=k", { apiKey: "k", "Content-Type": "application/json" }, body, connect);
  assert.match(sent, /^GET \/ca_reports\/fetchCDRDetails\?pageNo=1&pageSize=500&apiKey=k HTTP\/1\.1\r\n/);
  assert.match(sent, new RegExp(`Content-Length: ${body.length}\\r\\n\\r\\n`));
  assert.ok(sent.endsWith(body));
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(r.body)), { status: "success", n: 1 });
});
test("Ozonetel's address must be an ozonetel.com one", async () => {
  db.erc_user_settings.push({ email: "user@x.in", key: "OZONETEL_API_KEY", value: "k" }, { email: "user@x.in", key: "OZONETEL_USERNAME", value: "u" });
  assert.equal((await call("amit", "settings.set", { settings: { OZONETEL_API_URL: "https://evil.test/cdr" } })).status, 200);
  const r = await call("user", "ozonetel.cdr", { day: "2026-11-20", page_no: 1 });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /ozonetel\.com/);
});
