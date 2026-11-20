/* Port of services/sheets.py. Reads the published Google Sheets the reports join against (through the Worker, by the
   setting that holds the link — the browser never chooses the URL) and pushes a finished report to its Apps Script.
   Reads are cached for CACHE_TTL per link, so one build that wants the revenue tracker three times fetches it once. */
import { cfg, op, parseCsv } from "./core.js";

const CACHE_TTL = 180 * 1000;
const cache = new Map();          // setting key -> { at, table }

export function clearCache() { cache.clear(); }

/** sheets.read_csv(config.get(key)): { columns, rows } with every value as text. */
export async function readCsv(key, label = null, { force = false } = {}) {
  const name = label || "a linked sheet";
  if (!cfg.get(key)) throw new Error(`No link is set for ${name}. Open Settings and paste it.`);
  const hit = cache.get(key);
  if (hit && !force && Date.now() - hit.at < CACHE_TTL) return copy(hit.table);
  let res;
  try { res = await op("sheet.read", { key }); }
  catch (e) { throw new Error(`Could not read ${name}: ${e.message || e}`); }
  const status = parseInt(res.headers.get("x-up-status"), 10);
  const body = await res.text();
  if (!(status >= 200 && status < 300)) throw new Error(`Could not read ${name}: ${status} — ${body.slice(0, 200)}`);
  const head = body.slice(0, 400).trimStart().toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
    throw new Error(`${name} did not return CSV — the link is probably not published to the web, or points at the sheet's normal view. ` +
                    "Use File → Share → Publish to web (CSV), or an export?format=csv link.");
  }
  let table;
  try { table = parseCsv(body); } catch (e) { throw new Error(`Could not read ${name} as a CSV: ${e.message || e}`); }
  // columns stripped; two columns with the same head after stripping: the first wins
  const seen = new Set(), keep = [];
  for (const c of table.columns) { const t = String(c).trim(); if (!seen.has(t)) { seen.add(t); keep.push([c, t]); } }
  table = { columns: keep.map(([, t]) => t), rows: table.rows.map((r) => Object.fromEntries(keep.map(([c, t]) => [t, r[c]]))) };
  cache.set(key, { at: Date.now(), table });
  return copy(table);
}
const copy = (t) => ({ columns: [...t.columns], rows: t.rows.map((r) => ({ ...r })) });

/** sheets.push(): POST [[headers], [row]…] (every cell a string) to the report's Apps Script, optionally in chunks. */
export async function push(key, columns, rows, { label = null, log = null, stop = null } = {}) {
  const name = label || "the Google Sheet";
  if (!cfg.get(key)) throw new Error(`No Apps Script link is set for ${name}. Open Settings and paste it.`);
  const cell = (v) => (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? "" : String(v));
  const header = columns.map(String);
  const body = rows.map((r) => columns.map((c) => cell(r[c])));
  const chunk = Math.max(0, cfg.int("PUSH_CHUNK_ROWS", 0));
  const send = async (payload, note) => {
    const res = await op("sheet.push", { key, rows: payload });
    const status = parseInt(res.headers.get("x-up-status"), 10);
    const reply = await res.text();
    if (status !== 200) throw new Error(`${name} refused the push — HTTP ${status}: ${reply.slice(0, 300)}`);
    if (log) log(`${note} — Google replied: ${reply.trim().slice(0, 200) || "OK"}`);
    return reply;
  };
  if (log) log(`Pushing ${body.length.toLocaleString("en-US")} row(s) and ${header.length} column(s) to ${name}…`);
  if (!chunk || body.length <= chunk) {
    const reply = await send([header, ...body], "Pushed in one request");
    return { rows: body.length, requests: 1, reply: reply.slice(0, 400) };
  }
  let sent = 0, made = 0, reply = "";
  for (let start = 0; start < body.length; start += chunk) {
    if (stop && stop()) throw new Error(`Push stopped after ${sent.toLocaleString("en-US")} row(s) — the sheet is now partial.`);
    const batch = body.slice(start, start + chunk);
    reply = await send(start === 0 ? [header, ...batch] : batch, `Rows ${(start + 1).toLocaleString("en-US")}–${(start + batch.length).toLocaleString("en-US")}`);
    sent += batch.length; made += 1;
  }
  return { rows: sent, requests: made, reply: reply.slice(0, 400) };
}
