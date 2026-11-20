/* Port of services/roster.py — the caller roster (Caller Name, Team Name, Vertical, Email id) from the sheet in
   ROSTER_URL, cached for five minutes. Owners matching no roster row are kept under "Others", never dropped. */
import * as sheets from "./sheets.js";
import { requireColumns } from "./frame.js";

export const REQUIRED_COLS = ["Caller Name", "Team Name"];
export const OPTIONAL_COLS = ["Vertical", "Email id", "Analyst", "Sales Leader"];
export const OTHERS = "Others";
const CACHE_TTL = 300 * 1000;
let cache = { roster: null, at: 0 };

export function normaliseName(name) {
  if (name === null || name === undefined) return "";
  const t = String(name).trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** roster.load(): array of { "Caller Name", "Team Name", Vertical, "Email id", Analyst, "Sales Leader" }. */
export async function load(force = false) {
  if (cache.roster && !force && Date.now() - cache.at < CACHE_TTL) return cache.roster.map((r) => ({ ...r }));
  let t = await sheets.readCsv("ROSTER_URL", "the roster sheet", { force });
  const rename = (from, to) => { t = { columns: t.columns.map((c) => (c === from ? to : c)), rows: t.rows.map((r) => { const o = { ...r }; if (from in o) { o[to] = o[from]; if (from !== to) delete o[from]; } return o; }) }; };
  for (const c of [...t.columns]) { const flat = String(c).replace(/\s+/g, " ").trim(); if (flat !== c) rename(c, flat); }
  if (!t.columns.includes("Vertical")) {
    const lower = Object.fromEntries(t.columns.map((c) => [c.toLowerCase(), c]));
    for (const opt of ["verticals", "vertical name", "vertical"]) if (lower[opt]) { rename(lower[opt], "Vertical"); break; }
  }
  requireColumns(t, REQUIRED_COLS, "The roster sheet");
  const rows = t.rows.map((r) => {
    const o = {};
    for (const c of [...REQUIRED_COLS, ...OPTIONAL_COLS]) o[c] = String(r[c] ?? "").trim();
    return o;
  }).filter((r) => r["Caller Name"] !== "");
  cache = { roster: rows, at: Date.now() };
  return rows.map((r) => ({ ...r }));
}
export function clearCache() { cache = { roster: null, at: 0 }; sheets.clearCache(); }

/** normalised caller name -> { caller, team, vertical, email }; the first row for a name wins. */
export function makeIndex(roster) {
  const out = new Map();
  for (const r of roster) {
    const k = normaliseName(r["Caller Name"]);
    if (k && !out.has(k)) out.set(k, { caller: r["Caller Name"], team: r["Team Name"] || OTHERS, vertical: r.Vertical || OTHERS, email: r["Email id"] || "" });
  }
  return out;
}
/** roster.attach(): Verticals and Team from the owner column (unmatched -> Others). Mutates and returns the rows. */
export function attach(rows, ownerColumn, roster) {
  const lookup = makeIndex(roster);
  for (const r of rows) {
    const hit = lookup.get(normaliseName(r[ownerColumn] ?? ""));
    r.Verticals = hit ? hit.vertical : OTHERS;
    r.Team = hit ? hit.team : OTHERS;
  }
  return rows;
}
export const emailFor = (name, roster) => (makeIndex(roster).get(normaliseName(name)) || {}).email || "";
