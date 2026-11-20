/* Port of services/reports/chat_email_referral.py — the hand-kept enquiry sheet, enriched from the LeadSquared snapshot
   (by phone) and the enrollment tracker. A lead not in the snapshot is "Unavailable" and lands on the pending list. */
import * as sheets from "../sheets.js";
import * as B from "../breach.js";
import * as roster from "../roster.js";
import * as base from "./base.js";
import { text, phone, email, toDatetime, dropDuplicates, index, requireColumns, fmtDate } from "../frame.js";
import { cfg } from "../core.js";

export const KEY = "chat_email_referral";
export const TITLE = "Chat, Email & Referral";
export const SUBTITLE = "Hand-kept enquiry sheet, enriched from LeadSquared and the enrollment tracker.";
export const REPORT_TYPE = "Chat/Email/Referral";
export const NEEDS_UPLOAD = null;
export const COLUMNS = ["Date", "Course_Enquired", "Name", "Email", "Lead_Phone_Number", "Owner", "Contact_Stage", "Type", "Last Called date",
  "Next Follow Up Date", "Follow Up status", "Phone Call Counter", "Phone Call Counter Formula", "Enrollment Tracker", "Manage Contact Tracker",
  "Assigned On Call Counter", "Assigned On Call Counter Formula"];
export const PUSH_SETTING = "CER_PUSH_URL";
export const FILENAME = "Chat_Email_Referral";
const fmtN = (n) => Number(n).toLocaleString("en-US");

export async function build(job, lsq, { force = false } = {}) {
  const log = (m) => job.log(m);
  log("Reading the Chat / Email / Referral enquiry sheet…");
  if (!cfg.get("CER_COMBINED_URL")) throw new Error('Chat/Email/Referral sheet is not configured. Open the "Settings" page and paste it.');
  const sheet = await sheets.readCsv("CER_COMBINED_URL", "the Chat / Email / Referral sheet", { force });
  requireColumns(sheet, ["Lead_Phone_Number"], "The Chat / Email / Referral sheet");
  const rows = sheet.rows.map((r) => ({ ...r }));
  log(`${fmtN(rows.length)} enquiry row(s).`);

  // the snapshot, one row per phone; the last one wins
  const snap = index(dropDuplicates(lsq.filter((r) => r.Phone !== ""), (r) => r.Phone, "last"), (r) => r.Phone);
  log(`${fmtN(snap.size)} LeadSquared lead(s) with a usable phone number to match against.`);
  const stageEmails = await base.stageEmails({ force });
  let fromLsq = 0;
  for (const r of rows) {
    r.Phone = phone(r.Lead_Phone_Number);
    const s = snap.get(r.Phone);
    r.Email = text(r.Email) || text(s ? s.Email : "") || text(stageEmails.get(r.Phone));
    r._last_called = s ? s._last_called : null;
    r._follow_up_dt = s ? s._follow_up_dt : null;
    r["Phone Call Counter"] = s ? s["Phone call counter"] : 0;
    r["Assigned On Call Counter"] = s ? s["Assigned On Call Counter"] : "";
    r["Zip Intent"] = text(s ? s["Zip Intent"] : "");
    r["Zip Intent Justification"] = text(s ? s["Zip Intent Justification"] : "");
    const lsqStage = text(s ? s["Contact Stage"] : "");
    if (lsqStage !== "") fromLsq++;
    r.Contact_Stage = lsqStage || text(r.Contact_Stage);
    r.Owner = text(r.Owner);
  }
  log(`Contact stage from LeadSquared on ${fmtN(fromLsq)} row(s); from the sheet on the rest.`);

  log("Matching the enrollment tracker…");
  const enrol = await base.Enrollments.load("REV_SHEET_URL", "the enrollment tracker", { log, force });
  const [enrolledOn, opsCaller] = enrol.lookup(rows.map((r) => r.Phone), rows.map((r) => r.Email));
  let hits = 0;
  rows.forEach((r, i) => {
    r["Enrollment Tracker"] = fmtDate(enrolledOn[i], "%d/%m/%Y") || base.NA;
    if (enrolledOn[i] !== null) { hits++; r.Contact_Stage = B.ENROLLED_STAGE; if (opsCaller[i] !== "") r.Owner = opsCaller[i]; }
  });
  log(`${fmtN(hits)} lead(s) matched an enrollment.`);

  const knownEmails = new Set([...snap.values()].map((s) => email(s.Email)).filter(Boolean));
  for (const r of rows) r["Manage Contact Tracker"] = snap.has(r.Phone) || knownEmails.has(r.Email.toLowerCase()) ? "Available" : "Unavailable";

  base.applyBreach(rows, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone Call Counter", "Follow Up status", "Phone Call Counter Formula");
  const dates = toDatetime(rows.map((r) => ("Date" in r ? r.Date : "")), { dayfirst: true });
  rows.forEach((r, i) => {
    r["Assigned On Call Counter Formula"] = B.dialLabel(r["Assigned On Call Counter"]);
    r["Last Called date"] = fmtDate(r._last_called) || base.NA;
    r["Next Follow Up Date"] = fmtDate(r._follow_up_dt) || base.NA;
    r.Lead_Phone_Number = r.Phone !== "" ? r.Phone : text(r.Lead_Phone_Number);
    if (!("Date" in r)) r.Date = "";
    r._date = dates[i];
  });
  roster.attach(rows, "Owner", await roster.load(force));
  base.buildView(rows, { owner: "Owner", stage: "Contact_Stage", followUp: "Follow Up status", dialLabel: "Phone Call Counter Formula",
    dialCount: "Phone Call Counter", monthFrom: "_date", typeColumn: "Type", campaign: "Course_Enquired", dateColumn: "_date", phoneCol: "Phone" });
  const out = base.finish(rows, COLUMNS);
  const summary = base.summarise(out, rows);
  summary.unavailable = rows.filter((r) => r["Manage Contact Tracker"] === "Unavailable").length;
  log(`Built ${fmtN(out.rows.length)} row(s); ${fmtN(summary.unavailable)} not yet in LeadSquared.`);
  return [out, rows, summary];
}

/** Leads the report could not map: Unavailable and never called -> they need a Report_Type in LeadSquared. */
export function pending(out, view) {
  const rows = view.filter((r) => r["Manage Contact Tracker"] === "Unavailable" && r._last_called === null && r.Phone !== "");
  return dropDuplicates(rows.map((r) => ({ "Phone Number": r.Phone, "Prospect ID": "", Email: r.Email, Report_Type: REPORT_TYPE })), (r) => r["Phone Number"]);
}
