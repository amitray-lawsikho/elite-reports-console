/* Elite Reports Console — Cloudflare Worker.
   Serves the pages (static assets) and one endpoint, POST /x/op, for anything that needs a key or a sheet link. Every call:
     1. checks the Supabase sign-in (Authorization: Bearer <access token>) and that the email is on erc_users (kept in step
        by the Sales Intelligence Portal);
     2. runs ONE named operation — the browser never chooses a URL: provider endpoints are fixed here, sheet and push links are
        read from the shared settings by their setting name;
     3. returns the provider's answer unchanged, with its HTTP status in the x-up-status header.
   Keys (LeadSquared, Ozonetel, MCube, Acefone) belong to each person (erc_user_settings) and never reach a browser; sheet
   links are shared (erc_settings) and only console admins change them. Secret: SUPABASE_SERVICE_KEY (Calling project). */
import { SPEC, MASK, TOKEN_KEYS, READ_KEYS, PUSH_KEYS, credentialStatus, getSetting, isPersonal } from "./shared/spec.js";

const MCUBE_BROWSER = {
  accept: "application/json, text/plain, */*", "accept-language": "en-US,en;q=0.9",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8", origin: "https://app.mcube.com", referer: "https://app.mcube.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
};
const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };
const ACEFONE = "https://api.acefone.in";
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PORTAL_URL = "https://sales-intelligence-portal.amitray.workers.dev";

class Fail extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/* ------------------------------------------------------------------ Supabase (service key) */
function sb(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init,
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
}
async function sbJson(env, path, init) {
  const r = await sb(env, path, init);
  const text = await r.text();
  if (!r.ok) throw new Fail(`Database: HTTP ${r.status} — ${text.slice(0, 300)}`, 502);
  return text ? JSON.parse(text) : null;
}

/* ------------------------------------------------------------------ who is calling */
const tokenCache = new Map(), userCache = new Map();
let globalCache = null;
async function whoIs(env, request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Fail("Sign in first.", 401);
  const now = Date.now();
  let hit = tokenCache.get(token);
  if (!hit || hit.until < now) {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Fail("Your sign-in has expired — open the console again from the Sales Intelligence Portal.", 401);
    const u = await r.json();
    hit = { email: String(u.email || "").toLowerCase(), until: now + 5 * 60 * 1000 };
    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(token, hit);
  }
  let row = userCache.get(hit.email);
  if (!row || row.until < now) {
    const rows = await sbJson(env, `erc_users?select=email,role&email=eq.${encodeURIComponent(hit.email)}`);
    row = { row: rows && rows[0] ? rows[0] : null, until: now + 60 * 1000 };
    userCache.set(hit.email, row);
  }
  if (!row.row) throw new Fail(`${hit.email} has no access to the Elite Reports Console. Ask a portal admin to give it in the Sales Intelligence Portal.`, 403);
  return { email: hit.email, admin: row.row.role === "admin" };
}

/* ------------------------------------------------------------------ settings */
async function globalValues(env, fresh = false) {
  const now = Date.now();
  if (!fresh && globalCache && globalCache.until > now) return globalCache.values;
  const values = {};
  for (const r of (await sbJson(env, "erc_settings?select=key,value")) || []) values[r.key] = r.value;
  globalCache = { values, until: now + 30 * 1000 };
  return values;
}
async function userValues(env, email) {
  const values = {};
  for (const r of (await sbJson(env, `erc_user_settings?select=key,value&email=eq.${encodeURIComponent(email)}`)) || []) values[r.key] = r.value;
  return values;
}
/* Keys a person already saved in the Leads Console (same accounts, same keys) are used until they save their own here —
   always that person's own, never anyone else's. */
