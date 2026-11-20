// Browser smoke test: every page with a fake Worker (LeadSquared, sheets, Ozonetel, MCube, Acefone built from the
// Reports Console's own mock data, tests/fixtures/reference.json) and a fake portal sign-in. Runs the whole Reports flow
// (fetch -> build -> preview -> push -> LSQ update -> dialer files -> pushes) and the Analysis pages; fails on any page error.
//   node tools/ui_smoke.mjs [outDir]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const WEB = path.resolve("web");
const OUT = process.argv[2] || "/tmp/erc-smoke";
fs.mkdirSync(OUT, { recursive: true });
const HOST = "http://erc.test";
const REF = JSON.parse(fs.readFileSync(path.resolve("tests/fixtures/reference.json"), "utf8"));
const CALLERS = ["Priya Singh", "Swati Jha", "Sonali Singh", "Suhail Showkat", "Salma Mallick"];
const USERS = CALLERS.map((c, i) => ({ ID: `u${i}`, FirstName: c.split(" ")[0], LastName: c.split(" ")[1], EmailAddress: `${c.split(" ")[0].toLowerCase()}@lawsikho.in`, StatusCode: 0 }));
const utc = (ms) => (ms === null ? "" : new Date(ms - 5.5 * 3600 * 1000 + (Date.now() + 5.5 * 3600 * 1000 - REF.now_ist)).toISOString().slice(0, 19).replace("T", " "));
const LEADS = REF.snapshot.map((r) => ({ ProspectID: r["Prospect ID"], FirstName: r["First Name"], LastName: r["Last Name"], EmailAddress: r.Email,
  mx_Enquired_Course: r["Enquired Course"], mx_Campaign_Name: r["Campaign Name"], ProspectStage: r["Contact Stage"], CreatedOn: utc(r._created),
  mx_Funnel_name: "", mx_Last_Call_new: "", OwnerId: `u${CALLERS.indexOf(r.Owner)}`, mx_Phone_call_counter: r["Phone call counter"], Phone: r["Phone Number"],
  mx_Report_Type: r.Report_Type, mx_Assigned_On_Call_Counter: r["Assigned On Call Counter"], mx_Zip_Intent: r["Zip Intent"],
  mx_Zip_Intent_Justification: r["Zip Intent Justification"], ModifiedOn: utc(r._modified), mx_Assigned_On: utc(r._assigned),
  mx_Last_Called_Date_DT: utc(r._last_called), mx_Follow_up_date_and_time: utc(r._follow_up_dt), mx_Next_follow_up_date: "" }));
const SETTINGS = { LSQ_ACCESS_KEY: "************", LSQ_SECRET_KEY: "************", OZONETEL_API_KEY: "************", OZONETEL_USERNAME: "************",
  MCUBE_API_KEY: "************", MCUBE_AUTHORIZATION: "************", MCUBE_GETAGENTS_TOKEN: "************", ACEFONE_TOKEN: "************", ACEFONE_SKILL_LIST_ID: "9",
  LSQ_HOST: "api-in21.leadsquared.com", DEFAULT_FETCH_DAYS: "30", DEFAULT_FETCH_BASIS: "modified", DOWNLOAD_DATE_FORMAT: "%d/%m/%Y %H:%M:%S", OZONETEL_SLEEP_SECONDS: "0",
  OZONETEL_SKILLS: "sales,Arbitrage_Sales", OZONETEL_API_URL: "https://in1-ccaas-api.ozonetel.com/ca_reports/fetchCDRDetails", RULE_DAYS_FOLLOW_UP: "2", RULE_DAYS_COUNSELLED: "2",
  RULE_DAYS_CALL_BACK: "2", DNP_COUNTER: "phone", DNP_OPERATOR: "lt", DNP_VALUE: "4", MCUBE_RETRY_ATTEMPTS: "3", MCUBE_RETRY_TIME: "180", MCUBE_AGENT_SOURCE: "both" };
for (const k of [...Object.keys(REF.sheets), "CER_PUSH_URL", "INCOMING_PUSH_URL", "HP_PUSH_URL"]) SETTINGS[k] = `https://docs.google.com/${k}`;
const SCOPES = { LSQ_ACCESS_KEY: "user_token", LSQ_SECRET_KEY: "user_token", OZONETEL_API_KEY: "user_token", OZONETEL_USERNAME: "user_token", ROSTER_URL: "global",
  CER_PUSH_URL: "global", LSQ_HOST: "global", DEFAULT_FETCH_DAYS: "user" };
