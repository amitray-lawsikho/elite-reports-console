/* Port of services/dialers.py — MCube and Acefone files (and pushes) for the leads the reports flag: Breached,
   Less-dialled DNP and/or Fresh, across any built report, one list with each lead once (first category wins), dialled by
   the lead's current owner. Files are kept in this browser under the fetch token. */
import { cfg, chunked, ApiError } from "./core.js";
import * as A from "./apis.js";
import * as B from "./breach.js";
import * as R from "./roster.js";
import * as runs from "./runs.js";
import * as registry from "./reports/registry.js";
import { fmt } from "./dates.js";
import { text, dropDuplicates, index as indexBy } from "./frame.js";

export const CATEGORIES = { breached: "Breached", dnp: "Less-dialled DNP", fresh: "Fresh" };
export const ORDER = ["breached", "dnp", "fresh"];
export const MCUBE_COLUMNS = ["Number", "Name", "Source", "Agent Number", "Ref Id", "Priority"];
export const ACEFONE_COLUMNS = ["Phone Number", "Name", "Email Id", "Address", "Company Name", "Alternate Phone Number", "Time Group Id",
  "Priority(1 to 30)", "Skill Name", "External Reference ID"];
export const LEADS_COLUMNS = ["Phone Number", "Name", "Owner", "MCube Agent Number", "Category", "Report", "Contact Stage", "Follow Up Status",
  "Last Called", "Next Follow Up", "Why", "Phone Call Counter", "Assigned On Call Counter", "Email", "Prospect ID"];
export const FILE_COLUMNS = { mcube: MCUBE_COLUMNS, acefone: ACEFONE_COLUMNS, skipped: MCUBE_COLUMNS, leads: LEADS_COLUMNS };
const norm = (n) => R.normaliseName(n);
const masks = (view) => ({ breached: B.breachedMask(view), dnp: B.dnpMask(view), fresh: B.freshMask(view) });
const strRow = (r, cols) => Object.fromEntries(cols.map((c) => [c, r[c] === null || r[c] === undefined ? "" : String(r[c])]));
async function rosterIndex() { try { return R.makeIndex(await R.load()); } catch { return new Map(); } }

/** Per report: how many leads with a ten-digit phone each category holds. */
export async function counts(token) {
  const out = { reports: {}, rules: null };
  for (const key of registry.ORDER) {
    const summary = await runs.reportSummary(token, key);
    if (!summary) continue;
    const view = await runs.loadReport(token, key);
    const m = masks(view);
    const hasPhone = view.map((r) => String(r._phone ?? "").length === 10);
    out.reports[key] = { title: summary.title, ...Object.fromEntries(ORDER.map((c) => [c, m[c].filter((x, i) => x && hasPhone[i]).length])) };
    out.rules = summary.rules || null;
  }
  return out;
}

