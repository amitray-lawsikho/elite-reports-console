/* Port of services/breach.py — the one breach engine, the one DNP rule and the one call-counter wording, shared by all
   three reports, the dashboards and the dialer files. Times are IST wall-clock milliseconds (dates.js convention). */
import { cfg } from "./core.js";
import { breachDays, dnpRule as specDnpRule } from "../shared/spec.js";
import { nowIst, normalize, daysSince, fmt } from "./dates.js";

export const STAGE_LABELS = {
  "Follow Up For Closure": ["Timely Follow Up", "Follow Up Breached"],
  "Counselled lead": ["Timely Counselled", "Breached Counselled lead"],
  "Call Back Later": ["Timely Called Back", "Breached Call Back"],
};
export const BREACHED_LABELS = Object.values(STAGE_LABELS).map(([, b]) => b);
export const BREACH_STAGES = Object.keys(STAGE_LABELS);
export const FRESH_STAGES = ["New Lead", "Re-enquired Lead", "Opportunity Created", "Untouched Lead"];
export const DNP_STAGES = ["Call Not Connected", "Call Not Picking Up"];
export const ENROLLED_STAGE = "Actually Enrolled";
export const COUNTER_LABELS = { phone: "Phone Call Counter", assigned: "Assigned On Call Counter" };
export const OP_WORDS = { lt: "less than", gt: "more than", eq: "equal to" };
export const NA = "#N/A";

const settings = () => { try { return cfg.all ? cfg.all() : {}; } catch { return {}; } };
export const daysByStage = () => breachDays(settings());
export const dnpRule = () => specDnpRule(settings());

const plural = (k) => { k = Math.trunc(k); return Math.abs(k) === 1 ? `${k} day` : `${k} days`; };
const str = (v) => (v === null || v === undefined ? "" : String(v)).trim();

/** judge(): [status[], reason[]] for a column of leads. lastCalled / followUp: IST ms or null. */
export function judge(stages, lastCalled, followUp = null, { days = null, now = null } = {}) {
  days = days || daysByStage();
  now = now !== null && now !== undefined ? now : nowIst();
  const today = normalize(now);
  const status = [], reason = [];
  stages.forEach((st, i) => {
    const stage = str(st);
    const n = Object.prototype.hasOwnProperty.call(days, stage) ? Number(days[stage]) : null;
    const last = lastCalled[i] ?? null, fu = followUp ? followUp[i] ?? null : null;
    const dLc = daysSince(last, today), dFu = daysSince(fu, today);
    const hasFu = fu !== null, hasLc = last !== null;
    const fuAhead = hasFu && fu > now;
    const fuNotDue = fuAhead || (hasFu && n !== null && dFu < n);
    const calledRecently = hasLc && n !== null && dLc <= n;
    const breached = !fuNotDue && !calledRecently;
    status.push(STAGE_LABELS[stage] ? STAGE_LABELS[stage][breached ? 1 : 0] : "");
    let why = "";
    if (n !== null) {
      if (fuAhead) why = `Follow-up due ${fmt(fu, "%d %b %Y %H:%M")}`;
      else if (fuNotDue) why = `Follow-up ${plural(dFu)} ago — not overdue yet`;
      else if (calledRecently) why = dLc <= 0 ? "Called today" : `Called ${plural(dLc)} ago`;
      else if (hasFu) why = `Follow-up overdue by ${plural(dFu)}, ${hasLc ? `last call ${plural(dLc)} ago` : "never called"}`;
      else if (hasLc) why = `No call in ${plural(dLc)}`;
      else why = "Never called, no follow-up";
    }
    reason.push(why);
  });
  return [status, reason];
}
export const followUpStatus = (stages, lastCalled, followUp = null, opts = {}) => judge(stages, lastCalled, followUp, opts)[0];
export const isBreachedOne = (status) => BREACHED_LABELS.includes(str(status));
export const isBreached = (statuses) => statuses.map(isBreachedOne);
export const breachLimitFor = (stage) => Math.trunc(Number(daysByStage()[str(stage)] || 0));

/* ------------------------------------------------------------------ less-dialled DNP */
export function parseNumbers(text) {
  const wanted = new Set();
  for (const part of str(text).split(/[,\s]+/)) {
    if (!part) continue;
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let [lo, hi] = [parseInt(m[1], 10), parseInt(m[2], 10)].sort((a, b) => a - b);
      if (hi - lo > 1000) throw new Error(`The range ${part} is too wide.`);
      for (let k = lo; k <= hi; k++) wanted.add(k);
    } else if (/^\d+$/.test(part)) wanted.add(parseInt(part, 10));
    else throw new Error(`'${part}' is not a number, a range like 2-5, or a list like 2,5,7.`);
  }
  if (!wanted.size) throw new Error("Give the DNP counter a number.");
  return wanted;
}
export function validateDnpRule(rule) {
  rule = rule || {};
  const counter = str(rule.counter || "phone").toLowerCase(), op = str(rule.op || "lt").toLowerCase(), value = str(rule.value || "");
  if (!(counter in COUNTER_LABELS)) throw new Error("Pick Phone Call Counter or Assigned On Call Counter for DNP.");
  if (!(op in OP_WORDS)) throw new Error("Pick less than, more than or equal to for the DNP counter.");
  if (op === "eq") parseNumbers(value);
  else if (!/^\d+$/.test(value)) throw new Error("The DNP counter needs a whole number.");
  return { counter, op, value };
}
export const dnpCaption = (rule = null) => { rule = rule || dnpRule(); return `${COUNTER_LABELS[rule.counter]} ${OP_WORDS[rule.op]} ${rule.value}`; };

/** pandas to_numeric(errors="coerce").fillna(0).astype(int) */
export function dialCount(v) {
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : 0;
  const t = str(v);
  if (t === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
export const dialCounts = (values) => values.map(dialCount);
export function counterMatch(counts, rule = null) {
  rule = rule || dnpRule();
  const c = counts.map(dialCount);
  if (rule.op === "eq") { const set = parseNumbers(rule.value); return c.map((x) => set.has(x)); }
  const value = parseInt(rule.value, 10);
  return c.map((x) => (rule.op === "lt" ? x < value : x > value));
}
/** view: array of report rows carrying the "_" view columns. */
export function dnpMask(view, rule = null) {
  rule = rule || dnpRule();
  const column = rule.counter === "assigned" ? "_assigned_count" : "_dial_count";
  const m = counterMatch(view.map((r) => (column in r ? r[column] : 0)), rule);
  return view.map((r, i) => DNP_STAGES.includes(r._stage) && m[i]);
}
export const freshMask = (view) => view.map((r) => FRESH_STAGES.includes(r._stage));
export const breachedMask = (view) => view.map((r) => isBreachedOne(r._follow_up));

/* ------------------------------------------------------------------ call counter wording */
export function dialLabel(value) {
  if (value === null || value === undefined) return "Not Dialled yet";
  const text = String(value).trim();
  if (text === "" || ["nan", "none", "#n/a", "na"].includes(text.toLowerCase())) return "Not Dialled yet";
  const num = Number(text);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text) && !/^[+-]?inf(inity)?$/i.test(text)) return text;   // int(float(text)) fails
  if (!Number.isFinite(num)) return text;
  const count = Math.trunc(num);
  const ceiling = Math.max(1, cfg.int("DIAL_LABEL_MAX", 6));
  if (count <= 0) return "Not Dialled yet";
  if (count === 1) return "1 time dialled";
  if (count <= ceiling) return `${count} times dialled`;
  return `Dialled more than ${ceiling} times`;
}
export const dialLabels = (values) => values.map(dialLabel);
