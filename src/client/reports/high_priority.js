/* Port of services/reports/high_priority.py — this month's and last month's lead sheets, merged and de-duplicated on
   Prospect ID (newest Timestamp wins), resolved against LeadSquared BY PROSPECT ID. No owner -> "#N/A", pending list. */
import * as sheets from "../sheets.js";
import * as B from "../breach.js";
import * as roster from "../roster.js";
import * as base from "./base.js";
import { text, phone, toDatetime, dropDuplicates, index, sortDesc, firstColumn, fmtDate } from "../frame.js";
import { cfg } from "../core.js";

export const KEY = "high_priority";
export const TITLE = "High Priority Leads";
export const SUBTITLE = "This month's and last month's lead sheets, resolved against LeadSquared by Prospect ID.";
export const REPORT_TYPE = "High Priority";
export const NEEDS_UPLOAD = null;
export const COLUMNS = ["Course Name", "Name", "Email", "Country Code", "Phone no", "Lead Description", "Lead Source", "Date", "Caller Name",
  "Call_Status", "Last Called Date", "Next Follow Up Date", "Phone Call Counter", "Phone Call Counter Formula", "Caller Comments", "Enrolled",
  "Follow Up Status", "Verticals", "Team", "Assigned On Call Counter", "Assigned On Call Counter Formula", "Prospect ID"];
export const PUSH_SETTING = "HP_PUSH_URL";
export const FILENAME = "High_Priority_Report";
const fmtN = (n) => Number(n).toLocaleString("en-US");

async function loadLeadSheets(log, force) {
  const tables = [];
  for (const [key, label] of [["HP_CURRENT_MONTH_URL", "the current month's High Priority sheet"], ["HP_PREVIOUS_MONTH_URL", "the previous month's High Priority sheet"]]) {
    if (!cfg.get(key)) { log(`No link set for ${label} — skipping it.`); continue; }
    const t = await sheets.readCsv(key, label, { force });
    log(`${label}: ${fmtN(t.rows.length)} row(s).`);
    tables.push(t);
  }
  if (!tables.length) throw new Error("Neither High Priority lead sheet is set. Open Settings and paste at least the current month's link.");
  const columns = [];
  for (const t of tables) for (const c of t.columns) if (!columns.includes(c)) columns.push(c);
  const idCol = firstColumn(columns, "Prospect ID", "ProspectID", "Prospect Id");
  if (idCol === null) throw new Error(`The High Priority lead sheets have no Prospect ID column, which is what they are matched on. Found: ${columns.slice(0, 25).join(", ")}`);
  let merged = tables.flatMap((t) => t.rows).map((r) => { const o = { ...r }; o["Prospect ID"] = text(r[idCol]); if (idCol !== "Prospect ID") delete o[idCol]; return o; });
  const cols = columns.map((c) => (c === idCol ? "Prospect ID" : c));
  merged.forEach((r) => { r._stamp = null; });
  for (const name of ["Timestamp", "Created On", "Date"]) {
    const col = firstColumn(cols, name);
    if (col === null) continue;
    const parsed = toDatetime(merged.map((r) => r[col]), { dayfirst: true });   // pd.concat leaves missing cells blank (NaN)
    merged.forEach((r, i) => { if (r._stamp === null) r._stamp = parsed[i]; });
  }
  const withId = dropDuplicates(sortDesc(merged.filter((r) => r["Prospect ID"] !== ""), (r) => r._stamp), (r) => r["Prospect ID"]);
  const withoutId = merged.filter((r) => r["Prospect ID"] === "");
  if (withoutId.length) log(`${fmtN(withoutId.length)} row(s) have no Prospect ID — kept as they are, but they cannot be matched to LeadSquared.`);
  const out = [...withId, ...withoutId];
  log(`${fmtN(out.length)} lead(s) after merging and de-duplicating on Prospect ID.`);
  return [out, cols];
}

