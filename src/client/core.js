/* Browser core for the ported console: the Worker call, the old apis/http.py request rules, settings,
   page-surviving storage (IndexedDB) and CSV read/write. */
import { SPEC, getSetting, getInt, getBool } from "../shared/spec.js";

export class ApiError extends Error {
  constructor(message, status = null, body = null) { super(message); this.status = status; this.body = body; }
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ the Worker */
let tokenGetter = async () => "";
export function setTokenGetter(fn) { tokenGetter = fn; }

/* Tests replace the Worker call and IndexedDB with in-memory stand-ins (tests/parity.test.js). */
let hooks = null;
export function setHooks(h) { hooks = h; }

/** Raw call; returns the fetch Response. Worker-level failures ({ok:false,error}) throw a plain Error. */
export async function op(name, args = {}) {
  if (hooks && hooks.op) return hooks.op(name, args);
  const token = await tokenGetter();
  let res;
  try {
    res = await fetch("/x/op", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                 body: JSON.stringify({ op: name, args }) });
  } catch (e) {
    throw new ApiError(`${name}: connection failed — ${e.message || e}`);
  }
  if (!res.headers.get("x-up-status")) {
    let j = null;
    try { j = await res.json(); } catch { /* fall through */ }
    if (!res.ok || (j && j.ok === false)) {
      const err = new Error((j && j.error) || `${res.status} ${res.statusText}`);
      err.workerStatus = res.status;
      throw err;
    }
    return { worker: true, json: j };
  }
  return res;
}
/** Worker-only operation returning its JSON. */
export async function opJson(name, args) {
  const r = await op(name, args);
  return r.json;
}

/* ------------------------------------------------------------------ apis/http.py request() */
class RateLimiter {          // token bucket: max_rps requests per second (shared by everything in this tab)
  constructor(rps) { this.max = rps; this.tokens = rps; this.last = performance.now(); this.queue = Promise.resolve(); }
  acquire() {
    const run = async () => {
      for (;;) {
        const now = performance.now();
        this.tokens = Math.min(this.max, this.tokens + ((now - this.last) / 1000) * this.max);
        this.last = now;
        if (this.tokens >= 1) { this.tokens -= 1; return; }
        await sleep(((1 - this.tokens) / this.max) * 1000);
      }
    };
    const p = this.queue.then(run);
    this.queue = p.catch(() => {});
    return p;
  }
}
export const limiters = { mcube: new RateLimiter(4), acefone: new RateLimiter(5), lsq: new RateLimiter(5) };
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/**
 * One provider call through the Worker, with the old rules: rate limit, up to `retries` attempts with
 * 1s, 2s… back-off on 429/5xx and network failures, empty body -> {success: true}, non-JSON -> ApiError.
 */
export async function request(name, args, { limiter = null, retries = 3, expectJson = true } = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (limiter) await limiter.acquire();
    let res;
    try {
      res = await op(name, args);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;            // Worker said no (missing token, not allowed…): no retry
      lastErr = e;
      if (attempt === retries) throw new ApiError(e.message);
      await sleep(1000 * 2 ** (attempt - 1));
      continue;
    }
    const status = parseInt(res.headers.get("x-up-status"), 10);
    const label = res.headers.get("x-up-label") || name;
    const text = await res.text();
    if (status < 400) {
      if (!expectJson) return text;
      if (!text) return { success: true };
      try { return JSON.parse(text); }
      catch { throw new ApiError(`${label}: response was not JSON — ${text.slice(0, 300)}`, status, text); }
    }
    if (RETRYABLE.has(status) && attempt < retries) { await sleep(1000 * 2 ** (attempt - 1)); continue; }
    throw new ApiError(`${label}: HTTP ${status} — ${text.slice(0, 500)}`, status, text);
  }
  throw new ApiError(`${name}: all ${retries} attempts failed — ${lastErr && lastErr.message}`);
}

