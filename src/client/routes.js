/* Every route of the Reports Console's Flask app (app.py, Sales IQ dropped), answered in the browser.
   Handlers return plain objects ({ok:true,...}); a thrown error becomes {ok:false,error} with a status. */
import { cfg, loadSettings, forgetSettings, opJson, toCsv, downloadText, parseCsv, lib } from "./core.js";
import { SPEC, BREACH_DAY_KEYS, breachDays } from "../shared/spec.js";
import * as A from "./apis.js";
import * as J from "./jobs.js";
import * as B from "./breach.js";
import * as R from "./roster.js";
import * as sheets from "./sheets.js";
import * as runs from "./runs.js";
import * as oz from "./ozonetel.js";
import * as lsqFetch from "./lsq_fetch.js";
import * as pipeline from "./pipeline.js";
import * as registry from "./reports/registry.js";
import * as dialers from "./dialers.js";
import * as analysis from "./analysis.js";
import { fmt, nowIst, todayIst } from "./dates.js";

export class HttpError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const fail = (m, s = 400) => { throw new HttpError(m, s); };
const stamp = () => fmt(nowIst(), "%Y%m%d_%H%M");
const fmtN = (n) => Number(n).toLocaleString("en-US");
const routes = [];
const on = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern}$`), fn });

async function token(value = null) {
  const t = String(value || "").trim() || (await runs.latestToken());
  if (!t) fail("Nothing fetched yet — press Fetch on the Reports page first.", 404);
  return t;
}
function daysAndBasis(d) {
  let raw = d.days;
  if (raw === null || raw === undefined || String(raw).trim() === "") raw = cfg.int("DEFAULT_FETCH_DAYS", 30);
  if (!/^\s*-?\d+\s*$/.test(String(raw))) fail("Days must be a whole number.");
  const days = parseInt(raw, 10);
  if (days < 1 || days > 365) fail("Days must be between 1 and 365.");
  const basis = String(d.basis || cfg.get("DEFAULT_FETCH_BASIS") || lsqFetch.DEFAULT_BASIS).trim().toLowerCase();
  if (!(basis in lsqFetch.FETCH_BASES)) fail(`Unknown fetch basis: '${basis}'`);
  return [days, basis];
}
/** The build dialog's breached days and DNP rule: checked, saved as this person's settings, used by the build. */
async function saveRules(rules) {
  if (!rules) return;
  const values = {};
  for (const [stage, key] of Object.entries(BREACH_DAY_KEYS)) {
    const raw = (rules.breach_days || {})[stage];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;
    if (!/^\s*-?\d+\s*$/.test(String(raw))) fail(`Breached days for ${stage} must be a whole number.`);
    const n = parseInt(raw, 10);
    if (n < 0 || n > 365) fail(`Breached days for ${stage} must be between 0 and 365.`);
    values[key] = String(n);
  }
  if (rules.dnp) {
    let dnp;
    try { dnp = B.validateDnpRule(rules.dnp); } catch (e) { fail(e.message); }
    Object.assign(values, { DNP_COUNTER: dnp.counter, DNP_OPERATOR: dnp.op, DNP_VALUE: dnp.value });
  }
  if (!Object.keys(values).length) return;
  await opJson("settings.set", { settings: values });
  cfg.set(values);
}
const requireLsq = () => {
  if (!cfg.get("LSQ_ACCESS_KEY")) fail("LeadSquared access key is not set for you yet. Open \"Setup and links\" and paste your own key.");
  if (!cfg.get("LSQ_SECRET_KEY")) fail("LeadSquared secret key is not set for you yet. Open \"Setup and links\" and paste your own key.");
};
const busy = () => { if (J.anyRunning()) fail("Something is already running — wait for it, or stop it first."); };

/* ------------------------------------------------------------------ health / settings */
on("GET", "/api/health", async () => ({ credentials: cfg.status(), version: "online", auto_shutdown: false, open_tabs: 0, busy: J.anyRunning() }));
on("GET", "/api/settings", async () => {
  const s = await loadSettings(true);
  return { settings: s.settings, secrets: Object.keys(SPEC).filter((k) => SPEC[k].scope === "user_token").sort(), scopes: s.scopes, admin: s.admin, email: s.email };
});
on("POST", "/api/settings", async ({ json }) => {
  const res = await opJson("settings.set", { settings: json || {} });
  forgetSettings(); sheets.clearCache(); R.clearCache();
  await loadSettings(true);
  return { written: res.written, settings: res.settings };
});
on("POST", "/api/sources/refresh", async () => { sheets.clearCache(); R.clearCache(); return { message: "Every linked sheet will be re-read on the next build." }; });
on("GET", "/api/roster", async ({ url }) => {
  try { const rows = await R.load(url.searchParams.get("refresh") === "1"); return { rows, count: rows.length }; }
  catch (e) { fail(`Could not read the roster sheet: ${e.message}`, 502); }
});

const SHEET_LINKS = { ROSTER_URL: "the roster sheet", CER_COMBINED_URL: "the Chat / Email / Referral sheet", REV_SHEET_URL: "the enrollment tracker",
  STAGE_LOG_URL: "the stage-change log", INCOMING_MASTER_URL: "the Incoming master sheet", HP_CURRENT_MONTH_URL: "the current month's High Priority sheet",
  HP_PREVIOUS_MONTH_URL: "the previous month's High Priority sheet", HP_REV_URL_1: "the High Priority enrollment tracker (tab 1)",
  HP_REV_URL_2: "the High Priority enrollment tracker (tab 2)" };
on("GET", "/api/test/([a-z_]+)", async ({ url, m }) => {
  const what = m[1];
  try {
    if (what === "lsq") return { message: `LeadSquared returned ${(await A.lsqUsers()).length} user(s).` };
    if (what === "ozonetel") {
      const rows = await oz.fetchDay(fmt(todayIst(), "%Y-%m-%d"));
      return { message: `Ozonetel returned ${fmtN(rows.length)} call(s) for today, ${fmtN(oz.toFrame(rows).length)} of them sales incoming (${oz.skills().join(", ")}).` };
    }
    if (what === "mcube_agents") {
      const agents = await dialers.loadAgents();
      return { message: `MCube returned ${agents.length} agent(s), ${agents.filter((a) => String(a.emp_phone || "").trim()).length} with a dial number.` };
    }
    if (what === "mcube") return { message: `MCube returned ${(await A.mcubeCampaigns()).length} campaign(s).${cfg.get("MCUBE_API_KEY") ? "" : " The API key for pushing is not saved yet."}` };
    if (what === "acefone") {
      let message = `Acefone returned ${(await A.acefoneLists()).length} lead list(s).`;
      if (cfg.get("ACEFONE_SKILL_LIST_ID")) message += ` The skill list has ${(await A.acefoneSkills(cfg.get("ACEFONE_SKILL_LIST_ID"))).length} skill(s).`;
      else message += " No skill list id yet, so pushed leads would arrive unrouted.";
      return { message };
    }
    if (what === "sheet") {
      const key = String(url.searchParams.get("key") || "");
      if (!(key in SHEET_LINKS)) fail("Unknown sheet.", 404);
      if (!cfg.get(key)) fail("Nothing saved for this link yet.");
      const t = await sheets.readCsv(key, SHEET_LINKS[key], { force: true });
      return { message: `Read ${fmtN(t.rows.length)} row(s). Columns: ${t.columns.slice(0, 8).join(", ")}${t.columns.length > 8 ? "…" : ""}` };
    }
  } catch (e) { if (e instanceof HttpError) throw e; fail(`Saved, but it did not work — ${e.message || e}`, 502); }
  fail("Unknown test.", 404);
});

/* ------------------------------------------------------------------ jobs */
on("GET", "/api/jobs", async () => ({ jobs: J.recent(12), running: J.anyRunning() }));
on("GET", "/api/jobs/([^/]+)", async ({ m }) => { const j = J.get(decodeURIComponent(m[1])); if (!j) fail("Unknown job.", 404); return { job: j.snapshot() }; });
on("POST", "/api/jobs/([^/]+)/stop", async ({ m }) => ({ stopped: J.stop(decodeURIComponent(m[1])) }));

/* ------------------------------------------------------------------ fetch */
on("POST", "/api/fetch", async ({ json }) => {
  const [days, basis] = daysAndBasis(json || {});
  busy(); requireLsq();
  const job = J.start("fetch", `Fetch last ${days} days (${lsqFetch.FETCH_BASES[basis].label}) + Ozonetel`, pipeline.fetch, days, basis);
  return { job_id: job.id };
});
on("GET", "/api/rules", async () => ({ breach_days: breachDays(cfg.all()), dnp: B.dnpRule(), dnp_caption: B.dnpCaption(), stages: B.BREACH_STAGES }));
on("GET", "/api/fetch/latest", async () => {
  const t = await runs.latestToken();
  if (!t) return { meta: null, reports: {} };
  return { meta: await runs.loadMeta(t), reports: await runs.builtReports(t, registry.ORDER) };
});
on("GET", "/api/fetch/result/([^/]+)", async ({ m }) => {
  const job = J.get(decodeURIComponent(m[1]));
  if (!job) fail("That fetch has expired.", 404);
  if (job.result === null) fail(job.errors[0] || "The fetch did not finish.", 409);
  return { meta: job.result };
});

/* ------------------------------------------------------------------ reports */
on("GET", "/api/reports", async () => {
  const t = await runs.latestToken();
  return { reports: registry.catalogue(), token: t, meta: t ? await runs.loadMeta(t) : null, built: t ? await runs.builtReports(t, registry.ORDER) : {} };
});
on("POST", "/api/reports/([a-z_]+)/build", async ({ m, json }) => {
  let module;
  try { module = registry.get(m[1]); } catch (e) { fail(e.message, 404); }
  const d = json || {};
  const t = await token(d.token);
  await saveRules(d.rules);
  busy();
  const job = J.start(`build:${module.KEY}`, `Build ${module.TITLE}`, registry.run, module.KEY, t, null, !!d.refresh);
  return { job_id: job.id, token: t };
});
on("POST", "/api/build-all", async ({ json }) => {
  const d = json || {};
  const t = await token(d.token);
  await saveRules(d.rules);
  busy();
  const keys = (d.reports || []).filter((k) => k in registry.BY_KEY);
  const before = {};
  for (const k of registry.ORDER) { const s = await runs.reportSummary(t, k); if (s) before[k] = parseInt(s.pending || 0, 10); }
  const job = J.start("build", "Build the reports", pipeline.buildAll, t, keys.length ? keys : null, before);
  return { job_id: job.id, token: t };
});
on("POST", "/api/refresh", async ({ json }) => {
  const d = json || {};
  const [days, basis] = daysAndBasis(d);
  await saveRules(d.rules);
  busy(); requireLsq();
  const keys = (d.reports || []).filter((k) => k in registry.BY_KEY);
  const job = J.start("refresh", `Fetch and rebuild (${days} days)`, pipeline.rebuild, days, basis, keys.length ? keys : null);
  return { job_id: job.id };
});
on("GET", "/api/reports/([a-z_]+)/summary", async ({ m, url }) => {
  let module;
  try { module = registry.get(m[1]); } catch (e) { fail(e.message, 404); }
  const t = await token(url.searchParams.get("token"));
  return { token: t, summary: await runs.reportSummary(t, module.KEY) };
});
on("GET", "/api/reports/([a-z_]+)/preview", async ({ m, url }) => {
  const t = await token(url.searchParams.get("token"));
  let out;
  try { out = await registry.outputFrame(t, m[1]); } catch (e) { fail(e.message, 404); }
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 500));
  return { token: t, columns: out.columns, rows: out.rows.length,
           preview: out.rows.slice(0, limit).map((r) => Object.fromEntries(out.columns.map((c) => [c, String(r[c] ?? "")]))) };
});
on("POST", "/api/reports/([a-z_]+)/push", async ({ m, json }) => {
  let module, out;
  try { module = registry.get(m[1]); } catch (e) { fail(e.message, 404); }
  const t = await token((json || {}).token);
  try { out = await registry.outputFrame(t, module.KEY); } catch (e) { fail(e.message, 404); }
  if (!cfg.get(module.PUSH_SETTING)) fail(`No Apps Script link is set for ${module.TITLE}. Open Settings and paste it.`);
  if (J.active().some((j) => j.kind === `push:${module.KEY}`)) fail(`${module.TITLE} is already being pushed.`);
  const job = J.start(`push:${module.KEY}`, `Push ${module.TITLE}`, async (job) => {
    job.log(`Pushing ${module.TITLE} — ${fmtN(out.rows.length)} row(s), ${out.columns.length} column(s), ending with Zip Intent and Zip Intent Justification.`);
    const result = await sheets.push(module.PUSH_SETTING, out.columns, out.rows, { label: `the ${module.TITLE} sheet`, log: (x) => job.log(x), stop: () => job.checkStop() });
    job.log(`Pushed ${fmtN(result.rows)} row(s) in ${result.requests} request(s). Refresh the Power BI dataset to see it there.`);
    job.result = result;
  });
  return { job_id: job.id };
});

/* ------------------------------------------------------------------ LSQ update (the leads that did not map) */
on("GET", "/api/update/pending", async ({ url }) => {
  const t = await token(url.searchParams.get("token"));
  const per = {};
  for (const key of registry.ORDER) {
    const rows = await registry.pendingFrame(t, key), module = registry.get(key);
    per[key] = { title: module.TITLE, report_type: module.REPORT_TYPE, built: (await runs.reportSummary(t, key)) !== null, rows: rows.length,
      keyed_on: key === "high_priority" ? "Prospect ID" : "Phone Number",
      sample: rows.slice(0, 15).map((r) => Object.fromEntries(registry.PENDING_COLUMNS.map((c) => [c, String(r[c] ?? "")]))) };
  }
  const combined = await registry.combinedPending(t);
  return { token: t, reports: per, total: combined.length, preview: combined.slice(0, 50).map((r) => Object.fromEntries(registry.PENDING_COLUMNS.map((c) => [c, String(r[c] ?? "")]))) };
});

/* ------------------------------------------------------------------ dialers */
const statusReady = () => { const st = cfg.status(); return { mcube: st.mcube, mcube_agents: st.mcube_agents, acefone: st.acefone, acefone_skills: !!cfg.get("ACEFONE_SKILL_LIST_ID") }; };
on("GET", "/api/dialers/counts", async ({ url }) => {
  const t = await token(url.searchParams.get("token"));
  const last = await runs.reportSummary(t, "dialer");
  return { token: t, last, ...(await dialers.counts(t)), ready: statusReady() };
});
on("POST", "/api/dialers/files", async ({ json }) => {
  const d = json || {};
  const t = await token(d.token);
  try { return { token: t, summary: await dialers.makeFiles(t, d.categories || [], d.reports && d.reports.length ? d.reports : null, d.owners && d.owners.length ? d.owners : null) }; }
  catch (e) { fail(/^(Tick|No lead|None of)/.test(e.message) ? e.message : `Could not make the dialer files: ${e.message}`, /^(Tick|No lead|None of)/.test(e.message) ? 400 : 500); }
});
on("POST", "/api/dialers/owners", async ({ json }) => {
  const d = json || {};
  const t = await token(d.token);
  if (d.refresh) R.clearCache();
  try { return await dialers.ownerSummary(t, d.categories || [], d.reports && d.reports.length ? d.reports : null); }
  catch (e) { fail(`Could not read the roster: ${e.message}`, 502); }
});
on("POST", "/api/dialers/upload/(mcube|acefone)", async ({ m, form }) => {
  const f = form && form.get("file");
  if (!f || typeof f === "string" || !f.name) fail("Choose a CSV file.");
  const t = await token(form.get("token"));
  let table;
  try { table = parseCsv(await f.text()); } catch (e) { fail(`Could not read that file: ${e.message}`); }
  try { return await dialers.saveUpload(t, m[1], table, f.name); } catch (e) { fail(e.message); }
});
on("GET", "/api/dialers/acefone/skill-lists", async () => {
  try { return { skill_lists: (await A.acefoneSkillLists()).map((x) => ({ id: x.id, name: x.name })), selected: cfg.get("ACEFONE_SKILL_LIST_ID") }; }
  catch (e) { fail(`Could not load Acefone skill lists: ${e.message}`, 502); }
});
on("POST", "/api/dialers/acefone/skill-list", async ({ json }) => {
  const id = String((json || {}).id || "").trim();
  await opJson("settings.set", { settings: { ACEFONE_SKILL_LIST_ID: id } });
  cfg.set({ ACEFONE_SKILL_LIST_ID: id });
  return { selected: cfg.get("ACEFONE_SKILL_LIST_ID") };
});
on("POST", "/api/dialers/acefone/skill-mapping", async ({ json }) => {
  const d = json || {};
  const t = await token(d.token);
  try { return await dialers.skillMapping(t, d.skill_list_id || null, d.overrides, d.source || "made"); }
  catch (e) { if (/first/.test(e.message)) fail("Make the dialer files first, or upload an Acefone file."); fail(`Could not map callers to skills: ${e.message}`, 502); }
});
on("GET", "/api/dialers/mcube/campaigns", async () => {
  try { return { campaigns: (await A.mcubeCampaigns()).map((c) => ({ id: c.id, name: c.name })) }; } catch (e) { fail(`Could not load MCube campaigns: ${e.message}`, 502); }
});
on("GET", "/api/dialers/acefone/lists", async () => {
  try { return { lists: (await A.acefoneLists()).map((i) => ({ id: i.id, name: i.name })) }; } catch (e) { fail(`Could not load Acefone lead lists: ${e.message}`, 502); }
});
on("POST", "/api/dialers/push", async ({ json }) => {
  const d = json || {};
  const target = String(d.target || "").trim().toLowerCase(), targetId = String(d.id || "").trim();
  const name = String(d.name || targetId).trim(), source = d.source === "upload" ? "upload" : "made";
  if (!["mcube", "acefone"].includes(target)) fail("Push to MCube or Acefone.");
  if (!targetId) fail(target === "mcube" ? "Choose a campaign." : "Choose a lead list.");
  const number = (key, low, high, label) => {
    const raw = String(d[key] ?? "").trim();
    if (!raw) return null;
    if (!/^\d+$/.test(raw) || +raw < low || +raw > high) fail(`${label} must be a whole number from ${low} to ${high}.`);
    return parseInt(raw, 10);
  };
  const t = await token(d.token);
  try { await dialers.loadFile(t, source === "upload" ? `${target}_upload` : target); }
  catch { fail(source === "upload" ? "Upload a file first." : "Make the dialer files first."); }
  const args = target === "mcube"
    ? [t, targetId, name, number("retry_attempts", 1, 20, "Retry attempts"), number("retry_time", 1, 1440, "Retry time"), number("priority", 2, 40, "Priority"), source]
    : [t, targetId, name, number("priority", 1, 29, "Priority"), d.skill_map || null, d.skill_list_id || null, source];
  busy();
  const job = J.start(`dialer:${target}`, `Push to ${target === "mcube" ? "MCube" : "Acefone"} — ${name}`, target === "mcube" ? dialers.pushMcube : dialers.pushAcefone, ...args);
  return { job_id: job.id };
});

/* ------------------------------------------------------------------ analysis */
async function viewOf(key, tokenValue) {
  const t = await token(tokenValue);
  let module, view;
  try { module = registry.get(key); view = await runs.loadReport(t, module.KEY); } catch (e) { fail(e.message, 404); }
  return [t, module, view];
}
const optionsRoute = async ({ m, json, url }) => {
  const d = json || {};
  const [t, , view] = await viewOf(m[1], d.token || url.searchParams.get("token"));
  return { token: t, ...analysis.options(view, m[1], d.filters) };
};
on("GET", "/api/analysis/([a-z_]+)/options", optionsRoute);
on("POST", "/api/analysis/([a-z_]+)/options", optionsRoute);
on("POST", "/api/analysis/([a-z_]+)/leads", async ({ m, json }) => {
  const d = json || {};
  const [, , view] = await viewOf(m[1], d.token);
  try { return analysis.leads(view, m[1], d.filters, String(d.panel || "breached"), d.search || ""); }
  catch (e) { fail(`Could not list those leads: ${e.message}`, 500); }
});
on("POST", "/api/analysis/([a-z_]+)", async ({ m, json }) => {
  const d = json || {};
  const [t, , view] = await viewOf(m[1], d.token);
  try { const s = (await runs.reportSummary(t, m[1])) || {}; return { token: t, built_at: s.built_at ?? null, fetch_days: s.fetch_days ?? null, ...analysis.compute(view, m[1], d.filters) }; }
  catch (e) { fail(`Could not build the dashboard: ${e.message}`, 500); }
});

/* ------------------------------------------------------------------ downloads (built in the browser) */
const csvText = (columns, rows) => "﻿" + toCsv(columns, rows);      // utf-8-sig, as pandas to_csv(encoding="utf-8-sig")
async function xlsxBlob(sheetsSpec) {
  const ExcelJS = await lib("ExcelJS");
  const wb = new ExcelJS.Workbook();
  for (const s of sheetsSpec) {
    const ws = wb.addWorksheet(s.name);
    ws.addRow(s.columns);
    for (const r of s.rows) ws.addRow(s.columns.map((c) => (r[c] === null || r[c] === undefined ? "" : r[c])));
    ws.getRow(1).font = { bold: true };
    if (s.autoWidth) s.columns.forEach((c, k) => {
      const width = Math.max(String(c).length, ...s.rows.slice(0, 199).map((r) => String(r[c] ?? "").length));
      ws.getColumn(k + 1).width = Math.min(48, Math.max(10, width + 2));
    });
    if (s.freeze) ws.views = [{ state: "frozen", xSplit: s.freeze === "B2" ? 1 : 0, ySplit: 1 }];
  }
  return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const DIALER_NAMES = { mcube: "MCUBE_Upload", acefone: "Acefone_Upload", skipped: "MCUBE_Skipped_No_Agent", leads: "Dialer_Leads" };
export async function download(path) {
  const u = new URL(path, location.href);
  let m = u.pathname.match(/^\/download\/analysis\/([a-z_]+)$/);
  if (m) {
    const [, module, view] = await viewOf(m[1], u.searchParams.get("token"));
    let filters = {};
    try { filters = JSON.parse(u.searchParams.get("filters") || "{}"); } catch { /* none */ }
    const out = analysis.exportSheets(view, m[1], [...module.COLUMNS, "Zip Intent", "Zip Intent Justification"], filters);
    return downloadText(`${module.FILENAME}_Analysis_${stamp()}.xlsx`, await xlsxBlob(out.sheets.map((s) => ({ ...s, autoWidth: true }))));
  }
  m = u.pathname.match(/^\/download\/([^/]+)\/(.+)$/);
  if (!m) throw new Error("Unknown download.");
  const t = await token(decodeURIComponent(m[1])), rest = m[2];
  if (rest === "snapshot") {
    const frame = await runs.loadFrame(t);
    const cols = frame.length ? Object.keys(frame[0]).filter((c) => !c.startsWith("_")) : [];
    return downloadText(`LSQ_Snapshot_${stamp()}.csv`, csvText(cols, frame));
  }
  if (rest === "lsq-update") return downloadText(`LSQ_Report_Type_Update_${stamp()}.csv`, csvText(registry.PENDING_COLUMNS, await registry.combinedPending(t)));
  let mm = rest.match(/^dialer\/(mcube|acefone|skipped|leads)$/);
  if (mm) {
    let file;
    try { file = await dialers.loadFile(t, mm[1]); } catch { throw new Error("Make the dialer files first."); }
    return downloadText(`${DIALER_NAMES[mm[1]]}_${stamp()}.csv`, csvText(file.columns, file.rows));
  }
  mm = rest.match(/^([a-z_]+)\/(xlsx|csv|pending)$/);
  if (mm) {
    const module = registry.get(mm[1]);
    if (mm[2] === "pending") return downloadText(`${module.FILENAME}_Pending_${stamp()}.csv`, csvText(registry.PENDING_COLUMNS, await registry.pendingFrame(t, module.KEY)));
    const out = await registry.outputFrame(t, module.KEY);
    if (mm[2] === "csv") return downloadText(`${module.FILENAME}_${stamp()}.csv`, csvText(out.columns, out.rows));
    return downloadText(`${module.FILENAME}_${stamp()}.xlsx`, await xlsxBlob([{ name: "Sheet1", columns: out.columns, rows: out.rows }]));
  }
  throw new Error("Unknown download.");
}

/* ------------------------------------------------------------------ dispatcher used by the fetch shim */
export async function handle(method, url, body) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = url.pathname.match(r.re);
    if (!m) continue;
    let json = null, form = null;
    if (body instanceof FormData) form = body;
    else if (typeof body === "string" && body) { try { json = JSON.parse(body); } catch { json = null; } }
    try {
      const out = await r.fn({ url, m, json, form });
      return { status: 200, body: { ok: true, ...(out || {}) } };
    } catch (e) {
      return { status: e instanceof HttpError ? e.status : (e.workerStatus || 500), body: { ok: false, error: String(e.message || e) } };
    }
  }
  return { status: 404, body: { ok: false, error: `Unknown route: ${method} ${url.pathname}` } };
}
