/* Port of services/ozonetel.py — sales incoming calls from the Ozonetel CDR API, every day from the Incoming master
   sheet's newest Call Date to today (Ozonetel keeps 15 days). Two requests a minute; a finished day is cached in this
   browser and never fetched again, today is re-fetched after OZONETEL_TODAY_REFRESH_MINUTES. */
import { cfg, op, sleep, idbGet, idbSet, idbDel, idbKeys } from "./core.js";
import { nowIst, todayIst, fmt, DAY } from "./dates.js";
import { text } from "./frame.js";

export const MAX_DAYS_BACK = 15;
const MAX_PAGES = 50;
export const COLUMNS = ["Campaign", "Phone Number", "Call Date", "Call Flow", "Status"];
let lastRequest = 0;

export class OzonetelError extends Error {}
export const configured = () => !!(cfg.get("OZONETEL_API_KEY") && cfg.get("OZONETEL_USERNAME"));
export const skills = () => String(cfg.get("OZONETEL_SKILLS") || "").split(",").map((x) => x.trim()).filter(Boolean);

async function waitTurn(job) {
  const gap = Math.max(0, cfg.int("OZONETEL_SLEEP_SECONDS", 32)) * 1000;
  for (;;) {
    const left = lastRequest + gap - Date.now();
    if (left <= 0) { lastRequest = Date.now(); return; }
    if (job && job.checkStop()) throw new OzonetelError("Stopped.");
    await sleep(Math.min(left, 1000));
  }
}
async function request(day, pageNo, pageSize, job) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await waitTurn(job);
    let res;
    try { res = await op("ozonetel.cdr", { day, page_no: pageNo, page_size: pageSize }); }
    catch (e) {
      if (e.workerStatus) throw new OzonetelError(e.message);                 // not set up / not allowed: no retry
      if (attempt === 3) throw new OzonetelError(`Could not reach Ozonetel: ${e.message || e}`);
      continue;
    }
    const status = parseInt(res.headers.get("x-up-status"), 10);
    const body = await res.text();
    if (status === 429) { if (job) job.log("Ozonetel says slow down — waiting a minute."); lastRequest = Date.now() + 30000; continue; }
    if (status === 401 || status === 403) throw new OzonetelError("Ozonetel refused the API key or username — check them on Setup and Tokens.");
    if (status !== 200) throw new OzonetelError(`Ozonetel returned HTTP ${status}: ${body.slice(0, 200)}`);
    let data;
    try { data = JSON.parse(body); } catch { throw new OzonetelError("Ozonetel did not return JSON."); }
    if (!["success", "true"].includes(String(data.status ?? "success").toLowerCase())) throw new OzonetelError(`Ozonetel: ${data.message || JSON.stringify(data).slice(0, 200)}`);
    return data;
  }
  throw new OzonetelError("Ozonetel kept rate-limiting — try again in a few minutes.");
}

/** Every call on one day, as Ozonetel returns them (all skills). */
export async function fetchDay(day, job = null) {
  const pageSize = Math.max(1, cfg.int("OZONETEL_PAGE_SIZE", 500));
  const rows = [], seen = new Set();
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const data = await request(day, pageNo, pageSize, job);
    const details = data.details || [];
    const fresh = details.filter((r) => !seen.has(String(r.UCID || r.CallID)));
    for (const r of fresh) seen.add(String(r.UCID || r.CallID));
    rows.push(...fresh);
    const total = data.totalCount;
    if (!details.length || !fresh.length || details.length > pageSize || details.length < pageSize ||
        (total !== null && total !== undefined && total !== "" && rows.length >= parseInt(total, 10))) break;
  }
  return rows;
}

/* ------------------------------------------------------------------ cache (this browser) */
const ck = (day) => `ozonetel:${day}`;
async function cached(day, today) {
  const blob = await idbGet(ck(day));
  if (!blob) return null;
  const fetchedDay = fmt(blob.fetched_at, "%Y-%m-%d");
  if (fetchedDay > day) return blob.rows;                                // fetched after the day ended — final
  if (day === fmt(today, "%Y-%m-%d")) {
    const freshFor = cfg.int("OZONETEL_TODAY_REFRESH_MINUTES", 30) * 60000;
    if (nowIst() - blob.fetched_at < freshFor) return blob.rows;
  }
  return null;
}
const store = (day, rows) => idbSet(ck(day), { day, fetched_at: nowIst(), rows });
async function cleanCache(keepDays = 40) {
  const cutoff = fmt(todayIst() - keepDays * DAY, "%Y-%m-%d");
  for (const key of await idbKeys()) if (typeof key === "string" && key.startsWith("ozonetel:") && key.slice(9, 19) < cutoff) await idbDel(key);
}