const LC_SHARED_KEYS = ["LSQ_ACCESS_KEY", "LSQ_SECRET_KEY", "MCUBE_API_KEY", "MCUBE_AUTHORIZATION", "MCUBE_GETAGENTS_TOKEN", "MCUBE_EMPLOYEES_AUTHORIZATION", "ACEFONE_TOKEN"];
async function leadsConsoleKeys(env, email) {
  try {
    const rows = await sbJson(env, `lc_user_settings?select=key,value&email=eq.${encodeURIComponent(email)}&key=in.(${LC_SHARED_KEYS.join(",")})`);
    return Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
  } catch { return {}; }
}
async function effective(env, me) {
  const [g, u, lc] = await Promise.all([globalValues(env), userValues(env, me.email), leadsConsoleKeys(env, me.email)]);
  const v = {};
  for (const k of Object.keys(SPEC)) v[k] = isPersonal(k) ? (String(u[k] ?? "").trim() || (LC_SHARED_KEYS.includes(k) ? lc[k] ?? "" : "")) : (g[k] ?? "");
  return v;
}
function need(v, key, label) {
  const val = getSetting(v, key);
  if (!val) {
    if (SPEC[key] && SPEC[key].scope === "user_token") throw new Fail(`${label || key} is not set for you yet. Open "Setup and links" and paste your own key.`);
    throw new Fail(`${label || key} is not configured. A console admin sets it on "Setup and links".`);
  }
  return val;
}
function snapshot(v) {
  const out = {};
  for (const [k, s] of Object.entries(SPEC)) { const val = getSetting(v, k); out[k] = s.scope === "user_token" ? (val ? MASK : "") : val; }
  return out;
}

/* ------------------------------------------------------------------ provider calls */
const pass = (upstream, label) => new Response(upstream.body, { status: 200, headers: {
  "content-type": upstream.headers.get("content-type") || "application/octet-stream", "x-up-status": String(upstream.status), "x-up-label": label, "cache-control": "no-store" } });
const raw = (status, body, label, type = "application/json") => new Response(body, { status: 200, headers: { "content-type": type, "x-up-status": String(status), "x-up-label": label, "cache-control": "no-store" } });
const post = (url, payload, headers) => fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
function lsqHost(v) {
  const t = String(getSetting(v, "LSQ_HOST")).trim().replace(/^["']|["']$/g, "").replace(/^https?:\/\//i, "");
  return t.split("/")[0].trim().replace(/^\.+|\.+$/g, "");
}
function lsqUrl(v, path) {
  const q = new URLSearchParams({ accessKey: need(v, "LSQ_ACCESS_KEY", "LeadSquared access key (LSQ_ACCESS_KEY)"), secretKey: need(v, "LSQ_SECRET_KEY", "LeadSquared secret key (LSQ_SECRET_KEY)") });
  return `https://${lsqHost(v)}${path}?${q}`;
}
const acef = (v) => ({ Accept: "application/json", Authorization: `Bearer ${need(v, "ACEFONE_TOKEN", "Acefone API token (ACEFONE_TOKEN)")}` });
function id(value, what) { const s = String(value ?? "").trim(); if (!SAFE_ID.test(s)) throw new Fail(`Invalid ${what}.`); return s; }
function httpsUrl(url, what) {
  let u;
  try { u = new URL(String(url)); } catch { throw new Fail(`${what} is not a valid link.`); }
  if (u.protocol !== "https:") throw new Fail(`${what} must be an https:// link.`);
  return u;
}

/* Ozonetel's CDR endpoint wants a GET with a JSON body, which fetch() refuses to send; so the request is written by hand
   over a TLS socket (exactly what Python's requests sends), and the reply read back. */
async function getWithBody(url, headers, bodyText, connectFn = null) {
  const connect = connectFn || (await import("cloudflare:sockets")).connect;
  const u = new URL(url);
  const socket = connect({ hostname: u.hostname, port: Number(u.port || 443) }, { secureTransport: "on", allowHalfOpen: false });
  const bytes = new TextEncoder().encode(bodyText);
  const head = [`GET ${u.pathname}${u.search} HTTP/1.1`, `Host: ${u.host}`, "Connection: close", "Accept: application/json", "Accept-Encoding: identity",
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), `Content-Length: ${bytes.length}`, "", ""].join("\r\n");
  const w = socket.writable.getWriter();
  await w.write(new TextEncoder().encode(head));
  await w.write(bytes);
  w.releaseLock();
  const chunks = [];
  const reader = socket.readable.getReader();
  let total = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; chunks.push(value); total += value.length; if (total > 50 * 1024 * 1024) break; }
  try { await socket.close(); } catch { /* closed */ }
  const all = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  let split = -1;
  for (let i = 0; i + 3 < all.length; i++) if (all[i] === 13 && all[i + 1] === 10 && all[i + 2] === 13 && all[i + 3] === 10) { split = i; break; }
  if (split < 0) throw new Fail("Ozonetel sent an incomplete reply.", 502);
  const headText = new TextDecoder().decode(all.subarray(0, split));
  const status = parseInt((headText.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/) || [])[1] || "502", 10);
  let body = all.subarray(split + 4);
  if (/\r\ntransfer-encoding:\s*chunked/i.test(headText)) {
    const parts = [];
    let p = 0;
    for (;;) {
      let e = p;
      while (e + 1 < body.length && !(body[e] === 13 && body[e + 1] === 10)) e++;
      const size = parseInt(new TextDecoder().decode(body.subarray(p, e)).split(";")[0].trim(), 16);
      if (!size) break;
      parts.push(body.subarray(e + 2, e + 2 + size));
      p = e + 2 + size + 2;
      if (p >= body.length) break;
    }
    const n = parts.reduce((a, b) => a + b.length, 0), out = new Uint8Array(n);
    let q = 0;
    for (const part of parts) { out.set(part, q); q += part.length; }
    body = out;
  } else {
    const len = (headText.match(/\r\ncontent-length:\s*(\d+)/i) || [])[1];
    if (len) body = body.subarray(0, parseInt(len, 10));
  }
  return { status, body };
}