export async function select(token, categories, reports = null, owners = null) {
  categories = ORDER.filter((c) => (categories || []).includes(c));
  if (!categories.length) throw new Error("Tick at least one of Breached, Less-dialled DNP or Fresh.");
  const keys = registry.ORDER.filter((k) => !reports || !reports.length || reports.includes(k));
  let leads = [];
  for (const key of keys) {
    if (!(await runs.reportSummary(token, key))) continue;
    const view = await runs.loadReport(token, key);
    const m = masks(view);
    view.forEach((r, i) => {
      const cat = categories.find((c) => m[c][i]);                     // first in ORDER wins
      if (!cat) return;
      leads.push({ phone: String(r._phone ?? ""), category: CATEGORIES[cat], rank: ORDER.indexOf(cat), report: registry.get(key).TITLE,
        report_owner: String(r._owner ?? ""), stage: String(r._stage ?? ""), follow_up: String(r._follow_up ?? ""), reason: String(r._reason ?? ""),
        last_called: r._last_called !== null && r._last_called !== undefined ? fmt(r._last_called, "%d/%m/%Y %H:%M") : "",
        next_follow_up: r._follow_up_dt !== null && r._follow_up_dt !== undefined ? fmt(r._follow_up_dt, "%d/%m/%Y %H:%M") : "",
        phone_calls: r._dial_count ?? 0, assigned_calls: r._assigned_count ?? 0, prospect_id: "Prospect ID" in r ? String(r["Prospect ID"] ?? "") : "" });
    });
  }
  if (!leads.length) throw new Error("No lead matches those boxes in the reports that are built.");
  const noPhone = leads.filter((l) => l.phone.length !== 10).length;
  leads = leads.filter((l) => l.phone.length === 10);
  const before = leads.length;
  leads = dropDuplicates(leads.map((l, i) => [l, i]).sort((a, b) => a[0].rank - b[0].rank || a[1] - b[1]).map(([l]) => l), (l) => l.phone);
  const duplicates = before - leads.length;
  const snap = indexBy(dropDuplicates((await runs.loadFrame(token)).filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
  const ri = await rosterIndex();
  for (const l of leads) {
    const s = snap.get(l.phone);
    l.name = s ? s["Lead Name"] ?? "" : "";
    l.email = s ? s.Email ?? "" : "";
    const pid = s ? s["Prospect ID"] ?? "" : "";
    if (pid !== "") l.prospect_id = pid;
    const owner = s ? s.Owner ?? "" : "";
    const fallback = ["#NA", "#N/A", "(No owner)"].includes(l.report_owner) ? "" : l.report_owner;
    l.owner = owner !== "" ? owner : fallback;
    l.owner_email = s ? s["Owner Email"] ?? "" : "";
    l.caller = (ri.get(norm(l.owner)) || {}).caller ?? l.owner;     // the roster's own spelling, so Acefone skills match
  }
  const beforeOwner = leads.length;
  if (owners && owners.length) {
    const wanted = new Set(owners.map(norm));
    leads = leads.filter((l) => wanted.has(norm(l.caller)));
    if (!leads.length) throw new Error("None of the picked callers has a lead in that selection.");
  }
  const tally = (f) => { const o = {}; for (const l of leads) o[f(l)] = (o[f(l)] || 0) + 1; return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); };
  const stats = { leads: leads.length, duplicates_removed: duplicates, no_phone: noPhone, by_category: tally((l) => l.category),
    by_report: tally((l) => l.report), no_owner: leads.filter((l) => l.owner === "").length, owners_picked: (owners || []).length,
    left_out_by_owner: beforeOwner - leads.length };
  for (const l of leads) delete l.rank;
  return [leads, stats];
}

/** Every caller who owns a lead in the selection, plus roster callers with none — drives the caller picker. */
export async function ownerSummary(token, categories, reports = null) {
  let tally = {};
  try { const [leads] = await select(token, categories && categories.length ? categories : ORDER, reports); for (const l of leads) tally[l.caller] = (tally[l.caller] || 0) + 1; }
  catch { tally = {}; }
  const ri = await rosterIndex();
  const rows = [], seen = new Set();
  for (const e of ri.values()) { seen.add(norm(e.caller)); rows.push({ caller: e.caller, team: e.team, vertical: e.vertical, leads: tally[e.caller] || 0, on_roster: true }); }
  for (const [caller, n] of Object.entries(tally)) if (!seen.has(norm(caller))) rows.push({ caller: caller || "(no owner)", team: "Not on roster", vertical: "", leads: n, on_roster: false });
  const low = (x) => x.toLowerCase();
  rows.sort((a, b) => (a.team === "Not on roster") - (b.team === "Not on roster") || (low(a.team) < low(b.team) ? -1 : low(a.team) > low(b.team) ? 1 : 0) ||
    b.leads - a.leads || (low(a.caller) < low(b.caller) ? -1 : low(a.caller) > low(b.caller) ? 1 : 0));
  const teams = [...new Set(rows.map((r) => r.team))].sort((a, b) => (a === "Not on roster") - (b === "Not on roster") || (low(a) < low(b) ? -1 : low(a) > low(b) ? 1 : 0));
  return { callers: rows, teams, roster_loaded: ri.size > 0 };
}

/* ------------------------------------------------------------------ MCube agent numbers */
export async function loadAgents(log = null) {
  let agents = [];
  const errors = [];
  const source = String(cfg.get("MCUBE_AGENT_SOURCE") || "both").toLowerCase();
  if (["both", "getagents"].includes(source) && cfg.get("MCUBE_GETAGENTS_TOKEN")) {
    try { agents = await A.mcubeAgents(); } catch (e) { errors.push(`getagents: ${e.message || e}`); }
  }
  if (["both", "employees"].includes(source) && cfg.get("MCUBE_EMPLOYEES_AUTHORIZATION")) {
    try {
      const seen = new Set(agents.map((a) => norm(a.agent_name)));
      for (const row of await A.mcubeEmployees()) if (!seen.has(norm(row.agent_name))) { agents.push(row); seen.add(norm(row.agent_name)); }
    } catch (e) { errors.push(`get-employees: ${e.message || e}`); }
  }
  if (log && errors.length) log("MCube agent directory: " + errors.join("; "));
  if (!agents.length && errors.length) throw new Error("Could not read MCube's agent directory — " + errors.join("; "));
  return agents;
}
export async function agentNumbers(owners, ownerEmails, agents) {
  const byName = new Map(), byEmail = new Map();
  for (const a of agents) {
    const ph = String(a.emp_phone ?? "").trim();
    if (!ph) continue;
    const k = norm(a.agent_name);
    if (!byName.has(k)) byName.set(k, ph);
    const em = String(a.email ?? "").trim().toLowerCase();
    if (em && !byEmail.has(em)) byEmail.set(em, ph);
  }
  const ri = await rosterIndex();
  return owners.map((owner, i) => {
    const key = norm(owner);
    let number = byName.get(key) || "";
    if (!number) for (const e of [(ri.get(key) || {}).email || "", ownerEmails[i]]) { const em = String(e || "").trim().toLowerCase(); if (em && byEmail.has(em)) { number = byEmail.get(em); break; } }
    return number;
  });
}

/* ------------------------------------------------------------------ files */
const fileKey = (token) => `dialer_files`;
export async function makeFiles(token, categories, reports = null, owners = null, log = () => {}) {
  const [leads, stats] = await select(token, categories, reports, owners);
  const callers = leads.map((l) => l.caller);
  const mcubePriority = cfg.int("MCUBE_PRIORITY", 1);
  const acefonePriority = Math.min(30, Math.max(1, cfg.int("ACEFONE_PRIORITY", 30)));
  let agents = [], agentError = "";
  if (cfg.get("MCUBE_GETAGENTS_TOKEN") || cfg.get("MCUBE_EMPLOYEES_AUTHORIZATION")) {
    try { agents = await loadAgents(log); } catch (e) { agentError = String(e.message || e); }
  } else agentError = "No MCube agents token in Settings, so no Agent Number can be filled.";
  const numbers = agents.length ? await agentNumbers(callers, leads.map((l) => l.owner_email), agents) : leads.map(() => "");
  const mcube = leads.map((l, i) => ({ Number: l.phone, Name: l.name, Source: callers[i], "Agent Number": numbers[i], "Ref Id": l.prospect_id, Priority: mcubePriority }));
  const has = (r) => String(r["Agent Number"]).trim() !== "";
  const mcubeOk = mcube.filter(has), skipped = mcube.filter((r) => !has(r));
  const acefone = leads.map((l, i) => ({ "Phone Number": l.phone, Name: l.name, "Email Id": l.email, Address: "", "Company Name": callers[i],
    "Alternate Phone Number": "", "Time Group Id": "", "Priority(1 to 30)": acefonePriority, "Skill Name": callers[i], "External Reference ID": l.prospect_id }));
  const detail = leads.map((l, i) => ({ "Phone Number": l.phone, Name: l.name, Owner: callers[i], "MCube Agent Number": numbers[i], Category: l.category,
    Report: l.report, "Contact Stage": l.stage, "Follow Up Status": l.follow_up, "Last Called": l.last_called, "Next Follow Up": l.next_follow_up,
    Why: l.reason, "Phone Call Counter": l.phone_calls, "Assigned On Call Counter": l.assigned_calls, Email: l.email, "Prospect ID": l.prospect_id }));
  const files = { mcube: mcubeOk.map((r) => strRow(r, MCUBE_COLUMNS)), acefone: acefone.map((r) => strRow(r, ACEFONE_COLUMNS)),
    skipped: skipped.map((r) => strRow(r, MCUBE_COLUMNS)), leads: detail.map((r) => strRow(r, LEADS_COLUMNS)) };
  const prev = (await runs.reportSummary(token, fileKey(token))) || {};
  await runs.saveReport(token, fileKey(token), { ...files, uploads: (await loadFiles(token)).uploads || {} }, { saved: Date.now(), uploads: prev.uploads });
  const per = new Map();
  callers.forEach((c, i) => { const o = c === "" ? "(no owner)" : c; const e = per.get(o) || { owner: o, leads: 0, agent: numbers[i] }; e.leads++; per.set(o, e); });
  const perOwner = [...per.values()].sort((a, b) => b.leads - a.leads).map((e) => ({ owner: e.owner, leads: e.leads, agent: e.agent || "" }));
  const summary = { ...stats, categories: ORDER.filter((c) => categories.includes(c)), reports: reports || [],
    owners: stats.owners_picked ? `${stats.owners_picked} caller(s)` : "all callers", mcube_rows: mcubeOk.length, mcube_skipped: skipped.length,
    mcube_no_agent: [...new Set(skipped.map((r) => r.Source).filter((o) => String(o).trim()))].sort(), acefone_rows: acefone.length,
    agent_error: agentError, mcube_priority: mcubePriority, acefone_priority: acefonePriority, per_owner: perOwner };
  await runs.saveReport(token, "dialer", files.leads, summary);
  return summary;
}
export async function loadFiles(token) { try { return await runs.loadReport(token, fileKey(token)); } catch { return { uploads: {} }; } }
/** dialers.load_file(): { columns, rows } with every value as text. */
export async function loadFile(token, which) {
  const files = await loadFiles(token);
  if (which.endsWith("_upload")) {
    const up = (files.uploads || {})[which.replace("_upload", "")];
    if (!up) throw new Error("No uploaded file for this push — choose one first.");
    return up;
  }
  if (!files[which]) throw new Error("Make the dialer files first.");
  return { columns: FILE_COLUMNS[which], rows: files[which] };
}
/** A hand-picked CSV that replaces the made file for one push. table: { columns, rows } (all text). */
export async function saveUpload(token, target, table, name = "") {
  const needed = target === "mcube" ? ["Number", "Agent Number"] : ["Phone Number"];
  const missing = needed.filter((c) => !table.columns.includes(c));
  if (missing.length) throw new Error(`That file is missing ${missing.join(", ")} — it should look like the ${target === "mcube" ? "MCube" : "Acefone"} file made here.`);
  const files = await loadFiles(token);
  files.uploads = { ...(files.uploads || {}), [target]: { ...table, name } };
  await runs.saveReport(token, fileKey(token), files, { saved: Date.now() });
  return { rows: table.rows.length, name };
}
const sourceFrame = (token, target, source) => loadFile(token, source === "upload" ? `${target}_upload` : target);

/* ------------------------------------------------------------------ push */
export async function pushMcube(job, token, campaignId, campaignName, retryAttempts = null, retryTime = null, priority = null, source = "made") {
  const frame = await sourceFrame(token, "mcube", source);
  job.log(`Pushing to MCube campaign '${campaignName}' (id ${campaignId}) — ${source === "upload" ? "the uploaded file" : "the dialer file made here"}.`);
  const prepared = [];
  let skipped = 0;
  const override = priority !== null && priority !== undefined && priority !== "";
  for (const row of frame.rows) {
    const lead = A.mcubeBuildLead({ number: row.Number, name: row.Name ?? "", source: row.Source ?? "", agent_number: row["Agent Number"] ?? "",
      priority: override ? priority : row.Priority ?? 1, ref_id: row["Ref Id"] ?? "", retry_attempt: retryAttempts, retry_time: retryTime });
    if (lead && lead.eid) prepared.push(lead); else skipped++;
  }
  if (skipped) job.log(`${skipped} row(s) skipped — no phone number or no MCube agent number.`);
  if (!prepared.length) throw new Error("Nothing to push: no lead has an MCube Agent Number.");
  const pr = override ? `overridden to ${prepared[0].priority}` : `[${[...new Set(prepared.map((l) => l.priority))].sort((a, b) => a - b).join(", ")}]`;
  job.log(`${prepared.length.toLocaleString("en-US")} lead(s), priority ${pr}, retry ${prepared[0].retry_attempt} attempt(s) ${prepared[0].retry_time} minute(s) apart.`);
  const batches = [...chunked(prepared, cfg.int("MCUBE_PUSH_BATCH_SIZE", 200))];
  job.setTotal(prepared.length);
  for (let i = 0; i < batches.length; i++) {
    if (job.checkStop()) break;
    const batch = batches[i];
    try {
      const r = A.mcubeSummarise(await A.mcubeUpload(campaignId, batch));
      if (r.ok !== false) { job.advance({ succeeded: batch.length }); job.log(`Batch ${i + 1}/${batches.length}: ${batch.length} lead(s) — ${r.message || "accepted"}`); }
      else { job.advance({ failed: batch.length, errors: [r.message || "rejected"] }); job.log(`Batch ${i + 1}/${batches.length} rejected: ${r.message}`); }
    } catch (e) { job.advance({ failed: batch.length, errors: [String(e.message || e)] }); job.log(`Batch ${i + 1}/${batches.length} failed: ${e.message || e}`); }
  }
  close(job, `MCube '${campaignName}'`);
}

export async function skillIndex(skillListId = null) {
  const listId = skillListId || cfg.get("ACEFONE_SKILL_LIST_ID");
  if (!listId) throw new Error("Acefone skill list (pick one on the Acefone panel) is not configured.");
  const out = new Map();
  for (const s of await A.acefoneSkills(listId)) { const k = norm(s.name); if (!out.has(k)) out.set(k, { id: s.id, name: s.name }); }
  return out;
}
export async function skillMapping(token, skillListId = null, overrides = null, source = "made") {
  const frame = await sourceFrame(token, "acefone", source);
  const callers = [...new Set(frame.rows.map((r) => String(r["Skill Name"] ?? "").trim()).filter(Boolean))].sort();
  const index = await skillIndex(skillListId);
  const byId = new Map([...index.values()].map((e) => [e.id, e.name]));
  const ov = Object.fromEntries(Object.entries(overrides || {}).map(([k, v]) => [String(k), String(v).trim()]).filter(([, v]) => v));
  const tally = {};
  for (const r of frame.rows) { const c = r["Skill Name"]; tally[c] = (tally[c] || 0) + 1; }
  const rows = callers.map((caller) => {
    const auto = index.get(norm(caller));
    if (caller in ov) return { caller, skill_id: ov[caller], skill_name: byId.get(ov[caller]) || "(set by hand)", source: "override", leads: tally[caller] || 0 };
    if (auto) return { caller, skill_id: auto.id, skill_name: auto.name, source: "auto", leads: tally[caller] || 0 };
    return { caller, skill_id: "", skill_name: "", source: "none", leads: tally[caller] || 0 };
  });
  return { mapping: rows, skills: [...index.values()].sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0)),
           unmatched: rows.filter((r) => !r.skill_id).map((r) => r.caller) };
}
export async function pushAcefone(job, token, listId, listName, priority = null, skillMap = null, skillListId = null, source = "made") {
  const frame = await sourceFrame(token, "acefone", source);
  job.log(`Pushing to Acefone list '${listName}' (id ${listId}) — ${source === "upload" ? "the uploaded file" : "the dialer file made here"}.`);
  const skills = {};
  try { for (const r of (await skillMapping(token, skillListId, skillMap, source)).mapping) if (r.skill_id) skills[r.caller] = r.skill_id; }
  catch (e) { job.log(`WARNING: could not read Acefone skills (${e.message || e}) — leads will arrive unrouted.`); }
  const override = priority !== null && priority !== undefined && priority !== "";
  const prepared = [], unrouted = new Set();
  for (const row of frame.rows) {
    const caller = String(row["Skill Name"] || row["Company Name"] || "").trim();
    const skill = skills[caller] || "";
    if (!skill) unrouted.add(caller || "(no owner)");
    const lead = A.acefoneBuildLead({ phone: row["Phone Number"], name: row.Name ?? "", email: row["Email Id"] ?? "", company: row["Company Name"] ?? "",
      ref_id: row["External Reference ID"] ?? "", priority: override ? priority : row["Priority(1 to 30)"], skill_id: skill || null });
    if (lead) prepared.push(lead);
  }
  if (!prepared.length) throw new Error("Nothing to push: no lead has a phone number.");
  if (unrouted.size) job.log(`No Acefone skill for: ${[...unrouted].sort().join(", ")} — their leads arrive unrouted.`);
  if (override) job.log(`Priority overridden to ${priority} for every lead.`);
  const batches = [...chunked(prepared, cfg.int("ACEFONE_PUSH_BATCH_SIZE", 500))];
  job.setTotal(prepared.length);
  for (let i = 0; i < batches.length; i++) {
    if (job.checkStop()) break;
    try { await A.acefoneBulkCreate(listId, batches[i]); job.advance({ succeeded: batches[i].length }); job.log(`Batch ${i + 1}/${batches.length}: ${batches[i].length} lead(s) imported.`); }
    catch (e) { job.advance({ failed: batches[i].length, errors: [String(e.message || e)] }); job.log(`Batch ${i + 1}/${batches.length} failed: ${e.message || e}`); }
  }
  close(job, `Acefone '${listName}'`);
}
function close(job, where) {
  job.result = { pushed: job.succeeded, failed: job.failed };
  if (job.stopped) return;
  if (job.failed) { job.status = job.succeeded ? "partial" : "failed"; job.log(`Finished with ${job.succeeded.toLocaleString("en-US")} pushed and ${job.failed.toLocaleString("en-US")} failed.`); }
  else job.log(`Done — pushed ${job.succeeded.toLocaleString("en-US")} lead(s) to ${where}.`);
}
export { ApiError, text };