/* ------------------------------------------------------------------ raw rows -> the export's shape */
const DT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const D = /^(\d{4})-(\d{2})-(\d{2})$/;
function when(callDate, startTime) {
  let m = `${callDate} ${startTime}`.match(DT);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  m = callDate.match(D);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}
/** Sales incoming calls (Skill in OZONETEL_SKILLS), de-duplicated on UCID. */
export function toFrame(rows, wantedSkills = null) {
  const wanted = new Set((wantedSkills || skills()).map((x) => x.toLowerCase()));
  const seen = new Set(), out = [];
  for (const r0 of rows || []) {
    const r = {};
    for (const c of ["Skill", "UCID", "CallID", "E164", "CallerID", "CallDate", "StartTime", "CampaignName", "CallFlow", "Event", "Status"]) r[c] = r0[c] === null || r0[c] === undefined ? "" : String(r0[c]).trim();
    if (!wanted.has(r.Skill.toLowerCase())) continue;
    const ucid = r.UCID !== "" ? r.UCID : r.CallID;
    if (seen.has(ucid)) continue;
    seen.add(ucid);
    out.push({ Campaign: r.CampaignName, "Phone Number": r.E164 !== "" ? r.E164 : r.CallerID, "Call Date": when(r.CallDate, r.StartTime),
      "Call Flow": r.CallFlow !== "" ? r.CallFlow : r.Event, Status: r.Status, UCID: ucid, Skill: r.Skill });
  }
  return out;
}

/** [days[], note] — every day from lastDay to today, clamped to 15. */
export function daysToFetch(lastDay, today = null) {
  today = today !== null ? today : todayIst();
  const earliest = today - MAX_DAYS_BACK * DAY;
  let note = "", start;
  if (lastDay === null || lastDay === undefined) {
    start = earliest;
    note = `The master sheet has no Call Date to start from, so the last ${MAX_DAYS_BACK} days are fetched.`;
  } else {
    start = lastDay - (((lastDay % DAY) + DAY) % DAY);
    if (start > today) start = today;
    if (start < earliest) {
      note = `The master sheet's newest call is ${fmt(start, "%d %b %Y")}, but Ozonetel only keeps ${MAX_DAYS_BACK} days — calls from ` +
             `${fmt(start, "%d %b")} to ${fmt(earliest - DAY, "%d %b")} cannot be fetched. Upload them into the master sheet by hand if they matter.`;
      start = earliest;
    }
  }
  const days = [];
  for (let d = start; d <= today; d += DAY) days.push(fmt(d, "%Y-%m-%d"));
  return [days, note];
}

const fmtN = (n) => Number(n).toLocaleString("en-US");
/** Fetch (or read from cache) every day from lastDay to today. Returns [calls, info]. */
export async function collect(job, lastDay) {
  if (!configured()) throw new OzonetelError("Ozonetel is not set up — add your API key and username on Setup and Tokens.");
  const today = todayIst();
  const [days, note] = daysToFetch(lastDay, today);
  if (note) job.log("WARNING: " + note);
  const wanted = skills();
  job.log(`Ozonetel: ${days.length} day(s), ${days[0]} to ${days[days.length - 1]}, skills ${wanted.join(", ")}.`);
  const need = [];
  for (const d of days) if ((await cached(d, today)) === null) need.push(d);
  if (need.length) {
    const gap = cfg.int("OZONETEL_SLEEP_SECONDS", 32);
    job.log(`${days.length - need.length} day(s) already cached; fetching ${need.length} — about ${Math.max(1, Math.round((need.length * gap) / 60))} minute(s) at Ozonetel's two requests a minute.`);
  }
  let calls = [];
  const perDay = [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (job.checkStop()) throw new OzonetelError("Stopped — the Ozonetel fetch did not finish.");
    let rows = await cached(day, today), source = "cache";
    if (rows === null) {
      job.put(`__STEP__ Ozonetel — day ${i + 1} of ${days.length} (${day})…`);
      rows = await fetchDay(day, job);
      await store(day, rows);
      source = "API";
    }
    const dayCalls = toFrame(rows, wanted);
    calls.push(...dayCalls);
    perDay.push({ day, calls: rows.length, sales: dayCalls.length, source });
    job.log(`Ozonetel ${day}: ${fmtN(rows.length)} call(s), ${fmtN(dayCalls.length)} sales incoming (${source}).`);
  }
  await cleanCache();
  const seen = new Set();
  calls = calls.filter((c) => (seen.has(c.UCID) ? false : (seen.add(c.UCID), true)));
  const info = { from: days[0], to: days[days.length - 1], days: perDay, calls: calls.length,
    numbers: new Set(calls.map((c) => c["Phone Number"])).size, note, fetched_at: new Date(nowIst()).toISOString().slice(0, 19) };
  job.log(`Ozonetel: ${fmtN(info.calls)} sales incoming call(s) from ${fmtN(info.numbers)} number(s).`);
  return [calls, info];
}
export { text };
