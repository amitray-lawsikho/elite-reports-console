/* Port of services/reports/base.py — the parts all three reports share. A report is an array of row objects; columns
   beginning with "_" are internal (the dashboards read them) and finish() leaves them out of what is written or pushed. */
import { cfg } from "../core.js";
import * as sheets from "../sheets.js";
import * as B from "../breach.js";
import { OTHERS } from "../roster.js";
import { text, phone, email, toDatetime, monthLabel, fmtDate, firstColumn, sortDesc, dropDuplicates } from "../frame.js";

export const NA = "#N/A";
export const ZIP_COLUMNS = ["Zip Intent", "Zip Intent Justification"];

/** The enrollment tracker's "Caller name (for ops) for enrollment link circulation" column, matched on its words. */
export function opsCallerColumn(columns) {
  for (const c of columns) { const flat = String(c).replace(/\s+/g, " ").trim().toLowerCase(); if (flat.includes("caller name") && flat.includes("ops")) return c; }
  return null;
}

/* ------------------------------------------------------------------ enrollments */
export class Enrollments {
  constructor(byPhone, byEmail, rows, source) { Object.assign(this, { byPhone, byEmail, rows, source }); }

  /** keys: setting names holding the tracker link(s). */
  static async load(keys, label, { onlyNewEnrollment = false, log = null, force = false } = {}) {
    const tables = [];
    for (const k of (Array.isArray(keys) ? keys : [keys])) if (cfg.get(k)) tables.push(await sheets.readCsv(k, label, { force }));
    if (!tables.length) throw new Error(`No link is set for ${label}. Open Settings and paste it.`);
    const columns = [];
    for (const t of tables) for (const c of t.columns) if (!columns.includes(c)) columns.push(c);   // pd.concat: the union
    let rev = tables.flatMap((t) => t.rows);
    const phoneCol = firstColumn(columns, "Contact No", "Contact_No", "Contact Number", "Phone");
    const emailCol = firstColumn(columns, "Email Id", "Email_Id", "Email", "Email Address");
    const dateCol = firstColumn(columns, "Date", "Enrollment Date");
    const callerCol = opsCallerColumn(columns);
    if (phoneCol === null && emailCol === null) throw new Error(`${label} has no contact number or email column to match on. Found: ${columns.slice(0, 25).join(", ")}`);
    if (dateCol === null) throw new Error(`${label} has no Date column, so enrollments cannot be dated.`);
    if (onlyNewEnrollment) {
      const flag = firstColumn(columns, "Enrollment", "Enrollment Type");
      if (flag !== null) {
        const before = rev.length;
        rev = rev.filter((r) => text(r[flag]).toLowerCase() === "new enrollment");
        if (log) log(`${label}: ${rev.length.toLocaleString("en-US")} new enrollment(s) of ${before.toLocaleString("en-US")} row(s).`);
      }
    }
    const dates = toDatetime(rev.map((r) => r[dateCol]), { dayfirst: true });
    let keyed = rev.map((r, i) => ({ _date: dates[i], _caller: callerCol ? text(r[callerCol]) : "",
      _phone: phoneCol ? phone(r[phoneCol]) : "", _email: emailCol ? email(r[emailCol]) : "" }));
    keyed = sortDesc(keyed, (r) => r._date);                 // most recent row wins; undated rows last
    const byPhone = new Map(), byEmail = new Map();
    for (const r of keyed) {
      if (r._phone && !byPhone.has(r._phone)) byPhone.set(r._phone, r);
      if (r._email && !byEmail.has(r._email)) byEmail.set(r._email, r);
    }
    if (callerCol === null && log) log(`WARNING: ${label} has no 'Caller name (for ops)' column, so enrolled leads keep the owner they already had instead of the person who circulated the link.`);
    return new Enrollments(byPhone, byEmail, keyed.length, label);
  }

  /** [dates[], callers[]] — phone first, then email. */
  lookup(phones, emails = null) {
    const dates = [], callers = [];
    phones.forEach((p, i) => {
      const hp = this.byPhone.get(p ?? "");
      let date = hp ? hp._date : null, caller = hp ? hp._caller : null;
      if (emails && this.byEmail.size) {
        const he = this.byEmail.get(email(emails[i]));
        if (date === null && he) date = he._date;
        if ((caller === null || caller === "") && he) caller = he._caller;
      }
      dates.push(date); callers.push(text(caller));
    });
    return [dates, callers];
  }
}