const STATUS = { lsq: true, roster: true, cer: true, incoming: true, ozonetel: true, mcube: true, mcube_agents: true, acefone: true, high: true, push_cer: true, push_incoming: true, push_high: true };
const pushes = [];
function op(name, args) {
  const up = (body, status = 200, type = "application/json") => ({ up: status, body: typeof body === "string" ? body : JSON.stringify(body), type });
  switch (name) {
    case "settings.get": case "settings.set": return { json: { ok: true, admin: true, email: "amitray@lawsikho.in", written: Object.keys((args && args.settings) || {}), settings: SETTINGS, status: STATUS, spec: [], scopes: SCOPES } };
    case "users.list": return { json: { ok: true, users: [{ email: "amitray@lawsikho.in", role: "admin" }, { email: "x@lawsikho.in", role: "viewer" }] } };
    case "sheet.read": return up(REF.sheets[args.key] || "", 200, "text/csv");
    case "sheet.push": pushes.push(args); return up("OK", 200, "text/plain");
    case "ozonetel.cdr": { const details = args.page_no === 1 ? REF.ozonetel_days[args.day] || [] : []; return up({ status: "success", details, totalCount: details.length }); }
    case "lsq.users": return up(USERS);
    case "lsq.metadata": return up([...Object.keys(LEADS[0]).map((k) => ({ SchemaName: k })), { SchemaName: "ModifiedOn" }]);
    case "lsq.leads_get": return up(args.payload.Paging.PageIndex === 1 ? LEADS : []);
    case "mcube.getagents": return up({ agentlist: CALLERS.slice(0, 4).map((c, i) => ({ agent_id: `a${i}`, agent_name: c, emp_phone: `80000${String(i).padStart(5, "0")}` })) });
    case "mcube.employees": return up({ employees: [] });
    case "mcube.campaigns": return up({ auto_dialer: [{ id: 11, name: "Nov Camp" }] });
    case "mcube.push": return up({ status: true, msg: "Leads added", success: args.listData.map((l) => l.number) });
    case "acefone.lists": return up({ data: [{ id: 5, name: "List A", field_map: ["Phone Number"] }] });
    case "acefone.skill_lists": return up({ data: [{ id: 9, name: "Main skills" }] });
    case "acefone.skills": return up({ data: CALLERS.slice(0, 3).map((c, i) => ({ id: 100 + i, name: c })), hasMore: false });
    case "acefone.bulk_create": return up({ success: true });
    default: return { json: { ok: false, error: `fake: no op ${name}` }, status: 400 };
  }
}
const FAKE_SB = `window.supabase = { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }), signOut: async () => ({}) } }) };`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
const errors = [];
await ctx.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("supabase-js")) return route.fulfill({ body: FAKE_SB, contentType: "text/javascript" });
  if (url.hostname === "cdn.jsdelivr.net") {
    const local = { jszip: "jszip/dist/jszip.min.js", xlsx: "xlsx/dist/xlsx.full.min.js", exceljs: "exceljs/dist/exceljs.min.js" };
    const key = Object.keys(local).find((k) => url.pathname.includes(`/${k}@`));
    const f = key && path.resolve("node_modules", local[key]);
    if (f && fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: "text/javascript" });
    return route.abort();
  }
  if (url.host !== "erc.test") return route.abort();
  if (url.pathname === "/x/op") {
    const { op: name, args } = JSON.parse(route.request().postData());
    const r = op(name, args || {});
    if (r.up) return route.fulfill({ status: 200, headers: { "x-up-status": String(r.up), "x-up-label": name, "content-type": r.type }, body: r.body });
    return route.fulfill({ status: r.status || 200, contentType: "application/json", body: JSON.stringify(r.json) });
  }
  let p = url.pathname === "/" ? "/index.html" : url.pathname.replace(/\/$/, "/index");
  if (!path.extname(p)) p += ".html";
  const file = path.join(WEB, p);
  if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "nf" });
  return route.fulfill({ body: fs.readFileSync(file), contentType: p.endsWith(".css") ? "text/css" : p.endsWith(".js") ? "text/javascript" : "text/html" });
});
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());     // "Push this report…?" confirmations
page.on("pageerror", (e) => errors.push(`${page.url()} pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`${page.url()} console: ${m.text()}`); });
const shot = (n, full = false) => page.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: full });
const step = async (name, fn) => { try { await fn(); console.log("ok  ", name); } catch (e) { errors.push(`${name}: ${e.message.split("\n")[0]}`); console.log("FAIL", name, e.message.split("\n")[0]); await shot(`fail_${name}`); } };
const logHas = (re, id = "jobLog", timeout = 60000) => page.waitForFunction(([r, i]) => new RegExp(r).test(document.getElementById(i).textContent), [re.source, id], { timeout });
const download = async (click, name) => { const dl = page.waitForEvent("download"); await click(); const d = await dl; await d.saveAs(path.join(OUT, name)); return path.join(OUT, name); };

await step("fetch", async () => {
  await page.goto(`${HOST}/`); await page.waitForSelector("#fetchBtn");
  await page.waitForTimeout(800);
  await page.click("#fetchBtn");
  await logHas(/Ozonetel: [\d,]+ sales incoming call/);
  await page.waitForFunction(() => !document.getElementById("buildBtn").disabled, null, { timeout: 30000 });
});
await step("build all", async () => {
  await page.click("#buildBtn");
  await logHas(/Done in \dm/);
  await page.waitForSelector("#reportCards .btn, #reportsCard button[onclick^='preview']", { timeout: 15000 });
  await shot("reports", true);
});
await step("preview + downloads", async () => {
  await page.click("button[onclick=\"preview('incoming')\"]");
  await page.waitForSelector("#previewCard:not(.hidden) table tbody tr", { timeout: 15000 });
  const csv = fs.readFileSync(await download(() => page.click("a[href$='/incoming/csv']"), "incoming.csv"), "utf8");
  if (!csv.includes("Zip Intent Justification")) throw new Error("incoming.csv has no Zip columns");
  await download(() => page.click("a[href$='/high_priority/xlsx']"), "high_priority.xlsx");
});
await step("push to sheet", async () => {
  await page.click("button[onclick=\"push('chat_email_referral')\"]");
  await logHas(/Pushed \d+ row\(s\) in 1 request/);
  if (!pushes.length || pushes[0].key !== "CER_PUSH_URL" || pushes[0].rows[0].at(-1) !== "Zip Intent Justification") throw new Error("push payload wrong");
});
await step("lsq update csv", async () => {
  const csv = fs.readFileSync(await download(() => page.click("#dlUpdate, a[href$='/lsq-update']"), "lsq_update.csv"), "utf8");
  if (csv.split("\n").length < 3) throw new Error("update CSV is empty");
});
await step("dialer files", async () => {
  for (const id of ["#catBreached", "#catDnp", "#catFresh"]) if (await page.$(id)) await page.check(id).catch(() => {});
  await page.waitForTimeout(500);
  await page.click("#makeFilesBtn");
  await page.waitForFunction(() => !/hidden/.test((document.getElementById("dlMcube") || {}).className || "hidden") || (document.getElementById("dlMcube") || {}).href, null, { timeout: 20000 });
  await download(() => page.click("#dlMcube"), "mcube.csv");
  await shot("dialers", true);
});
await step("mcube + acefone push", async () => {
  await page.selectOption("#mcubeCampaign, select[id*='ampaign']", "11").catch(() => {});
  await page.click("#pushMcubeBtn");
  await logHas(/Done — pushed \d+ lead\(s\) to MCube/, "dialerLog");
  await page.selectOption("#acefoneList, select[id*='List']", "5").catch(() => {});
  await page.click("#pushAcefoneBtn");
  await logHas(/Done — pushed \d+ lead\(s\) to Acefone/, "dialerLog");
});
for (const key of ["chat_email_referral", "incoming", "high_priority"]) {
  await step(`analysis ${key}`, async () => {
    await page.goto(`${HOST}/analysis/${key}`);
    await page.waitForFunction(() => document.querySelectorAll("svg path, svg rect").length > 3, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    await shot(`analysis_${key}`, true);
    if (key === "incoming") await download(() => page.click("button[onclick='downloadSelection()']"), "analysis_incoming.xlsx");
  });
}
await step("setup", async () => { await page.goto(`${HOST}/setup`); await page.waitForSelector("#ercUsers tr", { timeout: 10000 }); await shot("setup", true); });
await step("settings", async () => { await page.goto(`${HOST}/settings`); await page.waitForTimeout(1500); await shot("settings"); });
await browser.close();
console.log(`\n${errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors"}`);
process.exit(errors.length ? 1 : 0);
