/* Port of services/reports/incoming.py — sales incoming calls from Ozonetel merged with the master call history, one row
   per number (newest call wins), resolved against LeadSquared by phone. A number the snapshot never heard of reads #NA. */
import * as sheets from "../sheets.js";
import * as B from "../breach.js";
import * as roster from "../roster.js";
import * as oz from "../ozonetel.js";
import * as runs from "../runs.js";
import * as base from "./base.js";
import { text, phone, toDatetime, dropDuplicates, index, sortDesc, firstColumn, fmtDate } from "../frame.js";
import { cfg } from "../core.js";
import { nowIst, normalize, fmt, DAY } from "../dates.js";

export const KEY = "incoming";
export const TITLE = "Incoming Leads";
export const SUBTITLE = "Sales incoming calls from the Ozonetel API, merged with the master sheet and resolved against LeadSquared.";
export const REPORT_TYPE = "Incoming";
export const NEEDS_UPLOAD = null;
export const COLUMNS = ["Campaign", "Phone Number", "Call Date", "Call Flow", "Status", "Contact_Stage", "Owner", "Last Called Date",
  "Next Follow Up Date", "Follow Up Status", "Phone call counter", "Phone call counter formula", "Enrollment Tracker",
  "Owner According to Rev Sheet", "Verticals", "Team", "Comment LSQ", "Comment Analysis", "Assigned On Call Counter", "Assigned On Call Counter Formula"];
export const PUSH_SETTING = "INCOMING_PUSH_URL";
export const FILENAME = "Incoming_Report";
const NA = "#NA";
const fmtN = (n) => Number(n).toLocaleString("en-US");

/** The master call history in the report's own columns ("Call Date" as a timestamp). */
export async function readMaster({ force = false } = {}) {
  if (!cfg.get("INCOMING_MASTER_URL")) throw new Error('Incoming master sheet is not configured. Open the "Settings" page and paste it.');
  const t = await sheets.readCsv("INCOMING_MASTER_URL", "the Incoming master sheet", { force });
  const pc = firstColumn(t.columns, "Phone Number", "Caller No", "Phone"), dc = firstColumn(t.columns, "Call Date", "Date");
  if (pc === null || dc === null) throw new Error("The Incoming master sheet needs a phone column and a Call Date column.");
  const dates = toDatetime(t.rows.map((r) => r[dc]), { dayfirst: true });
  return t.rows.map((r, i) => ({ Campaign: r.Campaign ?? "", "Phone Number": phone(r[pc]), "Call Date": dates[i], "Call Flow": r["Call Flow"] ?? "",
    Status: r.Status ?? "", "Comment LSQ": r["Comment LSQ"] ?? "", "Comment Analysis": r["Comment Analysis"] ?? "" }));
}
/** The newest Call Date in the master (a date more than a day ahead is a typo, not the last report). */
export function lastReportDay(master) {
  const limit = nowIst() + DAY;
  const stamps = master.map((r) => r["Call Date"]).filter((t) => t !== null && t <= limit);
  return stamps.length ? normalize(Math.max(...stamps)) : null;
}
/** Fetch the calls the master does not have yet and park them under the fetch token. */
export async function prepareCalls(job, token, { force = false } = {}) {
  const master = await readMaster({ force });
  const last = lastReportDay(master);
  job.log(last !== null ? `Incoming master sheet: ${fmtN(master.length)} call(s), newest ${fmt(last, "%d %b %Y")}.`
                        : `Incoming master sheet: ${fmtN(master.length)} call(s), no readable Call Date.`);
  const [calls, info] = await oz.collect(job, last);
  info.master_last_day = last !== null ? fmt(last, "%Y-%m-%d") : null;
  if (token) await runs.saveReport(token, "ozonetel_calls", calls, info);
  return [calls, info];
}

