/* Port of services/lsq_fetch.py — the LeadSquared snapshot every report is built from: Leads.Get paged over the last N
   days, owners from Users.Get, phones cleaned, dates read into IST timestamps. Only rows with a Report_Type feed the
   reports (tagged_only); the snapshot is kept in this browser under a token (runs.js). */
import { cfg, sleep } from "./core.js";
import { lsqUsers, lsqAvailableFields, lsqLeadsPage } from "./apis.js";
import { standardise } from "./dates.js";
import * as runs from "./runs.js";
import { text, phone } from "./frame.js";

const MAX_PAGES = 1000;
export const FIELDS = [
  ["First Name", "FirstName"], ["Last Name", "LastName"], ["Email", "EmailAddress"], ["Enquired Course", "mx_Enquired_Course"],
  ["Campaign Name", "mx_Campaign_Name"], ["Contact Stage", "ProspectStage"], ["Created On", "CreatedOn"], ["Funnel name", "mx_Funnel_name"],
  ["Last Called Date", "mx_Last_Call_new"], ["Owner", "OwnerId"], ["Phone call counter", "mx_Phone_call_counter"], ["Phone Number", "Phone"],
  ["Report_Type", "mx_Report_Type"], ["Assigned On Call Counter", "mx_Assigned_On_Call_Counter"],
  ["Zip Intent", "mx_Zip_Intent"], ["Zip Intent Justification", "mx_Zip_Intent_Justification"],
];
export const SYSTEM_FIELDS = ["ProspectID", "ModifiedOn", "mx_Assigned_On", "mx_Last_Called_Date_DT", "mx_Follow_up_date_and_time", "mx_Next_follow_up_date"];
export const FOLLOW_UP_FIELD = "mx_Follow_up_date_and_time";
export const NEXT_FOLLOW_UP_FIELD = "mx_Next_follow_up_date";
export const FETCH_FIELDS = [...SYSTEM_FIELDS, ...FIELDS.map(([, s]) => s)];
export const FETCH_BASES = {
  assigned: { label: "Assigned On", schema: "mx_Assigned_On" }, modified: { label: "Modified On", schema: "ModifiedOn" },
  created: { label: "Created On", schema: "CreatedOn" }, last_called: { label: "Last Called On", schema: "mx_Last_Called_Date_DT" },
};
export const BASIS_ORDER = ["assigned", "modified", "created", "last_called"];
export const DEFAULT_BASIS = "modified";
export const ZIP_FIELDS = ["mx_Zip_Intent", "mx_Zip_Intent_Justification"];

const pystr = (v) => (typeof v === "boolean" ? (v ? "True" : "False") : v);

