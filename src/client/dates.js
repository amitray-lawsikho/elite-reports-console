/* Port of services/analytics/dates.py. A timestamp is a number: milliseconds of the naive IST wall-clock time,
   counted as if it were UTC (so Date.UTC / getUTC* read the IST fields directly). null = missing (NaT). */
const DAY = 86400000;
const BLANKS = new Set(["", "nan", "nat", "none", "null", "0001-01-01 00:00:00", "01/01/0001"]);
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|UTC|GMT|[+-]00:?00)?$/i;
const YMD = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp]\.?[Mm]\.?)?)?\s*(?:IST)?$/i;
const NUM = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp]\.?[Mm]\.?)?)?\s*(?:IST)?$/i;
const SERIAL = /^\d{5}(\.\d+)?$/;

export const clean = (v) => {
  const t = (v === null || v === undefined ? "" : String(v)).replace(/\s+/g, " ").trim();
  return BLANKS.has(t.toLowerCase()) ? "" : t;
};
/** pandas Timestamp from pieces; impossible dates (31 Feb, 25:00, :60 seconds) -> null. */
export function compose(y, mo, d, h = 0, mi = 0, se = 0, ap = "") {
  if ([y, mo, d, h, mi, se].some((x) => !Number.isFinite(x))) return null;
  if (ap) { const a = ap.toLowerCase().replace(/\./g, ""); h = (h % 12) + (a === "pm" ? 12 : 0); }
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) return null;
  if (se < 0 || se > 59 || y < 1678 || y > 2261) return null;   // pandas Timestamp range
  const t = Date.UTC(y, mo - 1, d, h, mi, se);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return t;
}
const n = (x) => (x === undefined || x === null || x === "" ? NaN : Number(x));
const nz = (x) => (x === undefined || x === null || x === "" ? 0 : Number(x));