/* ------------------------------------------------------------------ operations */
const OPS = {
  async me(env, me) { return json({ ok: true, email: me.email, admin: me.admin }); },
  async "settings.get"(env, me) {
    const v = await effective(env, me);
    return json({ ok: true, settings: snapshot(v), status: credentialStatus(v), spec: Object.keys(SPEC).sort(),
                  scopes: Object.fromEntries(Object.entries(SPEC).map(([k, s]) => [k, s.scope])), admin: me.admin, email: me.email });
  },
  async "settings.set"(env, me, a) {
    const written = [], mine = [], shared = [];
    const current = await globalValues(env, true);
    for (const [k, rawValue] of Object.entries(a.settings || {})) {
      const s = SPEC[k];
      if (!s || rawValue === null || rawValue === undefined) continue;
      const value = String(rawValue).trim();
      if (s.scope === "user_token" && value && /^\*+$/.test(value)) continue;          // masked key sent back unchanged
      if (/_URL(_\d)?$/.test(k) && value && !/^https?:\/\//i.test(value)) throw new Fail(`${k} must be a full https:// link — got '${value.slice(0, 60)}'`);
      if (!isPersonal(k)) {
        if (value === getSetting(current, k) && (!me.admin || String(current[k] ?? "").trim() === value)) continue;   // unchanged shared value
        if (!me.admin) throw new Fail(`Only a console admin can change ${k}.`, 403);
        shared.push({ key: k, value, updated_by: me.email, updated_at: new Date().toISOString() });
      } else mine.push({ email: me.email, key: k, value, updated_at: new Date().toISOString() });
      written.push(k);
    }
    const upsert = { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" } };
    if (mine.length) await sbJson(env, "erc_user_settings?on_conflict=email,key", { ...upsert, body: JSON.stringify(mine) });
    if (shared.length) { await sbJson(env, "erc_settings?on_conflict=key", { ...upsert, body: JSON.stringify(shared) }); globalCache = null; }
    const v = await effective(env, me);
    return json({ ok: true, written, settings: snapshot(v), status: credentialStatus(v) });
  },
  async "users.list"(env, me) {
    if (!me.admin) throw new Fail("Only a console admin can see the user list.", 403);
    return json({ ok: true, users: await sbJson(env, "erc_users?select=email,role&order=email"), manage: `${PORTAL_URL}/#settings` });
  },

  /* sheets: read a shared link / push to a shared Apps Script link, by setting name */
  async "sheet.read"(env, me, a, v) {
    const key = String(a.key || "");
    if (!READ_KEYS.includes(key)) throw new Fail("Unknown sheet.");
    const url = httpsUrl(need(v, key, key), key);
    return pass(await fetch(url.toString(), { redirect: "follow" }), `Sheet ${key}`);
  },
  async "sheet.push"(env, me, a, v) {
    const key = String(a.key || "");
    if (!PUSH_KEYS.includes(key)) throw new Fail("Unknown push link.");
    if (!Array.isArray(a.rows) || !a.rows.length || !a.rows.every(Array.isArray)) throw new Fail("Nothing to push.");
    const url = httpsUrl(need(v, key, key), key);
    return pass(await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.rows), redirect: "follow" }), `Push ${key}`);
  },

  /* Ozonetel CDR, one page of one day */
  async "ozonetel.cdr"(env, me, a, v) {
    const day = String(a.day || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Fail("Invalid day.");
    const apiKey = need(v, "OZONETEL_API_KEY", "Ozonetel API key"), username = need(v, "OZONETEL_USERNAME", "Ozonetel username");
    const url = httpsUrl(getSetting(v, "OZONETEL_API_URL"), "OZONETEL_API_URL");
    if (!/(^|\.)ozonetel\.com$/i.test(url.hostname)) throw new Fail("OZONETEL_API_URL must be an ozonetel.com address.");
    url.search = new URLSearchParams({ pageNo: String(Math.max(1, parseInt(a.page_no, 10) || 1)), pageSize: String(Math.min(5000, Math.max(1, parseInt(a.page_size, 10) || 500))), apiKey }).toString();
    const { status, body } = await getWithBody(url.toString(), { apiKey, "Content-Type": "application/json" },
      JSON.stringify({ fromDate: `${day} 00:00:00`, toDate: `${day} 23:59:59`, userName: username }));
    return raw(status, body, "Ozonetel fetchCDRDetails");
  },

  /* MCube */
  async "mcube.getagents"(env, me, a, v) {
    return pass(await post("https://config.mcube.com/whatsapp-mcube/getagents", { AuthToken: need(v, "MCUBE_GETAGENTS_TOKEN", "MCube agents token (MCUBE_GETAGENTS_TOKEN)") }, JSON_HEADERS), "MCube getagents");
  },
  async "mcube.employees"(env, me, a, v) {
    // the reply also carries SIP credentials and password hashes: only the people list leaves here
    const r = await post("https://config.mcube.com/Restmcube-api/get-employees", { Authorization: need(v, "MCUBE_EMPLOYEES_AUTHORIZATION", "MCube employees key (MCUBE_EMPLOYEES_AUTHORIZATION)") },
      { ...MCUBE_BROWSER, "content-type": "application/json" });
    const text = await r.text();
    if (r.status >= 400) return raw(r.status, text.slice(0, 500), "MCube get-employees", "text/plain");
    let data;
    try { data = JSON.parse(text); } catch { return raw(200, text.slice(0, 300), "MCube get-employees", "text/plain"); }
    const keep = ["agent_id", "agent_name", "extension", "softphoneext", "email", "emp_phone", "is_logged_in", "oncall", "break_status"];
    const pick = (rows) => (Array.isArray(rows) ? rows.filter((x) => x && typeof x === "object").map((x) => Object.fromEntries(keep.filter((k) => k in x).map((k) => [k, x[k]]))) : rows);
    const out = data && typeof data === "object" ? { employees: pick(data.employees), agents: pick(data.agents), message: data.message,
      status: typeof data.status === "string" || typeof data.status === "boolean" ? data.status : undefined } : data;
    return raw(200, JSON.stringify(out), "MCube get-employees");
  },
  async "mcube.campaigns"(env, me, a, v) {
    return pass(await post("https://config.mcube.com/Restmcube-api/autodialer-list", { Authorization: need(v, "MCUBE_AUTHORIZATION", "MCube app token (MCUBE_AUTHORIZATION)") }, MCUBE_BROWSER), "MCube autodialer-list");
  },
  async "mcube.push"(env, me, a, v) {
    const key = need(v, "MCUBE_API_KEY", "MCube API key (MCUBE_API_KEY)");
    if (!Array.isArray(a.listData) || !a.listData.length || a.listData.length > 1000) throw new Fail("listData must be 1–1000 leads.");
    const cid = parseInt(id(a.campaign_id, "campaign"), 10);
    if (!Number.isFinite(cid)) throw new Fail(`campaign_id must be numeric, got '${a.campaign_id}'`);
    return pass(await post("https://config.mcube.com/Restmcube-api/campaign", { campaign_id: cid, listData: a.listData }, { ...JSON_HEADERS, Authorization: `Bearer ${key}` }), "MCube campaign upload");
  },

  /* Acefone */
  async "acefone.lists"(env, me, a, v) { return pass(await fetch(`${ACEFONE}/v1/broadcast/lists`, { headers: acef(v) }), "Acefone GET /v1/broadcast/lists"); },
  async "acefone.skill_lists"(env, me, a, v) { return pass(await fetch(`${ACEFONE}/v1/dialer/skill_lists`, { headers: acef(v) }), "Acefone GET /v1/dialer/skill_lists"); },
  async "acefone.skills"(env, me, a, v) {
    const q = new URLSearchParams({ limit: String(Math.min(100, parseInt(a.limit, 10) || 100)) });
    if (a.last_seen_id !== undefined && a.last_seen_id !== null && a.last_seen_id !== "") q.set("last_seen_id", String(a.last_seen_id));
    const path = `/v1/dialer/skills/${id(a.skill_list_id, "skill list")}`;
    return pass(await fetch(`${ACEFONE}${path}?${q}`, { headers: acef(v) }), `Acefone GET ${path}`);
  },
  async "acefone.bulk_create"(env, me, a, v) {
    if (!Array.isArray(a.data) || !a.data.length || a.data.length > 1000) throw new Fail("data must be 1–1000 leads.");
    const payload = { data: a.data };
    if (a.skill_id !== undefined && a.skill_id !== null && a.skill_id !== "") payload.skill_id = String(a.skill_id).trim();
    if (a.priority !== undefined && a.priority !== null && a.priority !== "") payload.priority = a.priority;
    const path = `/v1/broadcast/leads/${id(a.list_id, "lead list")}`;
    return pass(await fetch(`${ACEFONE}${path}`, { method: "POST", headers: { ...acef(v), "Content-Type": "application/json" }, body: JSON.stringify(payload) }), `Acefone POST ${path}`);
  },

  /* LeadSquared */
  async "lsq.users"(env, me, a, v) { const path = "/v2/UserManagement.svc/Users.Get"; return pass(await fetch(lsqUrl(v, path), { headers: { Accept: "application/json" } }), `LeadSquared GET ${path}`); },
  async "lsq.metadata"(env, me, a, v) { const path = "/v2/LeadManagement.svc/LeadsMetaData.Get"; return pass(await fetch(lsqUrl(v, path), { headers: { Accept: "application/json" } }), `LeadSquared GET ${path}`); },
  async "lsq.leads_get"(env, me, a, v) {
    const path = "/v2/LeadManagement.svc/Leads.Get", p = a.payload || {};
    if (!p.Parameter || !p.Paging) throw new Fail("Leads.Get needs Parameter and Paging.");
    return pass(await fetch(lsqUrl(v, path), { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(p) }), `LeadSquared POST ${path}`);
  },
};
const NEEDS_SETTINGS = (op) => /^(mcube|acefone|lsq|sheet|ozonetel)\./.test(op);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/x/op") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ ok: false, error: "POST only." }, 405);
    try {
      const me = await whoIs(env, request);
      let body;
      try { body = await request.json(); } catch { throw new Fail("Body must be JSON."); }
      const fn = Object.prototype.hasOwnProperty.call(OPS, body.op) ? OPS[body.op] : null;
      if (!fn) throw new Fail(`Unknown operation: ${body.op}`);
      const v = NEEDS_SETTINGS(body.op) ? await effective(env, me) : null;
      return await fn(env, me, body.args || {}, v);
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, e instanceof Fail ? e.status : 500);
    }
  },
};
export { OPS, TOKEN_KEYS, getWithBody };
