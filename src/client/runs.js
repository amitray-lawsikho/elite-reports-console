/* Port of services/runs.py. A fetch and the reports built from it live in THIS browser (IndexedDB, nothing with a phone
   number goes online; Amit 20 Nov 2026), so the fetch -> build -> update LSQ -> rebuild loop survives page changes and
   reloads. Kept for KEEP_HOURS; one fetch is held in memory at a time. */
import { cfg, idbGet, idbSet, idbDel, idbKeys, uuid } from "./core.js";

const LATEST = "runs:latest";
let mem = { token: null, frame: null, reports: new Map() };
const SAFE = /^[a-z0-9_\-]+$/;

export const newToken = () => uuid();
function reportName(report) {
  const name = String(report || "").trim().toLowerCase();
  if (!SAFE.test(name)) throw new Error(`Unknown report: ${JSON.stringify(report)}`);
  return name;
}
const k = (token, part) => `run:${token}:${part}`;

export async function saveFetch(token, frame, meta) {
  await idbSet(k(token, "leads"), frame);
  await idbSet(k(token, "meta"), { ...meta, _at: Date.now() });
  await idbSet(LATEST, token);
  mem = { token, frame, reports: new Map() };
}
export async function saveFetchMeta(token, meta) { await idbSet(k(token, "meta"), { ...meta, _at: Date.now() }); }
export async function loadFrame(token) {
  if (mem.token === token && mem.frame) return mem.frame;
  const frame = await idbGet(k(token, "leads"));
  if (!frame) throw new Error("That fetch has expired or was cleaned up — fetch again.");
  mem = { token, frame, reports: new Map() };
  return frame;
}
export async function loadMeta(token) { const m = await idbGet(k(token, "meta")); if (!m) return null; const { _at, ...rest } = m; return rest; }
export async function latestToken() {
  const token = await idbGet(LATEST);
  if (token && (await idbGet(k(token, "meta")))) return token;
  return null;
}

/* a built report: its view (rows incl. "_" columns) and its summary */
export async function saveReport(token, report, view, summary) {
  const name = reportName(report);
  await idbSet(k(token, `report:${name}`), view);
  await idbSet(k(token, `summary:${name}`), summary);
  if (mem.token === token) mem.reports.set(name, view);
}
export async function loadReport(token, report) {
  const name = reportName(report);
  if (mem.token === token && mem.reports.has(name)) return mem.reports.get(name);
  const view = await idbGet(k(token, `report:${name}`));
  if (!view) throw new Error("That report has not been built from this fetch yet — build it first.");
  if (mem.token === token) mem.reports.set(name, view);
  return view;
}
export async function reportSummary(token, report) { return (await idbGet(k(token, `summary:${reportName(report)}`))) || null; }
export async function builtReports(token, keys = null) {
  const out = {};
  const prefix = k(token, "summary:");
  for (const key of await idbKeys()) {
    if (typeof key !== "string" || !key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    if (name.endsWith("__pending")) continue;
    if (keys && !keys.includes(name)) continue;
    out[name] = await idbGet(key);
  }
  return out;
}

/** Sweep fetches older than KEEP_HOURS (never the latest one). */
export async function cleanup(maxAgeHours = null) {
  const hours = maxAgeHours !== null ? maxAgeHours : cfg.int("KEEP_HOURS", 12);
  const cutoff = Date.now() - Math.max(1, hours) * 3600 * 1000;
  const keep = await latestToken();
  const keys = await idbKeys();
  const old = new Set();
  for (const key of keys) {
    const m = typeof key === "string" && key.match(/^run:([^:]+):meta$/);
    if (!m || m[1] === keep) continue;
    const meta = await idbGet(key);
    if (!meta || !meta._at || meta._at < cutoff) old.add(m[1]);
  }
  let removed = 0;
  for (const key of keys) {
    const m = typeof key === "string" && key.match(/^run:([^:]+):/);
    if (m && old.has(m[1])) { await idbDel(key); removed++; }
  }
  return removed;
}