/* ------------------------------------------------------------------ stage-change log */
/** phone -> latest caller comment (LeadSquared automation payloads with "ActionType" dropped). */
export async function stageComments({ log = null, force = false } = {}) {
  if (!cfg.get("STAGE_LOG_URL")) { if (log) log("No stage-change log link is set, so Comment LSQ will be blank."); return new Map(); }
  const t = await sheets.readCsv("STAGE_LOG_URL", "the stage-change log", { force });
  const pc = firstColumn(t.columns, "Phone", "Phone Number", "Mobile"), cc = firstColumn(t.columns, "Comments", "Comment");
  const wc = firstColumn(t.columns, "StageChangedOn", "Stage Changed On", "ModifiedOn");
  if (pc === null || cc === null) { if (log) log("WARNING: the stage-change log has no Phone/Comments columns, so Comment LSQ will be blank."); return new Map(); }
  let rows = t.rows.map((r) => ({ _phone: phone(r[pc]), _comment: text(r[cc]), _raw_when: wc !== null ? r[wc] : null }))
    .filter((r) => r._phone !== "" && r._comment !== "" && !r._comment.includes("ActionType"));
  if (wc !== null) {
    const when = toDatetime(rows.map((r) => r._raw_when), { dayfirst: true });
    rows.forEach((r, i) => { r._when = when[i]; });
    rows = sortDesc(rows, (r) => r._when);
  }
  const out = new Map();
  for (const r of rows) if (!out.has(r._phone)) out.set(r._phone, r._comment);
  return out;
}
/** phone -> email from the stage-change log, used to fill gaps. */
export async function stageEmails({ force = false } = {}) {
  if (!cfg.get("STAGE_LOG_URL")) return new Map();
  const t = await sheets.readCsv("STAGE_LOG_URL", "the stage-change log", { force });
  const pc = firstColumn(t.columns, "Phone", "Phone Number"), ec = firstColumn(t.columns, "EmailAddress", "Email Address", "Email");
  if (pc === null || ec === null) return new Map();
  const out = new Map();
  for (const r of t.rows) { const p = phone(r[pc]), e = text(r[ec]); if (p && e && !out.has(p)) out.set(p, e); }
  return out;
}

/* ------------------------------------------------------------------ verdict columns */
export function applyBreach(rows, stageCol, lastCalledCol, followUpCol, counterCol, statusCol, labelCol) {
  const [status, reason] = B.judge(rows.map((r) => r[stageCol]), rows.map((r) => r[lastCalledCol] ?? null),
    rows.map((r) => (followUpCol in r ? r[followUpCol] ?? null : null)));
  rows.forEach((r, i) => { r[statusCol] = status[i]; r._reason = reason[i]; r[labelCol] = B.dialLabel(r[counterCol]); });
  return rows;
}

/** Fill the "_" columns the Analysis tab reads — the same vocabulary for all three reports. */
export function buildView(rows, { owner, stage, followUp, dialLabel, dialCount, monthFrom, typeColumn = null, campaign = null,
                                  dateColumn = null, phoneCol = null, assignedCount = "Assigned On Call Counter" }) {
  for (const r of rows) {
    r._owner = text(r[owner]) || "(No owner)";
    r._stage = text(r[stage]);
    r._follow_up = text(r[followUp]);
    r._dial_label = text(r[dialLabel]);
    r._dial_count = B.dialCount(r[dialCount]);
    r._assigned_count = assignedCount in r ? B.dialCount(r[assignedCount]) : 0;
    r._phone = phoneCol && phoneCol in r ? phone(r[phoneCol]) : "";
    if (!("_reason" in r)) r._reason = "";
    r._month = monthLabel(r[monthFrom] ?? null);
    r._type = typeColumn ? text(r[typeColumn]) : "";
    r._campaign = campaign ? text(r[campaign]) : "";
    const d = r[dateColumn || monthFrom];
    r._date = typeof d === "number" ? d : null;
    r._enrolled = r._stage === B.ENROLLED_STAGE;
    r._team = "Team" in r ? text(r.Team) || OTHERS : OTHERS;
    r._vertical = "Verticals" in r ? text(r.Verticals) || OTHERS : OTHERS;
  }
  return rows;
}

const cellOut = (v) => (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? "" : v);
/** The output columns: the report's own, then Zip Intent and Zip Intent Justification, nothing internal. */
export function outputColumns(columns) { return [...columns.filter((c) => !ZIP_COLUMNS.includes(c)), ...ZIP_COLUMNS]; }
export function finish(rows, columns) {
  const cols = outputColumns(columns);
  return { columns: cols, rows: rows.map((r) => Object.fromEntries(cols.map((c) => [c, c in r ? cellOut(r[c]) : ""]))) };
}

/** The headline numbers on the report card and the dashboard tiles. */
export function summarise(out, view) {
  const total = view.length;
  const enrolled = view.filter((r) => r._stage === B.ENROLLED_STAGE).length;
  return {
    total, enrolled, conversion: total ? Math.round((enrolled * 1000) / total) / 10 : 0,
    breached: view.filter((r) => B.isBreachedOne(r._follow_up)).length,
    fresh: view.filter((r) => B.FRESH_STAGES.includes(r._stage)).length,
    dnp: B.dnpMask(view).filter(Boolean).length,
    owners: new Set(view.map((r) => r._owner)).size,
    zip_intent: out.columns.includes("Zip Intent") ? out.rows.filter((r) => text(r["Zip Intent"]) !== "").length : 0,
  };
}
export const fmtOrNa = (t, pattern = null, na = NA) => fmtDate(t, pattern) || na;
export { dropDuplicates };