/** Raw Leads.Get rows -> the snapshot (array of row objects). report: receives one entry per date field. */
export function buildFrame(rows, owners, { isoIsUtc = true, report = null, now = null } = {}) {
  const raw0 = (rows || []).map((r) => { const o = {}; for (const f of FETCH_FIELDS) o[f] = r[f] === undefined ? "" : pystr(r[f]); o.ProspectID = text(o.ProspectID); return o; });
  const lastIdx = new Map();
  raw0.forEach((r, i) => { if (r.ProspectID !== "") lastIdx.set(r.ProspectID, i); });
  const raw = [...raw0.filter((r, i) => r.ProspectID !== "" && lastIdx.get(r.ProspectID) === i), ...raw0.filter((r) => r.ProspectID === "")];
  const df = raw.map((r) => {
    const o = {};
    for (const [col, schema] of FIELDS) o[col] = text(r[schema]);
    const oid = o.Owner;
    o.Owner = (owners[oid] || {}).name || "";
    o["Owner Email"] = (owners[oid] || {}).email || "";
    o["Prospect ID"] = text(r.ProspectID);
    o.Phone = phone(o["Phone Number"]);
    o["Phone Number"] = o.Phone ? `91 ${o.Phone}` : "";
    o["Lead Name"] = o["Last Name"] !== "" ? `${o["First Name"]} ${o["Last Name"]}`.trim() : o["First Name"];
    return o;
  });
  const std = (values, opts, field, schema) => {
    const info = {};
    const out = standardise(values, { isoIsUtc, now, report: info, ...opts });
    if (report && field) report.push({ ...info, field, schema });
    return out;
  };
  const created = std(df.map((o) => o["Created On"]), { pastOnly: true }, "Created On", "CreatedOn");
  const textCall = std(df.map((o) => o["Last Called Date"]), { pastOnly: true, defaultDayfirst: false }, "Last Called Date", "mx_Last_Call_new");
  const fieldCall = std(raw.map((r) => text(r.mx_Last_Called_Date_DT)), { pastOnly: true }, "Last Called On", "mx_Last_Called_Date_DT");
  const follow = std(raw.map((r) => text(r[FOLLOW_UP_FIELD])), {}, "Follow up date and time", FOLLOW_UP_FIELD);
  const nextFollow = std(raw.map((r) => text(r[NEXT_FOLLOW_UP_FIELD])), {}, "Next follow up date", NEXT_FOLLOW_UP_FIELD);
  const assigned = std(raw.map((r) => text(r.mx_Assigned_On)), { pastOnly: true }, null, null);
  const modified = std(raw.map((r) => text(r.ModifiedOn)), { pastOnly: true }, null, null);
  df.forEach((o, i) => {
    o._created = created[i];
    o._last_called = fieldCall[i] !== null ? fieldCall[i] : textCall[i];
    o._last_called_source = fieldCall[i] !== null ? "mx_Last_Called_Date_DT" : textCall[i] !== null ? "mx_Last_Call_new" : "";
    const a = follow[i], b = nextFollow[i];
    o._follow_up_dt = a === null ? b : b === null ? a : Math.max(a, b);
    o._assigned = assigned[i];
    o._modified = modified[i];
  });
  return df;
}

const fmtN = (n) => Number(n).toLocaleString("en-US");
const utcText = (d) => d.toISOString().slice(0, 19).replace("T", " ");

