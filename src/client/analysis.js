/* Port of services/analysis/dashboards.py — the Analysis tab: five panels and three cards, straight off a built report's
   view (its "_" columns). Ties in pandas' orderings are broken by name / first appearance so charts never reshuffle. */
import { cfg } from "./core.js";
import * as B from "./breach.js";
import { breachDays } from "../shared/spec.js";
import { todayIst, fmt, DAY } from "./dates.js";

export const PAGES = {
  chat_email_referral: { owner_label: "Owner", fresh_series: "_type", given_series: "_type", slicers: ["month", "type", "team", "vertical"] },
  incoming: { owner_label: "Owner", fresh_series: "_stage", given_series: null, slicers: ["month", "team", "vertical"] },
  high_priority: { owner_label: "Caller Name", fresh_series: "_stage", given_series: "_stage", slicers: ["month", "team", "vertical", "campaign"] },
};
export const SLICER_COLUMNS = { month: ["_month", "Month of Lead"], type: ["_type", "Type"], team: ["_team", "Team"], vertical: ["_vertical", "Vertical"],
  campaign: ["_campaign", "Campaign"], owner: ["_owner", "Owner"], stage: ["_stage", "Contact Stage"] };
export const pageConfig = (key) => PAGES[String(key || "").trim().toLowerCase()] || PAGES.incoming;
const sv = (v) => (v === null || v === undefined ? "" : String(v));
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const monthKey = (v) => { const m = String(v).toUpperCase().match(/^([A-Z]+)-(\d{4})$/); const i = m ? MONTHS.indexOf(m[1]) : -1; return i < 0 ? null : +m[2] * 12 + i; };
const byNewestMonth = (a, b) => { const x = monthKey(a), y = monthKey(b); if (x === null) return y === null ? 0 : 1; if (y === null) return -1; return y - x; };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** value_counts(): {value: n}, biggest first, ties in first-seen order. */
function valueCounts(values) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Apply the slicers. An empty list for a slicer means "all of them". */
export function select(view, filters = null) {
  filters = filters || {};
  const wanted = Object.entries(SLICER_COLUMNS).map(([name, [col]]) => [col, (filters[name] || []).map(String).filter((v) => v.trim())]).filter(([, w]) => w.length);
  const exStages = (filters.exclude_stages || []).map(String).filter((v) => v.trim());
  const exOwners = (filters.exclude_owners || []).map(String).filter((v) => v.trim());
  return view.filter((r) => wanted.every(([col, w]) => !(col in r) || w.includes(sv(r[col]))) &&
    !(exStages.length && exStages.includes(sv(r._stage))) && !(exOwners.length && exOwners.includes(sv(r._owner))));
}

/** What each slicer can offer, given what the other slicers have picked (a slicer never narrows itself). */
export function options(view, key, filters = null) {
  const page = pageConfig(key);
  filters = filters || {};
  const out = { owner_label: page.owner_label, slicers: [] };
  const has = (col) => view.length > 0 && col in view[0];
  for (const name of [...page.slicers, "owner", "stage"]) {
    const [col, label] = SLICER_COLUMNS[name];
    if (!has(col)) continue;
    const everything = new Set(view.map((r) => sv(r[col])).filter((v) => v.trim()));
    if (!everything.size) continue;
    const others = Object.fromEntries(Object.entries(filters).filter(([k]) => k !== name));
    const counts = Object.fromEntries(valueCounts(select(view, others).map((r) => sv(r[col])).filter((v) => v.trim())));
    const picked = (filters[name] || []).map(String).filter((v) => v.trim());
    let values = [...new Set([...Object.keys(counts), ...picked])].sort(cmp);
    if (name === "month") values = values.map((v, i) => [v, i]).sort((a, b) => byNewestMonth(a[0], b[0]) || b[1] - a[1]).map(([v]) => v);
    out.slicers.push({ key: name, label, values, counts: Object.fromEntries(values.map((v) => [v, counts[v] || 0])), total: everything.size });
  }
  out.default_team = cfg.get("DEFAULT_TEAM") || "";
  out.months = has("_month") ? [...new Set(view.map((r) => sv(r._month)).filter((v) => v.trim()))].sort(cmp).sort(byNewestMonth) : [];
  return out;
}

