/* Small pandas stand-ins shared by the reports: a table is an array of row objects (column name -> value).
   Dates are IST wall-clock milliseconds or null (dates.js convention). */
import { cfg } from "./core.js";
import { compose, fmt, fallbackParse } from "./dates.js";

/** base.text(): a cell as clean text, with pandas' spellings of empty gone. */
export function text(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && !Number.isFinite(v)) return "";
  const t = String(v).trim();
  return ["nan", "nat", "none", "null"].includes(t.toLowerCase()) ? "" : t;
}
/** lsq_fetch.clean_phone(): last ten digits, or blank. The single phone rule for every join. */
export function phone(v) {
  if (v === null || v === undefined) return "";
  const d = String(v).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}
export const email = (v) => text(v).toLowerCase();

/* ------------------------------------------------------------------ pd.to_datetime(values, errors="coerce", dayfirst=…)
   pandas 2 guesses ONE format from the first non-blank value and reads every value with it; a value written another way
   becomes NaT. When no format can be guessed, each value is read on its own (dateutil). */
const AMPM = "(?:\\s*([AaPp]\\.?[Mm]\\.?))?";
function guessFormat(v, dayfirst) {
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:([ T])(\d{1,2}):(\d{2})(?::(\d{2}))?(\.\d+)?)?$/);
  if (m) return { kind: "ymd", sep: "-", time: m[5] ? (m[7] ? "hms" : "hm") : "", t: m[4] || " ", frac: !!m[8] };
  m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return { kind: "ymd", sep: "/", time: m[4] ? (m[6] ? "hms" : "hm") : "", t: " " };
  m = v.match(new RegExp(`^(\\d{1,2})([/\\-.])(\\d{1,2})\\2(\\d{4}|\\d{2})(?:\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?${AMPM})?$`));
  if (m) {
    const a = +m[1], b = +m[3];
    // dateutil(dayfirst): day = first number unless that makes an impossible month
    let order = dayfirst ? "dm" : "md";
    if (order === "dm" && b > 12 && a <= 12) order = "md";
    if (order === "md" && a > 12 && b <= 12) order = "dm";
    return { kind: order, sep: m[2], year: m[4].length === 2 ? "y" : "Y", time: m[5] ? (m[7] ? "hms" : "hm") : "", ampm: !!m[8] };
  }
  return null;
}
function parseWith(f, v) {
  let m;
  if (f.kind === "ymd") {
    const sep = f.sep === "-" ? "-" : "\\/";
    const t = f.time ? (f.t === "T" ? "T" : " ") + "(\\d{1,2}):(\\d{2})" + (f.time === "hms" ? ":(\\d{2})" : "") + (f.frac ? "(?:\\.\\d+)?" : "") : "";
    m = v.match(new RegExp(`^(\\d{4})${sep}(\\d{1,2})${sep}(\\d{1,2})${t}$`));
    if (!m) return null;
    return compose(+m[1], +m[2], +m[3], f.time ? +m[4] : 0, f.time ? +m[5] : 0, f.time === "hms" ? +m[6] : 0);
  }
  const sep = f.sep === "." ? "\\." : f.sep === "-" ? "-" : "\\/";
  const y = f.year === "y" ? "(\\d{2})" : "(\\d{4})";
  const t = f.time ? "\\s+(\\d{1,2}):(\\d{2})" + (f.time === "hms" ? ":(\\d{2})" : "()") + (f.ampm ? "\\s*([AaPp]\\.?[Mm]\\.?)" : "()") : "()()()()";
  m = v.match(new RegExp(`^(\\d{1,2})${sep}(\\d{1,2})${sep}${y}${t}$`));
  if (!m) return null;
  let year = +m[3];
  if (f.year === "y") year += year < 69 ? 2000 : 1900;                 // strptime %y
  const [d, mo] = f.kind === "dm" ? [+m[1], +m[2]] : [+m[2], +m[1]];
  if (f.ampm && !(+m[4] >= 1 && +m[4] <= 12)) return null;              // %I
  return compose(year, mo, d, f.time ? +m[4] : 0, f.time ? +m[5] : 0, f.time === "hms" ? +m[6] : 0, f.ampm ? m[7] : "");
}
function parseOne(v, dayfirst) {
  const f = guessFormat(v, dayfirst);
  if (f) return parseWith(f, v);
  return fallbackParse(v);
}
const isBlank = (v) => v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) || text(v) === "";
export function toDatetime(values, { dayfirst = false } = {}) {
  const first = values.find((v) => !isBlank(v) && typeof v !== "number");
  const f = first === undefined ? null : guessFormat(text(first), dayfirst);
  return values.map((v) => {
    if (isBlank(v)) return null;
    if (typeof v === "number") return v;                                // already a timestamp
    const t = text(v);
    return f ? parseWith(f, t) : parseOne(t, dayfirst);
  });
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
/** base.month_label(): "SEPTEMBER-2026", blank where there is no date. */
export const monthLabel = (t) => (t === null || t === undefined ? "" : `${MONTHS[new Date(t).getUTCMonth()]}-${new Date(t).getUTCFullYear()}`);
/** base.fmt_dates(): blanks stay blank. */
export const fmtDate = (t, pattern = null) => (t === null || t === undefined ? "" : fmt(t, pattern || cfg.get("DOWNLOAD_DATE_FORMAT")));

/* ------------------------------------------------------------------ sheets.first_column / require_columns */
export function firstColumn(columns, ...names) {
  const lookup = new Map();
  for (const c of columns) { const k = String(c).trim().toLowerCase(); if (!lookup.has(k)) lookup.set(k, c); }
  for (const n of names) { const hit = lookup.get(String(n).trim().toLowerCase()); if (hit !== undefined) return hit; }
  return null;
}
export function requireColumns(table, columns, label) {
  const missing = columns.filter((c) => !table.columns.includes(c));
  if (missing.length) throw new Error(`${label} is missing the column(s) ${missing.join(", ")}. Found: ${table.columns.slice(0, 25).join(", ")}`);
  return table;
}

/* ------------------------------------------------------------------ row helpers */
/** drop_duplicates(key, keep="first"|"last"), keeping the kept rows in their original order. */
export function dropDuplicates(rows, key, keep = "first") {
  const pick = new Map();
  rows.forEach((r, i) => { const k = key(r); if (keep === "last" || !pick.has(k)) pick.set(k, i); });
  const keepIdx = new Set(pick.values());
  return rows.filter((_, i) => keepIdx.has(i));
}
/** sort_values(col, ascending=False, na_position="last") — stable, newest first, blanks last. */
export function sortDesc(rows, get) {
  return rows.map((r, i) => [r, get(r), i]).sort((a, b) => {
    const x = a[1], y = b[1];
    if (x === null || x === undefined) return y === null || y === undefined ? a[2] - b[2] : 1;
    if (y === null || y === undefined) return -1;
    return y - x || a[2] - b[2];
  }).map(([r]) => r);
}
/** A lookup like Series.map: key -> value of the first row kept (rows already de-duplicated). */
export function index(rows, key) {
  const m = new Map();
  for (const r of rows) { const k = key(r); if (!m.has(k)) m.set(k, r); }
  return m;
}
