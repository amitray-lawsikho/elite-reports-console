/* Port of services/pipeline.py — the four steps on the Reports page, as jobs:
   1 Fetch (LeadSquared, then the Ozonetel calls the master lacks), 2 Build, 3 Update (a download, no job),
   4 Rebuild (fetch again + build everything, ending with "unmatched leads went 312 -> 7"). */
import * as lsqFetch from "./lsq_fetch.js";
import * as oz from "./ozonetel.js";
import * as runs from "./runs.js";
import * as registry from "./reports/registry.js";
import * as incoming from "./reports/incoming.js";

const fmtN = (n) => Number(n).toLocaleString("en-US");

export async function fetch(job, days, basis, withCalls = true) {
  job.put("__STEP__ Fetching from LeadSquared…");
  await lsqFetch.run(job, days, basis);
  const meta = job.result;
  if (!withCalls) return meta;
  job.log("");
  if (!oz.configured()) {
    job.log("Ozonetel is not set up on Setup and Tokens, so Incoming cannot be built until your API key and username are added.");
    meta.ozonetel = { error: "not configured" };
  } else {
    job.put("__STEP__ Fetching sales incoming calls from Ozonetel…");
    try {
      const [, info] = await incoming.prepareCalls(job, meta.token);
      meta.ozonetel = Object.fromEntries(["from", "to", "calls", "numbers", "note", "master_last_day"].map((k) => [k, info[k] ?? null]));
    } catch (e) {
      if (job.stopped) throw e;
      job.log(`ERROR: Ozonetel — ${e.message || e}. The other two reports can still be built; Incoming will try again when it is built.`);
      meta.ozonetel = { error: String(e.message || e) };
    }
  }
  await runs.saveFetchMeta(meta.token, meta);
  job.result = meta;
  return meta;
}

async function pendingByReport(token) {
  const out = {};
  if (!token) return out;
  for (const key of registry.ORDER) { const s = await runs.reportSummary(token, key); if (s) out[key] = parseInt(s.pending || 0, 10); }
  return out;
}

export async function buildAll(job, token, keys = null, before = null, started = null) {
  started = started || Date.now();
  const wanted = registry.ORDER.filter((k) => !keys || keys.includes(k));
  const built = [], failed = [];
  for (let i = 0; i < wanted.length; i++) {
    const module = registry.get(wanted[i]);
    if (job.checkStop()) { job.log(`Stopped — ${module.TITLE} and anything after it were not built.`); break; }
    job.log(`Report ${i + 1} of ${wanted.length} — ${module.TITLE}.`);
    try { built.push([module.KEY, await registry.run(job, module.KEY, token)]); }
    catch (e) {
      if (job.stopped) break;
      failed.push([module.KEY, String(e.message || e)]);
      job.log(`ERROR: ${module.TITLE} could not be built — ${e.message || e}`);
    }
    job.log("");
  }
  conclude(job, token, built, failed, before, started);
}

export async function rebuild(job, days, basis, keys = null) {
  const started = Date.now();
  const before = await pendingByReport(await runs.latestToken());
  const meta = await fetch(job, days, basis);
  job.log("");
  await buildAll(job, meta.token, keys || (Object.keys(before).length ? Object.keys(before) : null), before, started);
}

function conclude(job, token, built, failed, before, started) {
  before = before || {};
  const after = Object.fromEntries(built.map(([k, s]) => [k, parseInt(s.pending || 0, 10)]));
  const totalBefore = built.reduce((a, [k]) => a + (before[k] || 0), 0);
  const totalAfter = Object.values(after).reduce((a, b) => a + b, 0);
  job.log("=".repeat(52));
  for (const [key, s] of built) {
    const was = before[key];
    let line = `${s.title}: ${fmtN(s.rows)} rows, ${fmtN(s.pending)} unmatched`;
    if (was !== undefined && was !== s.pending) line += ` (was ${fmtN(was)})`;
    job.log(line);
  }
  for (const [key, reason] of failed) job.log(`${registry.get(key).TITLE}: not built — ${reason}`);
  if (built.length && Object.keys(before).length && totalBefore) {
    if (totalAfter < totalBefore) job.log(`Unmatched leads went ${fmtN(totalBefore)} -> ${fmtN(totalAfter)}. The LeadSquared update worked.`);
    else if (totalAfter === totalBefore) job.log(`Unmatched leads are unchanged at ${fmtN(totalAfter)}. Either the import has not been applied in LeadSquared yet, or it matched nothing — check that it was imported against mx_Report_Type.`);
    else job.log(`Unmatched leads went UP, ${fmtN(totalBefore)} -> ${fmtN(totalAfter)}. New leads have arrived since the last pass; download the update CSV again.`);
  } else if (totalAfter) job.log(`${fmtN(totalAfter)} lead(s) still need a Report_Type in LeadSquared — step 3.`);
  else if (built.length) job.log("Every lead in every report matched — nothing left to update.");
  const secs = Math.floor((Date.now() - started) / 1000);
  job.log(`Done in ${Math.floor(secs / 60)}m ${secs % 60}s.`);
  if (failed.length && !built.length) job.status = "failed";
  job.result = { token, built: built.map(([k]) => k), failed: failed.map(([key, error]) => ({ key, error })),
    pending_before: totalBefore, pending_after: totalAfter, seconds: Math.round((Date.now() - started) / 100) / 10 };
}