/** The fetch job. keep=false hands the frame back in job.result.frame without saving it as the reports' snapshot. */
export async function run(job, days, basis = null, keep = true) {
  days = parseInt(days, 10);
  if (!(days >= 1 && days <= 365)) throw new Error("Days must be between 1 and 365.");
  basis = String(basis || DEFAULT_BASIS).trim().toLowerCase();
  if (!(basis in FETCH_BASES)) throw new Error("Choose what to fetch on the basis of: " + BASIS_ORDER.map((k) => FETCH_BASES[k].label).join(", "));
  const { label: basisLabel, schema: basisSchema } = FETCH_BASES[basis];
  const started = Date.now();
  const cutoffText = utcText(new Date(Date.now() - days * 86400000));
  job.log(`Fetching on the basis of ${basisLabel} (${basisSchema}): the last ${days} day(s), after ${cutoffText} UTC.`);
  if (basis !== "modified") job.log(`Leads with no ${basisLabel} date are not part of this fetch.`);
  job.log("Reading the LeadSquared user list…");
  const users = await lsqUsers();
  const owners = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));
  job.log(`${Object.keys(owners).length} LeadSquared users loaded.`);
  let wanted = [...FETCH_FIELDS], missing = [];
  const known = await lsqAvailableFields();
  if (known) {
    if (!known.has(basisSchema)) throw new Error(`${basisLabel} (${basisSchema}) is not a field on this LeadSquared account, so the fetch cannot be based on it. Pick another one.`);
    missing = wanted.filter((f) => !known.has(f) && f !== "ProspectID" && f !== "ModifiedOn");
    if (missing.length) job.log("Not on this LeadSquared account, left blank: " + missing.join(", "));
    for (const f of [FOLLOW_UP_FIELD, NEXT_FOLLOW_UP_FIELD]) if (missing.includes(f)) job.log(`WARNING: ${f} is not on this account, so the breach rule cannot use it.`);
    const zipMissing = ZIP_FIELDS.filter((f) => missing.includes(f));
    if (zipMissing.length) job.log("WARNING: " + zipMissing.join(" and ") + " do not exist on this account, so Zip Intent / Zip Intent Justification will be blank in every report. Check the field's schema name in LeadSquared.");
    wanted = wanted.filter((f) => !missing.includes(f));
  } else job.log("Could not read the field list — asking for every field as-is.");
  const pageSize = Math.max(1, Math.min(cfg.int("LSQ_PAGE_SIZE", 1000), 1000));
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (job.checkStop()) throw new Error("Fetch stopped — nothing was saved.");
    const batch = await lsqLeadsPage(cutoffText, wanted, page, pageSize, { log: (m) => job.log(m), lookupName: basisSchema });
    if (!batch.length) break;
    rows.push(...batch);
    job.processed = rows.length;
    job.log(`Page ${page}: ${fmtN(batch.length)} leads — ${fmtN(rows.length)} so far.`);
    job.put(`__COUNT__ ${rows.length} ${page}`);
    await sleep(250);
  }
  job.log(`LeadSquared returned ${fmtN(rows.length)} lead rows.`);
  const dateCheck = [];
  const frame = buildFrame(rows, owners, { isoIsUtc: cfg.bool("LSQ_DATES_ARE_UTC", true), report: dateCheck });
  for (const item of dateCheck) {
    if (!item.nonblank) continue;
    job.log(`${item.field}: ${fmtN(item.nonblank - item.unparsed)} of ${fmtN(item.nonblank)} read — ${item.order}`);
    if (item.unparsed) job.log(`WARNING: ${fmtN(item.unparsed)} ${item.field} value(s) could not be read as dates and are treated as blank.`);
  }
  const tagged = frame.filter((r) => r.Report_Type.trim() !== "").length;
  const zipIntent = frame.filter((r) => r["Zip Intent"].trim() !== "").length;
  job.log(`${fmtN(tagged)} of ${fmtN(frame.length)} lead(s) have a Report_Type set — those are the ones the reports are built from.`);
  job.log(`Zip Intent is filled on ${fmtN(zipIntent)} lead(s).`);
  const types = new Map();
  for (const r of frame) if (r.Report_Type.trim() !== "") types.set(r.Report_Type, (types.get(r.Report_Type) || 0) + 1);
  const stats = { rows: frame.length, tagged, untagged: frame.length - tagged, zip_intent: zipIntent,
    zip_justification: frame.filter((r) => r["Zip Intent Justification"].trim() !== "").length,
    no_owner: frame.filter((r) => r.Owner === "").length, no_last_call: frame.filter((r) => r._last_called === null).length,
    follow_up: frame.filter((r) => r._follow_up_dt !== null).length,
    report_types: Object.fromEntries([...types].sort((a, b) => b[1] - a[1]).slice(0, 20)) };
  const token = runs.newToken();
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const meta = { token, days, basis, basis_label: basisLabel, basis_schema: basisSchema, cutoff_utc: cutoffText,
    fetched_at: new Date().toISOString(), raw_rows: rows.length, missing_fields: missing,
    zip_fields_missing: ZIP_FIELDS.filter((f) => missing.includes(f)), stats, date_check: dateCheck, seconds };
  const mins = Math.floor(seconds / 60), secs = Math.floor(seconds % 60);
  if (!keep) { job.log(`Done — ${fmtN(frame.length)} unique leads in ${mins}m ${secs}s.`); job.result = { ...meta, frame }; return; }
  await runs.saveFetch(token, frame, meta);
  await runs.cleanup();
  job.log(`Done — ${fmtN(frame.length)} unique leads ready in ${mins}m ${secs}s.`);
  job.result = meta;
}
export const taggedOnly = (frame) => frame.filter((r) => text(r.Report_Type) !== "");
