// The three reports, pending lists, Analysis panels and dialer selection — JS against the original Python, on the
// Reports Console's own mock data (tests/reference/tests/mock_run.py). Refresh the recording with
// `python3 tests/reference_run.py` after changing a rule in either.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setHooks, cfg } from "../src/client/core.js";
import { setNowIst } from "../src/client/dates.js";
import * as J from "../src/client/jobs.js";
import * as runs from "../src/client/runs.js";
import * as registry from "../src/client/reports/registry.js";
import * as analysis from "../src/client/analysis.js";
import * as dialers from "../src/client/dialers.js";
import * as sheets from "../src/client/sheets.js";
import * as R from "../src/client/roster.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "reference.json"), "utf8"));
const store = new Map();
setHooks({
  idb: store,
  op: async (name, args) => {
    if (name === "sheet.read") return new Response(REF.sheets[args.key], { headers: { "x-up-status": "200" } });
    if (name === "ozonetel.cdr") {
      const details = args.page_no === 1 ? REF.ozonetel_days[args.day] || [] : [];
      return new Response(JSON.stringify({ status: "success", details, totalCount: details.length }), { headers: { "x-up-status": "200" } });
    }
    throw new Error(`unexpected op ${name}`);
  },
});
const settings = { DOWNLOAD_DATE_FORMAT: "%d/%m/%Y %H:%M:%S", LSQ_ACCESS_KEY: "test", LSQ_SECRET_KEY: "test", OZONETEL_API_KEY: "k",
  OZONETEL_USERNAME: "u", OZONETEL_SLEEP_SECONDS: "0", RULE_DAYS_FOLLOW_UP: "2", RULE_DAYS_COUNSELLED: "2", RULE_DAYS_CALL_BACK: "2",
  DNP_COUNTER: "phone", DNP_OPERATOR: "lt", DNP_VALUE: "4", MCUBE_GETAGENTS_TOKEN: "" };
for (const k of Object.keys(REF.sheets)) settings[k] = `https://fake/${k}`;
for (const k of ["HP_REV_URL_1", "HP_REV_URL_2"]) settings[k] = `https://fake/${k}`;
cfg.set(settings);
setNowIst(REF.now_ist);

const TOKEN = "parity";
/* Ties: pandas sorts with NumPy, whose tie order depends on the machine (SIMD sorting), so tied callers / stages are
   compared in a fixed order: biggest first, then by name. */
const byTotal = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
function normPanel(p) {
  if (!p || p.empty) return p;
  const order = p.categories.map((c, i) => [c, p.totals[i], i]).sort(byTotal).map((x) => x[2]);
  const series = p.series.map((x) => [x.name, x.values.reduce((a, b) => a + b, 0), x]).sort(byTotal).map((x) => x[2]);
  return { ...p, categories: order.map((i) => p.categories[i]), totals: order.map((i) => p.totals[i]),
           series: series.map((x) => ({ name: x.name, values: order.map((i) => x.values[i]) })) };
}
function normTable(t) {
  if (!t || !t.rows || !t.rows.length) return t;
  const cols = t.columns.map((c, k) => [c, t.totals[k], k]).sort(byTotal).map((x) => x[2]);
  const rows = t.rows.map((r) => [r.name, r.total, r]).sort(byTotal).map((x) => x[2]);
  return { ...t, columns: cols.map((k) => t.columns[k]), totals: cols.map((k) => t.totals[k]),
           rows: rows.map((r) => ({ ...r, values: cols.map((k) => r.values[k]) })) };
}
function normAnalysis(a) {
  return { cards: a.cards, breach_mix: a.breach_mix, owner_slots: a.owner_slots,
    panels: Object.fromEntries(Object.entries(a.panels).map(([k, p]) => [k, normPanel(p)])),
    tables: Object.fromEntries(Object.entries(a.tables).map(([k, t]) => [k, normTable(t)])),
    enrollments: a.enrollments.empty ? a.enrollments : { ...a.enrollments, slices: a.enrollments.slices.map((x) => [x.name, x.value, x]).sort(byTotal).map((x) => x[2]) } };
}
const s = (v) => (v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "True" : "False") : String(v));
const built = {};
test.before(async () => {
  sheets.clearCache(); R.clearCache();
  await runs.saveFetch(TOKEN, REF.snapshot, { token: TOKEN, days: 30, basis_label: "Modified On", zip_fields_missing: [] });
  for (const key of registry.ORDER) {
    const job = new J.Job("build", key);
    await registry.run(job, key, TOKEN);
    built[key] = { out: await registry.outputFrame(TOKEN, key), view: await runs.loadReport(TOKEN, key), summary: await runs.reportSummary(TOKEN, key),
                   pending: await registry.pendingFrame(TOKEN, key) };
  }
});

for (const key of Object.keys(REF.reports)) {
  const ref = REF.reports[key];
  test(`${key}: report rows and columns match Python`, () => {
    const js = built[key].out;
    assert.deepEqual(js.columns, ref.columns);
    assert.equal(js.rows.length, ref.rows.length);
    // pandas' sort_values is not stable: rows tied on a date may come out in another order. Compare in a fixed order.
    const line = (r) => ref.columns.map((c) => s(r[c])).join("\u0001");
    assert.deepEqual(js.rows.map(line).sort(), ref.rows.map(line).sort());
  });
  test(`${key}: pending list and summary match Python`, () => {
    assert.deepEqual(built[key].pending.map((r) => Object.fromEntries(Object.keys(r).map((k) => [k, s(r[k])]))), ref.pending);
    for (const [k, v] of Object.entries(ref.summary)) assert.equal(built[key].summary[k], v, k);
  });
  test(`${key}: the dashboard view columns match Python`, () => {
    const line = (r) => Object.keys(ref.view[0]).map((c) => s(r[c])).join("\u0001");
    assert.deepEqual(built[key].view.map(line).sort(), ref.view.map(line).sort());
  });
  test(`${key}: Analysis cards, panels, tables, slicers and lead list match Python`, () => {
    const view = built[key].view;
    const got = normAnalysis(analysis.compute(view, key, {})), want = normAnalysis(ref.analysis);
    for (const k of Object.keys(want)) assert.deepEqual(got[k], want[k], k);
    assert.deepEqual(analysis.options(view, key, {}), ref.options);
    const leads = analysis.leads(view, key, {}, "breached"), line = (r) => JSON.stringify(r);
    assert.equal(leads.total, ref.leads.total);
    assert.deepEqual(leads.rows.map(line).sort(), ref.leads.rows.map(line).sort());
  });
}
test("combined LSQ update CSV matches Python", async () => {
  const js = await registry.combinedPending(TOKEN);
  assert.deepEqual(js.map((r) => Object.fromEntries(Object.keys(r).map((k) => [k, s(r[k])]))), REF.combined_pending);
});
test("dialer counts and selection match Python", async () => {
  const counts = (await dialers.counts(TOKEN)).reports;
  assert.deepEqual(counts, REF.dialer_counts);
  const [leads, stats] = await dialers.select(TOKEN, ["breached", "dnp", "fresh"]);
  assert.deepEqual(stats, REF.dialer_select.stats);
  assert.equal(leads.length, REF.dialer_select.leads.length);
  leads.forEach((l, i) => { for (const [k, v] of Object.entries(REF.dialer_select.leads[i])) assert.equal(s(l[k]), v, `lead ${i} ${k}`); });
});