let fixedNow = null;                                      // tests pin the clock; null = real time
export function setNowIst(ms) { fixedNow = ms; }
export function nowIst() {
  return fixedNow !== null ? fixedNow : Date.now() + 5.5 * 3600 * 1000;   // UTC -> IST wall clock
}
export const normalize = (t) => (t === null ? null : t - (((t % DAY) + DAY) % DAY));
export const todayIst = () => normalize(nowIst());

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
/** The dateutil fallback (dayfirst=True) for what the patterns above miss: month names, offsets, ISO with zones. */
export function fallbackParse(value) {
  let v = value.replace(/\b(IST|GMT\+0?5:?30)\b/gi, "").trim();
  // ISO with an offset / zone, e.g. 2026-09-10T08:30:00+05:30
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})$/i);
  if (m) {
    const base = compose(+m[1], +m[2], +m[3], +m[4], +m[5], nz(m[6]));
    if (base === null) return null;
    let off = 0;
    if (m[7].toUpperCase() !== "Z") { const s = m[7][0] === "-" ? -1 : 1; const d = m[7].slice(1).replace(":", ""); off = s * (+d.slice(0, 2) * 60 + +d.slice(2)); }
    return base - off * 60000 + 330 * 60000;            // to UTC, then IST
  }
  // 11-Sep-2026 07:44 PM / 11 Sep 2026 / Sep 11, 2026 19:44 / 11 September 2026
  const tm = "(?:[ T,]+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:\\.\\d+)?\\s*([AaPp]\\.?[Mm]\\.?)?)?";
  m = v.match(new RegExp(`^(\\d{1,2})[\\s\\-/.]+([A-Za-z]{3,9})\\.?[\\s\\-/.,]+(\\d{2}|\\d{4})${tm}$`));
  if (m && MON[m[2].toLowerCase()]) {
    const y = +m[3] < 100 ? +m[3] + 2000 : +m[3];
    return compose(y, MON[m[2].toLowerCase()], +m[1], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
  }
  m = v.match(new RegExp(`^(?:[A-Za-z]{3,9},?\\s+)?([A-Za-z]{3,9})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})${tm}$`));
  if (m && MON[m[1].toLowerCase()]) return compose(+m[3], MON[m[1].toLowerCase()], +m[2], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
  m = v.match(new RegExp(`^(\\d{4})[\\s\\-/.]+([A-Za-z]{3,9})[\\s\\-/.]+(\\d{1,2})${tm}$`));
  if (m && MON[m[2].toLowerCase()]) return compose(+m[1], MON[m[2].toLowerCase()], +m[3], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
  return null;
}

/**
 * Parse one column of LeadSquared values into naive IST timestamps (dates.standardise).
 * pastOnly: fields that cannot be in the future (Last Called Date). report: filled with what was decided.
 */
export function standardise(values, { isoIsUtc = true, pastOnly = false, defaultDayfirst = true, report = null, now = null } = {}) {
  now = now !== null ? now : nowIst();
  const text = values.map(clean);
  const out = new Array(text.length).fill(null);
  const info = { nonblank: text.filter((t) => t !== "").length, iso: 0, date_only: 0, day_first: 0, month_first: 0, ambiguous: 0,
                 flipped_future: 0, order: "", other: 0, unparsed: 0, future: 0, samples: [] };
  // ISO (UTC unless date-only)
  const iso = text.map((t) => t.match(ISO));
  const isoIdx = iso.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  const isIso = new Set(isoIdx);
  if (isoIdx.length) {
    const midnight = isoIdx.map((i) => { const m = iso[i]; return m[4] === undefined || (nz(m[4]) === 0 && nz(m[5]) === 0 && nz(m[6]) === 0); });
    const allMid = midnight.every(Boolean);
    isoIdx.forEach((i, k) => {
      const m = iso[i];
      const stamp = compose(+m[1], +m[2], +m[3], nz(m[4]), nz(m[5]), nz(m[6]));
      const noTime = m[4] === undefined;
      const dateOnly = allMid ? midnight[k] : noTime;
      if (dateOnly) info.date_only += 1;
      const wanted = !dateOnly && (isoIsUtc || m[7] !== undefined);
      out[i] = stamp === null ? null : stamp + (wanted ? 330 * 60000 : 0);
    });
    info.iso = isoIdx.length;
  }
  // year first with / or .
  const ymd = text.map((t, i) => (isIso.has(i) ? null : t.match(YMD)));
  const isYmd = new Set();
  ymd.forEach((m, i) => { if (m) { isYmd.add(i); out[i] = compose(+m[1], +m[2], +m[3], nz(m[4]), nz(m[5]), nz(m[6]), m[7] || ""); } });
  // day/month or month/day: decided per column
  const numIdx = [], num = [];
  text.forEach((t, i) => { if (isIso.has(i) || isYmd.has(i)) return; const m = t.match(NUM); if (m) { numIdx.push(i); num.push(m); } });
  if (numIdx.length) {
    const rows = num.map((m) => {
      const a = +m[1], b = +m[2];
      let y = +m[3]; if (y < 100) y += 2000;
      const dmy = compose(y, b, a, nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
      const mdy = compose(y, a, b, nz(m[4]), nz(m[5]), nz(m[6]), m[7] || "");
      return { a, b, dmy, mdy, onlyDF: a > 12 && b <= 12 && dmy !== null, onlyMF: b > 12 && a <= 12 && mdy !== null, amb: a <= 12 && b <= 12 };
    });
    info.ambiguous = rows.filter((r) => r.amb).length;
    const vD = rows.filter((r) => r.onlyDF).length, vM = rows.filter((r) => r.onlyMF).length;
    let dayfirst, why;
    if (vD > vM) { dayfirst = true; why = `day-first (${vD} values can only be day-first, ${vM} only month-first)`; }
    else if (vM > vD) { dayfirst = false; why = `month-first (${vM} values can only be month-first, ${vD} only day-first)`; }
    else if (pastOnly && rows.some((r) => r.amb)) {
      const fD = rows.filter((r) => r.amb && r.dmy !== null && r.dmy > now).length;
      const fM = rows.filter((r) => r.amb && r.mdy !== null && r.mdy > now).length;
      dayfirst = fD !== fM ? fD < fM : defaultDayfirst;
      why = (dayfirst ? "day-first" : "month-first") + " (no value was unambiguous; chosen because the other order puts calls in the future)";
    } else {
      dayfirst = defaultDayfirst;
      why = (dayfirst ? "day-first" : "month-first") + " (no value was unambiguous; default)";
    }
    rows.forEach((r, k) => {
      let chosen = r.onlyDF || (r.amb && dayfirst) ? r.dmy : r.mdy;
      if (r.onlyMF) chosen = r.mdy;
      if (pastOnly) {
        const other = dayfirst ? r.mdy : r.dmy;
        if (r.amb && chosen !== null && chosen > now && other !== null && other <= now) { chosen = other; info.flipped_future += 1; }
      }
      out[numIdx[k]] = chosen;
    });
    info.day_first = vD; info.month_first = vM; info.order = why;
  }
  // Excel serial days
  const serialIdx = new Set();
  text.forEach((t, i) => {
    if (out[i] !== null || !SERIAL.test(t)) return;
    serialIdx.add(i);
    const d = Number(t);
    if (d > 20000 && d < 80000) { const w = Math.trunc(d); out[i] = Date.UTC(1899, 11, 30) + w * DAY + Math.floor((d - w) * DAY); }   // pandas: whole days + truncated fraction
  });
  // anything else: the dateutil-style fallback
  let other = 0;
  text.forEach((t, i) => {
    if (t === "" || out[i] !== null || serialIdx.has(i)) return;
    const p = fallbackParse(t);
    if (p !== null) { out[i] = p; other += 1; }
  });
  info.other = other;
  info.unparsed = text.filter((t, i) => t !== "" && out[i] === null).length;
  if (pastOnly) info.future = out.filter((t) => t !== null && t > now + 3600000).length;
  if (!info.order) info.order = info.iso && isoIsUtc ? "ISO (UTC → IST)" : info.iso ? "ISO" : "—";
  else if (info.iso) info.order += isoIsUtc ? `; ${info.iso} ISO values (UTC → IST)` : `; ${info.iso} ISO values`;
  if (info.date_only) info.order += `; ${info.date_only} date-only, kept as written`;
  if (report) {
    const pick = [];
    numIdx.forEach((i, k) => { if (pick.length < 4 && +num[k][1] <= 12 && +num[k][2] <= 12) pick.push(i); });
    let added = 0;
    for (let i = 0; i < text.length && added < 6; i++) {
      if (text[i] === "") continue;
      added += 1;
      if (!pick.includes(i)) pick.push(i);
    }
    info.samples = pick.slice(0, 6).map((i) => ({ raw: text[i], ist: out[i] === null ? "" : fmt(out[i], "%d %b %Y %H:%M") }));
    Object.assign(report, info);
  }
  return out;
}

/** Whole calendar days from each timestamp to today (negative = future); null where missing. */
export const daysSince = (t, today) => (t === null || t === undefined ? null : Math.round((today - normalize(t)) / DAY));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULLM = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const p2 = (x) => String(x).padStart(2, "0");
/** Python strftime for the codes the console uses. */
export function fmt(t, pattern) {
  if (t === null || t === undefined) return "";
  const d = new Date(t);
  const H = d.getUTCHours();
  const map = {
    "%Y": String(d.getUTCFullYear()), "%y": p2(d.getUTCFullYear() % 100), "%m": p2(d.getUTCMonth() + 1), "%d": p2(d.getUTCDate()),
    "%H": p2(H), "%M": p2(d.getUTCMinutes()), "%S": p2(d.getUTCSeconds()), "%I": p2(H % 12 === 0 ? 12 : H % 12),
    "%p": H < 12 ? "AM" : "PM", "%b": MONTHS[d.getUTCMonth()], "%B": FULLM[d.getUTCMonth()], "%A": DAYS[d.getUTCDay()],
    "%a": DAYS[d.getUTCDay()].slice(0, 3), "%j": String(Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1).padStart(3, "0"), "%%": "%",
  };
  return pattern.replace(/%[YymdHMSIpbBAaj%]/g, (c) => map[c]);
}
export { DAY };