/* ------------------------------------------------------------------ settings (this person's view) */
let settingsCache = null;
export async function loadSettings(force = false) {
  if (!force && settingsCache) return settingsCache;
  if (!force) {
    try {
      const s = JSON.parse(sessionStorage.getItem("erc.settings") || "null");
      if (s && s.at > Date.now() - 60 * 1000) { settingsCache = s.data; return s.data; }
    } catch { /* ignore */ }
  }
  const j = await opJson("settings.get");
  settingsCache = j;
  try { sessionStorage.setItem("erc.settings", JSON.stringify({ at: Date.now(), data: j })); } catch { /* ignore */ }
  return j;
}
export function forgetSettings() { settingsCache = null; try { sessionStorage.removeItem("erc.settings"); } catch { /* ignore */ } }
export const cfg = {
  get: (key) => getSetting(settingsCache ? settingsCache.settings : {}, key),
  int: (key, fb) => getInt(settingsCache ? settingsCache.settings : {}, key, fb),
  bool: (key, fb) => getBool(settingsCache ? settingsCache.settings : {}, key, fb),
  status: () => (settingsCache ? settingsCache.status : {}),
  all: () => (settingsCache ? settingsCache.settings : {}),
  set: (values) => { settingsCache = { ...(settingsCache || {}), settings: { ...((settingsCache || {}).settings || {}), ...values } }; },
  me: () => (settingsCache ? { email: settingsCache.email, admin: settingsCache.admin } : {}),
  spec: SPEC,
};

/* ------------------------------------------------------------------ IndexedDB (runs and fetches survive page changes) */
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open("elite-reports-console", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}
export async function idbGet(key) {
  if (hooks && hooks.idb) return hooks.idb.get(key);
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("kv").objectStore("kv").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function idbSet(key, value) {
  if (hooks && hooks.idb) return hooks.idb.set(key, value);
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("kv", "readwrite");
    t.objectStore("kv").put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
export async function idbDel(key) {
  if (hooks && hooks.idb) return hooks.idb.delete(key);
  const d = await db();
  return new Promise((resolve) => {
    const t = d.transaction("kv", "readwrite");
    t.objectStore("kv").delete(key);
    t.oncomplete = () => resolve();
    t.onerror = () => resolve();
  });
}
export async function idbKeys() {
  if (hooks && hooks.idb) return [...hooks.idb.keys()];
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("kv").objectStore("kv").getAllKeys();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/* ------------------------------------------------------------------ helpers */
export function* chunked(items, size) {
  size = Math.max(1, parseInt(size, 10) || 1);
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
/** Python str.strip() on anything; None/NaN-like -> "". */
export const s = (v) => (v === null || v === undefined ? "" : String(v)).trim();
export const isBlankish = (v) => ["", "nan", "none"].includes(s(v).toLowerCase());

/* ------------------------------------------------------------------ CSV (every value read as text) */
export function parseCsv(text) {
  // RFC 4180 reader; strips a UTF-8 BOM. Returns { columns, rows: [ {col: text} ] } like pd.read_csv(dtype=str).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out = [];
  let row = [], field = "", i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length) { row.push(field); out.push(row); }
  const nonEmpty = out.filter((r) => r.some((x) => x !== ""));
  if (!nonEmpty.length) return { columns: [], rows: [] };
  const columns = dedupeColumns(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map((r) => {
    const o = {};
    columns.forEach((c, k) => { o[c] = r[k] === undefined ? "" : r[k]; });
    return o;
  });
  return { columns, rows };
}
/** pandas renames duplicate headers "A", "A.1", "A.2"…; unnamed ones "Unnamed: n". */
export function dedupeColumns(cols) {
  const seen = {};
  return cols.map((c, k) => {
    let name = c === "" ? `Unnamed: ${k}` : c;
    if (seen[name] !== undefined) { seen[name] += 1; name = `${name}.${seen[name]}`; } else seen[name] = 0;
    return name;
  });
}
export function toCsv(columns, rows) {
  const cell = (v) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;     // pandas QUOTE_MINIMAL
  };
  return [columns.map(cell).join(","), ...rows.map((r) => columns.map((c) => cell(Array.isArray(r) ? r[columns.indexOf(c)] : r[c])).join(","))].join("\n") + "\n";
}
export function downloadText(filename, text, mime = "text/csv") {
  const blob = text instanceof Blob ? text : new Blob([text], { type: `${mime};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ------------------------------------------------------------------ libraries, loaded only when needed */
const LIBS = {
  JSZip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  XLSX: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  ExcelJS: "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
};
const libLoads = {};
export function lib(name) {
  if (window[name]) return Promise.resolve(window[name]);
  if (!libLoads[name]) libLoads[name] = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = LIBS[name];
    el.onload = () => resolve(window[name]);
    el.onerror = () => { delete libLoads[name]; reject(new Error(`Could not load ${name} — check the internet connection and try again.`)); };
    document.head.appendChild(el);
  });
  return libLoads[name];
}