export async function build(job, lsq, { force = false } = {}) {
  const log = (m) => job.log(m);
  const [leads, cols] = await loadLeadSheets(log, force);
  // the two month sheets name columns differently: every candidate is read and the first non-blank value wins, row by row
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  const lower = new Map(cols.map((c) => [norm(c), c]));              // dict comprehension: the last spelling wins
  const pick = (r, ...names) => {
    let out = "";
    for (const n of names) { const c = lower.get(norm(n)); if (c === undefined) continue; if (out === "") out = text(r[c]); }
    return out;
  };
  const rows = leads.map((r) => {
    const rawPhone = pick(r, "Phone Number", "Phone", "Phone no", "Mobile Number", "Mobile", "Contact Number", "Contact No", "Mobile No", "WhatsApp Number");
    const cleaned = phone(rawPhone);
    return { "Course Name": pick(r, "Enquired Course", "Course Name", "Course"), Name: pick(r, "First Name", "Name", "Lead Name", "Full Name"),
      Email: pick(r, "Email Address", "Email", "Email Id", "EmailAddress"), "Country Code": "", "Phone no": cleaned !== "" ? cleaned : rawPhone,
      "Lead Description": pick(r, "Campaign Name", "Lead Description", "Campaign"), "Lead Source": pick(r, "Source", "Lead Source"),
      "Prospect ID": r["Prospect ID"], _stamp: r._stamp, Date: fmtDate(r._stamp, "%d/%m/%Y") };
  });
  log(`Phone number found on ${fmtN(rows.filter((r) => r["Phone no"] !== "").length)} of ${fmtN(rows.length)} lead(s) in the sheets.`);

  log("Mapping LeadSquared data by Prospect ID…");
  const snap = index(dropDuplicates(sortDesc(lsq.filter((r) => text(r["Prospect ID"]) !== ""), (r) => r._last_called), (r) => r["Prospect ID"]), (r) => r["Prospect ID"]);
  for (const r of rows) {
    const s = snap.get(r["Prospect ID"]);
    r["Caller Name"] = text(s ? s.Owner : "");
    r.Call_Status = text(s ? s["Contact Stage"] : "");
    r._last_called = s ? s._last_called : null;
    r._follow_up_dt = s ? s._follow_up_dt : null;
    r["Phone Call Counter"] = B.dialCount(s ? s["Phone call counter"] : null);
    r["Assigned On Call Counter"] = B.dialCount(s ? s["Assigned On Call Counter"] : null);
    r["Zip Intent"] = text(s ? s["Zip Intent"] : "");
    r["Zip Intent Justification"] = text(s ? s["Zip Intent Justification"] : "");
    if (r.Email === "") r.Email = text(s ? s.Email : "");
    const snapPhone = text(s ? s.Phone : "");
    if (!/^\d{10}$/.test(r["Phone no"]) && snapPhone !== "") r["Phone no"] = snapPhone;
  }
  const unmapped = rows.filter((r) => r["Caller Name"] === "").length;
  log(`${fmtN(rows.length - unmapped)} lead(s) matched a LeadSquared owner; ${fmtN(unmapped)} did not.`);

  log("Matching the High Priority enrollment tracker…");
  const enrol = await base.Enrollments.load(["HP_REV_URL_1", "HP_REV_URL_2"], "the High Priority enrollment tracker", { onlyNewEnrollment: true, log, force });
  const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r["Phone no"]), rows.map((r) => r.Email));
  let hits = 0;
  rows.forEach((r, i) => {
    r.Enrolled = fmtDate(enrolledOn[i], "%d/%m/%Y") || base.NA;
    if (enrolledOn[i] !== null) { hits++; r.Call_Status = B.ENROLLED_STAGE; if (opsCaller[i] !== "") r["Caller Name"] = opsCaller[i]; }
  });
  log(`${fmtN(hits)} lead(s) matched a new enrollment.`);

  base.applyBreach(rows, "Call_Status", "_last_called", "_follow_up_dt", "Phone Call Counter", "Follow Up Status", "Phone Call Counter Formula");
  for (const r of rows) {
    r["Assigned On Call Counter Formula"] = B.dialLabel(r["Assigned On Call Counter"]);
    r["Last Called Date"] = fmtDate(r._last_called) || base.NA;
    r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || base.NA;
  }
  roster.attach(rows, "Caller Name", await roster.load(force));
  const comments = await base.stageComments({ log, force });
  for (const r of rows) {
    r["Caller Comments"] = comments.size ? text(comments.get(r["Phone no"])) || base.NA : base.NA;
    r["Caller Name"] = r["Caller Name"] || base.NA;
    r.Call_Status = r.Call_Status || base.NA;
  }
  base.buildView(rows, { owner: "Caller Name", stage: "Call_Status", followUp: "Follow Up Status", dialLabel: "Phone Call Counter Formula",
    dialCount: "Phone Call Counter", monthFrom: "_stamp", campaign: "Lead Description", dateColumn: "_stamp", phoneCol: "Phone no" });
  const out = base.finish(rows, COLUMNS);
  const summary = base.summarise(out, rows);
  summary.unavailable = unmapped;
  log(`Built ${fmtN(out.rows.length)} row(s); ${fmtN(unmapped)} with no LeadSquared owner.`);
  return [out, rows, summary];
}

/** Leads with no LeadSquared owner, keyed on Prospect ID. */
export function pending(out, view) {
  const rows = view.filter((r) => r["Caller Name"] === base.NA && r["Prospect ID"] !== "");
  return dropDuplicates(rows.map((r) => ({ "Phone Number": r["Phone no"], "Prospect ID": r["Prospect ID"], Email: r.Email, Report_Type: REPORT_TYPE })), (r) => r["Prospect ID"]);
}
export { phone as _phone };