/** crosstab(owner, series) ordered by row total desc, then column total desc (ties: alphabetical, as crosstab sorts). */
function crosstab(rows, ownerCol, seriesCol) {
  const owners = new Map(), cols = new Set();
  for (const r of rows) {
    const o = sv(r[ownerCol] ?? "(No owner)") || "(No owner)", c = seriesCol ? sv(r[seriesCol]) || "—" : "Leads";
    if (!owners.has(o)) owners.set(o, new Map());
    owners.get(o).set(c, (owners.get(o).get(c) || 0) + 1);
    cols.add(c);
  }
  const ownerNames = [...owners.keys()].sort(cmp), colNames = [...cols].sort(cmp);
  const rowTotal = (o) => [...owners.get(o).values()].reduce((a, b) => a + b, 0);
  const colTotal = (c) => ownerNames.reduce((a, o) => a + (owners.get(o).get(c) || 0), 0);
  const sortedOwners = ownerNames.map((o) => [o, rowTotal(o)]).sort((a, b) => b[1] - a[1]).map(([o]) => o);
  const sortedCols = colNames.map((c) => [c, colTotal(c)]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  return { owners: sortedOwners, cols: sortedCols, cell: (o, c) => owners.get(o).get(c) || 0 };
}
function panel(title, subtitle, rows, seriesCol, ownerCol = "_owner", limit = 25) {
  if (!rows.length) return { title, subtitle, categories: [], series: [], totals: [], total: 0, empty: true };
  const useSeries = seriesCol && rows.length && seriesCol in rows[0];
  let t = crosstab(rows, ownerCol, useSeries ? seriesCol : null);
  let owners = t.owners;
  if (!useSeries) {   // value_counts(): biggest first, ties in first-seen order
    owners = valueCounts(rows.map((r) => sv(r[ownerCol] ?? "(No owner)") || "(No owner)")).map(([o]) => o);
  }
  if (limit && owners.length > limit) owners = owners.slice(0, limit);
  const cols = t.cols.map((c) => [c, owners.reduce((a, o) => a + t.cell(o, c), 0)]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const totals = owners.map((o) => cols.reduce((a, c) => a + t.cell(o, c), 0));
  return { title, subtitle, categories: owners, series: cols.map((c) => ({ name: c, values: owners.map((o) => t.cell(o, c)) })),
           totals, total: totals.reduce((a, b) => a + b, 0), empty: false };
}
export function ownerSlots(view, ownerCol = "_owner", slots = 8) {
  const names = [...new Set(view.map((r) => sv(r[ownerCol])).filter((v) => v.trim()))].sort(cmp);
  return Object.fromEntries(names.map((n, i) => [n, i % slots]));
}
function share(title, rows, ownerCol = "_owner", limit = 12) {
  if (!rows.length) return { title, slices: [], total: 0, empty: true };
  let counts = valueCounts(rows.map((r) => sv(r[ownerCol] ?? "(No owner)") || "(No owner)"));
  if (limit && counts.length > limit) {
    const tail = counts.slice(limit).reduce((a, [, n]) => a + n, 0);
    counts = counts.slice(0, limit);
    if (tail) counts.push(["Others", tail]);
  }
  return { title, slices: counts.map(([name, value]) => ({ name, value })), total: counts.reduce((a, [, n]) => a + n, 0), empty: false };
}
function matrix(rows, ownerCol = "_owner", seriesCol = "_stage") {
  if (!rows.length) return { columns: [], rows: [] };
  const t = crosstab(rows, ownerCol, seriesCol);
  const out = t.owners.map((o) => { const values = t.cols.map((c) => t.cell(o, c)); return { name: o, values, total: values.reduce((a, b) => a + b, 0) }; });
  const totals = t.cols.map((c) => t.owners.reduce((a, o) => a + t.cell(o, c), 0));
  return { columns: t.cols, rows: out, totals, total: totals.reduce((a, b) => a + b, 0) };
}
export function breachedCaption(days = null, today = null) {
  days = days || breachDays(cfg.all());
  const values = new Set(Object.values(days));
  if (values.size === 1) {
    const n = Math.trunc([...values][0]);
    const since = (today !== null ? today : todayIst()) - n * DAY;
    return `Not dialled in the past ${n} day${n !== 1 ? "s" : ""} (since ${fmt(since, "%d %b %Y")}) or follow-up overdue`;
  }
  return "Not dialled within " + Object.entries(days).map(([k, v]) => `${k} ${v}d`).join(", ");
}
const pickRows = (rows, mask) => rows.filter((_, i) => mask[i]);

export function compute(view, key, filters = null) {
  const page = pageConfig(key);
  const rows = select(view, filters);
  const fresh = pickRows(rows, B.freshMask(rows)), dnp = pickRows(rows, B.dnpMask(rows)), breached = pickRows(rows, B.breachedMask(rows));
  const enrolled = rows.filter((r) => r._stage === B.ENROLLED_STAGE);
  const total = rows.length;
  return {
    owner_slots: ownerSlots(view),
    cards: { total, enrolled: enrolled.length, conversion: total ? Math.round((enrolled.length * 1000) / total) / 10 : 0,
             breached: breached.length, fresh: fresh.length, dnp: dnp.length, owners: total ? new Set(rows.map((r) => sv(r._owner))).size : 0 },
    breach_mix: Object.fromEntries(valueCounts(breached.map((r) => sv(r._stage)))),
    dnp_caption: B.dnpCaption(),
    breach_days: breachDays(cfg.all()),
    panels: { fresh: panel("Fresh leads", "Not yet worked", fresh, page.fresh_series), dnp: panel("Breached DNP leads", B.dnpCaption(), dnp, "_stage"),
              breached: panel("Breached leads", breachedCaption(), breached, "_stage"), given: panel("Leads given", "Everything in this selection", rows, page.given_series) },
    enrollments: share("Actual enrollments", enrolled),
    tables: { fresh: matrix(fresh), dnp: matrix(dnp), breached: matrix(breached, "_owner", "_follow_up"), given: matrix(rows) },
  };
}

const display = (v) => (v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "True" : "False") : String(v));
/** The rows behind a panel, for the table under the charts. */
export function leads(view, key, filters = null, panelName = "breached", search = "", limit = 500) {
  let rows = select(view, filters);
  if (panelName === "fresh") rows = pickRows(rows, B.freshMask(rows));
  else if (panelName === "dnp") rows = pickRows(rows, B.dnpMask(rows));
  else if (panelName === "breached") rows = pickRows(rows, B.breachedMask(rows));
  else if (panelName === "enrolled") rows = rows.filter((r) => r._stage === B.ENROLLED_STAGE);
  const ownerFilter = (filters || {}).panel_owner;
  if (ownerFilter) rows = rows.filter((r) => sv(r._owner) === String(ownerFilter));
  const q = String(search || "").trim().toLowerCase();
  if (q) rows = rows.filter((r) => Object.keys(r).some((c) => (!c.startsWith("_") || ["_owner", "_stage", "_campaign"].includes(c)) && display(r[c]).toLowerCase().includes(q)));
  const total = rows.length;
  rows = rows.slice(0, parseInt(limit, 10) || 500);
  const pick = (r, ...names) => { for (const n of names) if (n in r) return display(r[n]); return ""; };
  const out = rows.map((r) => ({ owner: sv(r._owner), lead: pick(r, "Name", "Lead Name", "First Name"), phone: pick(r, "Lead_Phone_Number", "Phone Number", "Phone no"),
    stage: sv(r._stage), follow_up: sv(r._follow_up), last_called: pick(r, "Last Called date", "Last Called Date"), next_follow_up: pick(r, "Next Follow Up Date"),
    calls: String(Math.trunc(Number(r._dial_count) || 0)), why: sv(r._reason), zip_intent: pick(r, "Zip Intent"), zip_justification: pick(r, "Zip Intent Justification") }));
  return { rows: out, total, shown: out.length };
}

export const PANEL_ORDER = [["fresh", "Fresh leads"], ["dnp", "Breached DNP"], ["breached", "Breached leads"], ["given", "Total distribution"]];
/** The workbook for the current selection: a Leads sheet + the four Data view tables. Returns { sheets: [{name, columns, rows, freeze}] , count }. */
export function exportSheets(view, key, moduleColumns, filters = null) {
  const page = pageConfig(key);
  const rows = select(view, filters);
  const result = compute(view, key, filters);
  const fresh = B.freshMask(rows), dnp = B.dnpMask(rows), breached = B.breachedMask(rows);
  const cols = moduleColumns.filter((c) => rows.length && c in rows[0]);
  const leadRows = rows.map((r, i) => {
    let category = "";
    if (fresh[i]) category = "Fresh";
    if (dnp[i]) category = "Breached DNP";
    if (breached[i]) category = "Breached";
    if (r._stage === B.ENROLLED_STAGE) category = "Enrolled";
    const o = Object.fromEntries(cols.map((c) => [c, r[c] ?? ""]));
    Object.assign(o, { Category: category, "Why (breach reason)": r._reason ?? "", Team: r._team, Vertical: r._vertical });
    return o;
  });
  const leadCols = [...cols.filter((c) => !["Category", "Why (breach reason)", "Team", "Vertical"].includes(c)), "Category", "Why (breach reason)", "Team", "Vertical"];
  // pandas keeps a report's own Team column in its place (and overwrites it); match that
  const ordered = [...cols, ...["Category", "Why (breach reason)", "Team", "Vertical"].filter((c) => !cols.includes(c))];
  const sheets = [{ name: "Leads", columns: ordered.length ? ordered : leadCols, rows: leadRows, freeze: "A2" }];
  for (const [name, title] of PANEL_ORDER) {
    const t = result.tables[name];
    if (!t || !t.rows.length) continue;
    const columns = [page.owner_label, ...t.columns, "Total"];
    const body = t.rows.map((r) => Object.fromEntries(columns.map((c, k) => [c, k === 0 ? r.name : k <= t.columns.length ? r.values[k - 1] : r.total])));
    body.push(Object.fromEntries(columns.map((c, k) => [c, k === 0 ? "Total" : k <= t.columns.length ? t.totals[k - 1] : t.total])));
    sheets.push({ name: title.slice(0, 31), columns, rows: body, freeze: "B2" });
  }
  return { sheets, count: leadRows.length };
}
