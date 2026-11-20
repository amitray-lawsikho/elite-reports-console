/* Port of services/jobs.py. A job runs in this tab (there is no server thread any more), and talks to the
   page through the same messages the old SSE stream carried: log lines, "__PROGRESS__ pct done total",
   "__COUNT__ rows page" and "__DONE__". The page's JobStream reads them through the EventSource shim. */
import { uuid } from "./core.js";

export const DONE = "__DONE__";
const jobs = new Map();

export class Job {
  constructor(kind, title) {
    Object.assign(this, { id: uuid(), kind, title, messages: [], listeners: new Set(), stopRequested: false,
      startedAt: Date.now(), finishedAt: null, status: "running", processed: 0, total: 0, succeeded: 0, failed: 0,
      errors: [], result: null, running: true });
  }
  put(message) {
    this.messages.push(String(message));
    for (const fn of this.listeners) { try { fn(String(message)); } catch { /* ignore */ } }
  }
  log(message) { this.put(message); }
  setTotal(total) { this.total = parseInt(total, 10) || 0; this.emitProgress(); }
  advance({ succeeded = 0, failed = 0, errors = null } = {}) {
    this.processed += succeeded + failed;
    this.succeeded += succeeded;
    this.failed += failed;
    for (const e of errors || []) if (this.errors.length < 50) this.errors.push(String(e));
    this.emitProgress();
  }
  emitProgress() {
    const pct = this.total ? Math.trunc((this.processed * 100) / this.total) : 0;
    this.put(`__PROGRESS__ ${pct} ${this.processed} ${this.total}`);
  }
  get stopped() { return this.stopRequested; }
  checkStop() {
    if (this.stopRequested) {
      if (this.status === "running") { this.status = "stopped"; this.log("Stopped on request."); }
      return true;
    }
    return false;
  }
  finish(status = null, message = null) {
    if (this.finishedAt) return;
    if (message) this.log(message);
    if (status) this.status = status;
    else if (this.status === "running") this.status = "done";
    this.finishedAt = Date.now();
    this.running = false;
    this.put(DONE);
    updateGuard();
  }
  snapshot() {
    return { id: this.id, kind: this.kind, title: this.title, status: this.status, processed: this.processed, total: this.total,
             succeeded: this.succeeded, failed: this.failed, errors: this.errors.slice(0, 20), result: this.result, running: this.running,
             started_at: this.startedAt / 1000, finished_at: this.finishedAt ? this.finishedAt / 1000 : null };
  }
}

/** Run target(job, ...args) in the background; exceptions become a failed job, like jobs.start. */
export function start(kind, title, target, ...args) {
  const job = new Job(kind, title);
  job.queue = { put: (line) => job.put(line) };   // job.queue.put(...) as in the Python
  jobs.set(job.id, job);
  updateGuard();
  (async () => {
    try {
      await target(job, ...args);
      if (job.status === "running") job.status = "done";
    } catch (e) {
      job.status = "failed";
      job.log(`ERROR: ${e.message || e}`);
      job.errors.push(String(e.message || e));
    } finally {
      job.finish();
    }
  })();
  return job;
}
export const get = (id) => jobs.get(id) || null;
export function stop(id) { const j = jobs.get(id); if (!j) return false; j.stopRequested = true; return true; }
export const active = () => [...jobs.values()].filter((j) => j.running).map((j) => j.snapshot());
export const anyRunning = () => [...jobs.values()].some((j) => j.running);
/** Running jobs first, then the most recently finished ones (jobs.recent). */
export const recent = (limit = 10) => [...jobs.values()]
  .sort((a, b) => (a.running === b.running ? (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt) : a.running ? -1 : 1))
  .slice(0, limit).map((j) => j.snapshot());
export function latestOf(kind) {
  const of = [...jobs.values()].filter((j) => j.kind === kind).sort((a, b) => b.startedAt - a.startedAt);
  return of[0] || null;
}

/* While a job runs, leaving or reloading the page would stop it (it lives in this tab): ask first. */
function guard(e) { e.preventDefault(); e.returnValue = "A push / delete / fetch is still running in this tab. Leaving stops it."; return e.returnValue; }
let guarded = false;
function updateGuard() {
  if (typeof window === "undefined") return;
  const running = [...jobs.values()].some((j) => j.running);
  if (running && !guarded) { window.addEventListener("beforeunload", guard); guarded = true; }
  if (!running && guarded) { window.removeEventListener("beforeunload", guard); guarded = false; }
}
