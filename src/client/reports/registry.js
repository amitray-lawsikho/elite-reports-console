/* Port of services/reports/registry.py — the three reports as one list, and the job that builds any of them. */
import { cfg } from "../core.js";
import * as B from "../breach.js";
import * as sheets from "../sheets.js";
import * as runs from "../runs.js";
import { taggedOnly } from "../lsq_fetch.js";
import { breachDays } from "../../shared/spec.js";
import { dropDuplicates } from "../frame.js";
import * as cer from "./chat_email_referral.js";
import * as incoming from "./incoming.js";
import * as high from "./high_priority.js";

export const MODULES = [cer, incoming, high];
export const BY_KEY = Object.fromEntries(MODULES.map((m) => [m.KEY, m]));
export const ORDER = MODULES.map((m) => m.KEY);
const fmtN = (n) => Number(n).toLocaleString("en-US");

export function get(key) {
  const m = BY_KEY[String(key || "").trim().toLowerCase()];
  if (!m) throw new Error(`Unknown report: ${JSON.stringify(key)}`);
  return m;
}
export const describe = (m) => ({ key: m.KEY, title: m.TITLE, subtitle: m.SUBTITLE, report_type: m.REPORT_TYPE, needs_upload: m.NEEDS_UPLOAD,
  columns: [...m.COLUMNS, "Zip Intent", "Zip Intent Justification"], push_configured: !!cfg.get(m.PUSH_SETTING), filename: m.FILENAME });
export const catalogue = () => ORDER.map((k) => describe(BY_KEY[k]));
export const currentRules = () => ({ breach_days: breachDays(cfg.all()), dnp: B.dnpRule(), dnp_caption: B.dnpCaption() });

/** Build one report from a fetch and park it (view + summary + pending list) under the same token. */
export async function run(job, key, token, uploadPath = null, refreshSources = false) {
  const module = get(key);
  job.put(`__STEP__ Building ${module.TITLE}…`);
  const started = Date.now();
  if (refreshSources) { job.log("Re-reading every linked sheet rather than using the cached copies."); sheets.clearCache(); }
  const frame = await runs.loadFrame(token);
  const meta = (await runs.loadMeta(token)) || {};
  job.log(`Using the fetch of ${meta.days ?? "?"} day(s) on ${meta.basis_label ?? "?"} — ${fmtN(frame.length)} lead(s).`);
  const tagged = taggedOnly(frame);
  job.log(`${fmtN(tagged.length)} of those carry a Report_Type and are what this report matches against.`);
  if (!tagged.length) throw new Error("No lead in this fetch has a Report_Type set, so nothing can be matched. Check that mx_Report_Type is populated in LeadSquared, then fetch again.");
  const rules = currentRules();
  job.log(`Breached days: ${Object.entries(rules.breach_days).map(([s, n]) => `${s} ${n}d`).join(", ")}. Less-dialled DNP: ${rules.dnp_caption}.`);
  const [out, view, summary] = await module.build(job, tagged, { force: refreshSources, token });
  const waiting = module.pending(out, view);
  Object.assign(summary, { key: module.KEY, title: module.TITLE, report_type: module.REPORT_TYPE, rows: out.rows.length, columns: out.columns,
    pending: waiting.length, built_at: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 100) / 10, token,
    fetch_days: meta.days ?? null, fetch_basis: meta.basis_label ?? null, zip_fields_missing: meta.zip_fields_missing || [], rules });
  await runs.saveReport(token, module.KEY, view, summary);
  await runs.saveReport(token, `${module.KEY}__pending`, waiting, { rows: waiting.length, report: module.KEY });
  if (summary.pending) job.log(`${fmtN(summary.pending)} lead(s) could not be matched. Download the LSQ update CSV, set Report_Type to '${module.REPORT_TYPE}' in LeadSquared, fetch again and rebuild.`);
  else job.log("Every lead matched — nothing to update in LeadSquared.");
  if (summary.zip_fields_missing.length) job.log("NOTE: " + summary.zip_fields_missing.join(", ") + " are not on this LeadSquared account, so the two Zip Intent columns are blank.");
  job.log(`Done — ${fmtN(out.rows.length)} row(s) ready to download or push.`);
  job.result = summary;
  return summary;
}

const cell = (v) => (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? "" : v);
/** Just the report's own columns, in order, for download and push. */
export async function outputFrame(token, key) {
  const module = get(key);
  const view = await runs.loadReport(token, module.KEY);
  const has = (c) => view.length ? c in view[0] : true;
  const columns = [...module.COLUMNS.filter(has), ...["Zip Intent", "Zip Intent Justification"].filter(has)];
  return { columns, rows: view.map((r) => Object.fromEntries(columns.map((c) => [c, cell(r[c])]))) };
}
export const PENDING_COLUMNS = ["Phone Number", "Prospect ID", "Email", "Report_Type"];
export async function pendingFrame(token, key) {
  try { return await runs.loadReport(token, `${get(key).KEY}__pending`); } catch { return []; }
}
/** Every report's unmatched leads in one CSV for the LeadSquared import. */
export async function combinedPending(token) {
  const parts = [];
  for (const key of ORDER) parts.push(...(await pendingFrame(token, key)));
  const rows = parts.map((r) => Object.fromEntries(PENDING_COLUMNS.map((c) => [c, cell(r[c])])));
  return dropDuplicates(rows, (r) => `${r["Phone Number"]}\u0000${r["Prospect ID"]}\u0000${r.Report_Type}`);
}