export async function build(job, lsq, { force = false, token = null } = {}) {
  const log = (m) => job.log(m);
  let calls = null, info = null;
  if (token) {
    try { calls = await runs.loadReport(token, "ozonetel_calls"); info = (await runs.reportSummary(token, "ozonetel_calls")) || {};
          log(`Using the Ozonetel calls fetched with this snapshot: ${info.from} to ${info.to}.`); }
    catch { calls = null; }
  }
  if (calls === null) {
    log("No Ozonetel calls with this snapshot yet — fetching them now.");
    if (token) [calls, info] = await prepareCalls(job, token, { force });
    else { const master = await readMaster({ force }); [calls, info] = await oz.collect(job, lastReportDay(master)); }
  }
  const fresh = calls.map((c) => ({ Campaign: c.Campaign ?? "", "Phone Number": phone(c["Phone Number"]), "Call Date": c["Call Date"] ?? null,
    "Call Flow": c["Call Flow"] ?? "", Status: c.Status ?? "", "Comment LSQ": "", "Comment Analysis": "" }));
  log(`${fmtN(fresh.length)} sales incoming call(s) from Ozonetel.`);
  log("Reading the master call history…");
  const master = await readMaster({ force });
  log(`${fmtN(master.length)} historic call record(s).`);
  let rows = [...fresh, ...master].filter((r) => r["Phone Number"] !== "");
  rows = dropDuplicates(sortDesc(rows, (r) => r["Call Date"]), (r) => r["Phone Number"]);   // newest call per number
  log(`${fmtN(rows.length)} distinct number(s) after merging the two sources.`);

  const snap = index(dropDuplicates(lsq.filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
  for (const r of rows) {
    const s = snap.get(r["Phone Number"]);
    r.Contact_Stage = text(s ? s["Contact Stage"] : "") || NA;
    r.Owner = text(s ? s.Owner : "") || NA;
    r._last_called = s ? s._last_called : null;
    r._follow_up_dt = s ? s._follow_up_dt : null;
    r["Phone call counter"] = B.dialCount(s ? s["Phone call counter"] : null);
    r["Assigned On Call Counter"] = B.dialCount(s ? s["Assigned On Call Counter"] : null);
    r.Email = text(s ? s.Email : "");
    r["Zip Intent"] = text(s ? s["Zip Intent"] : "");
    r["Zip Intent Justification"] = text(s ? s["Zip Intent Justification"] : "");
  }
  const unmapped = rows.filter((r) => r.Contact_Stage === NA).length;
  log(`${fmtN(rows.length - unmapped)} number(s) matched a LeadSquared lead; ${fmtN(unmapped)} did not.`);

  log("Matching the enrollment tracker…");
  const enrol = await base.Enrollments.load("REV_SHEET_URL", "the enrollment tracker", { log, force });
  const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r["Phone Number"]), rows.map((r) => r.Email));
  let hits = 0;
  rows.forEach((r, i) => {
    r["Enrollment Tracker"] = fmtDate(enrolledOn[i], "%d/%m/%Y") || NA;
    r["Owner According to Rev Sheet"] = opsCaller[i] || NA;
    if (enrolledOn[i] !== null) { hits++; r.Contact_Stage = B.ENROLLED_STAGE; if (opsCaller[i] !== "") r.Owner = opsCaller[i]; }
  });
  log(`${fmtN(hits)} number(s) matched an enrollment.`);

  base.applyBreach(rows, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone call counter", "Follow Up Status", "Phone call counter formula");
  for (const r of rows) {
    r["Assigned On Call Counter Formula"] = B.dialLabel(r["Assigned On Call Counter"]);
    r["Last Called Date"] = fmtDate(r._last_called) || base.NA;
    r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || base.NA;
  }
  roster.attach(rows, "Owner", await roster.load(force));
  const comments = await base.stageComments({ log, force });
  for (const r of rows) {
    const own = text(r["Comment LSQ"]) || base.NA;
    r["Comment LSQ"] = comments.size ? text(comments.get(r["Phone Number"])) || own : own;
    r["Comment Analysis"] = text(r["Comment Analysis"]);
    r._call_date = r["Call Date"];
    r["Call Date"] = fmtDate(r._call_date, "%d/%m/%Y");
  }
  base.buildView(rows, { owner: "Owner", stage: "Contact_Stage", followUp: "Follow Up Status", dialLabel: "Phone call counter formula",
    dialCount: "Phone call counter", monthFrom: "_call_date", campaign: "Campaign", dateColumn: "_call_date", phoneCol: "Phone Number" });
  const out = base.finish(rows, COLUMNS);
  const summary = base.summarise(out, rows);
  summary.unavailable = unmapped;
  summary.ozonetel = Object.fromEntries(["from", "to", "calls", "numbers", "note"].map((k) => [k, (info || {})[k] ?? null]));
  log(`Built ${fmtN(out.rows.length)} row(s); ${fmtN(unmapped)} not yet in LeadSquared.`);
  return [out, rows, summary];
}

export function pending(out, view) {
  const rows = view.filter((r) => r.Contact_Stage === NA && r["Phone Number"] !== "");
  return dropDuplicates(rows.map((r) => ({ "Phone Number": r["Phone Number"], "Prospect ID": "", Email: r.Email ?? "", Report_Type: REPORT_TYPE })), (r) => r["Phone Number"]);
}
export { text as _text };
