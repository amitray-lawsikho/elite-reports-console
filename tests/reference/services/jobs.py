# -*- coding: utf-8 -*-
"""
services/jobs.py
================
Background job registry.

Every long operation — a fetch, a report build, a push — is a job: a daemon
thread, a log, a stop flag and a small progress record.

**Why a job keeps its own log rather than a single queue.** The first version
had one ``queue.Queue`` per job that the browser drained over SSE. That works
exactly once: navigating from Reports to Analysis and back drops the stream,
and every line that arrived in between has already been taken out of the queue
by the connection that died — so you come back to an empty log and no way to
tell whether the job is still running. Worse, a second tab watching the same
job would steal lines from the first.

So a job now holds:

  * ``history`` — every line it has written, capped, so a page that arrives
    late (or comes back) is handed the whole log so far;
  * a set of per-subscriber queues — each connected browser gets its own, so
    two tabs can watch the same job and neither starves the other.

``/api/jobs/active`` then lets a page that has just loaded find the job it
should be attached to, which is what makes the log survive a tab switch.
"""

import queue
import threading
import time
import uuid

DONE = "__DONE__"

_lock = threading.Lock()
_jobs = {}

# Finished jobs are kept a while so a browser that reconnects can still read
# the tail of the log, then reaped.
RETAIN_SECONDS = 1800

# Per job. A fetch of 60 pages writes a line a page; this is far more than any
# real run produces, and bounds a runaway job's memory.
MAX_HISTORY = 4000


class Job:
    """One running (or recently finished) background operation."""

    def __init__(self, kind, title):
        self.id = str(uuid.uuid4())
        self.kind = kind
        self.title = title
        self.stop_event = threading.Event()
        self.thread = None
        self.started_at = time.time()
        self.finished_at = None
        self.status = "running"
        self.processed = 0
        self.total = 0
        self.succeeded = 0
        self.failed = 0
        self.errors = []
        self.result = None

        self._lock = threading.Lock()
        self.history = []          # every line, for a browser that joins late
        self._subscribers = set()  # one queue per connected browser

    # -- fan-out ------------------------------------------------------
    def _emit(self, line):
        with self._lock:
            self.history.append(line)
            if len(self.history) > MAX_HISTORY:
                # Drop from the front; the recent lines are the useful ones.
                del self.history[:len(self.history) - MAX_HISTORY]
            subscribers = list(self._subscribers)
        for sub in subscribers:
            try:
                sub.put_nowait(line)
            except Exception:
                pass   # a wedged subscriber must not stall the job

    def subscribe(self):
        """A queue of this job's future lines, plus everything so far."""
        sub = queue.Queue()
        with self._lock:
            backlog = list(self.history)
            self._subscribers.add(sub)
        return sub, backlog

    def unsubscribe(self, sub):
        with self._lock:
            self._subscribers.discard(sub)

    # -- logging ------------------------------------------------------
    def log(self, message):
        self._emit(str(message))

    # Kept so existing call sites that reach for a queue still work.
    @property
    def queue(self):
        return _QueueShim(self)

    def set_total(self, total):
        self.total = int(total or 0)
        self._emit_progress()

    def advance(self, succeeded=0, failed=0, errors=None):
        self.processed += int(succeeded) + int(failed)
        self.succeeded += int(succeeded)
        self.failed += int(failed)
        for err in errors or []:
            if len(self.errors) < 50:
                self.errors.append(str(err))
        self._emit_progress()

    def _emit_progress(self):
        pct = int(self.processed * 100 / self.total) if self.total else 0
        self._emit(f"__PROGRESS__ {pct} {self.processed} {self.total}")

    # -- lifecycle ----------------------------------------------------
    @property
    def stopped(self):
        return self.stop_event.is_set()

    def check_stop(self):
        """True once the operator has pressed Stop. Long loops poll this."""
        if self.stop_event.is_set():
            if self.status == "running":
                self.status = "stopped"
                self.log("Stopped on request.")
            return True
        return False

    def finish(self, status=None, message=None):
        if message:
            self.log(message)
        if status:
            self.status = status
        elif self.status == "running":
            self.status = "done"
        self.finished_at = time.time()
        self._emit(DONE)

    @property
    def running(self):
        return self.thread is not None and self.thread.is_alive()

    def snapshot(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "status": self.status,
            "processed": self.processed,
            "total": self.total,
            "succeeded": self.succeeded,
            "failed": self.failed,
            "errors": self.errors[:20],
            "result": self.result,
            "running": self.running,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


class _QueueShim:
    """``job.queue.put(...)`` kept working after the fan-out rewrite."""

    def __init__(self, job):
        self._job = job

    def put(self, line):
        self._job._emit(line)

    put_nowait = put


# ---------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------
def start(kind, title, target, *args, **kwargs):
    """
    Run ``target(job, *args, **kwargs)`` on a daemon thread and return the Job.

    The target never has to close the job out itself — exceptions are caught,
    logged and turned into a failed status here.
    """
    job = Job(kind, title)

    def runner():
        try:
            target(job, *args, **kwargs)
            if job.status == "running":
                job.status = "done"
        except Exception as exc:  # surfaced to the operator, not swallowed
            job.status = "failed"
            job.log(f"ERROR: {exc}")
            job.errors.append(str(exc))
        finally:
            job.finish()

    thread = threading.Thread(target=runner, daemon=True)
    job.thread = thread

    with _lock:
        _reap()
        _jobs[job.id] = job

    thread.start()
    return job


def get(job_id):
    with _lock:
        return _jobs.get(job_id)


def stop(job_id):
    job = get(job_id)
    if job is None:
        return False
    job.stop_event.set()
    return True


def any_running():
    with _lock:
        return any(j.running for j in _jobs.values())


def active():
    with _lock:
        return [j.snapshot() for j in _jobs.values() if j.running]


def recent(limit=10):
    """Running jobs first, then the most recently finished ones.

    This is what a page asks for the moment it loads: it is how a tab that has
    just come back finds the job it was watching and picks the log back up.
    """
    with _lock:
        jobs = sorted(_jobs.values(),
                      key=lambda j: (not j.running, -(j.finished_at or j.started_at)))
        return [j.snapshot() for j in jobs[:limit]]


def latest_of(kind):
    """The newest job of a kind, running or not."""
    with _lock:
        matches = [j for j in _jobs.values() if j.kind == kind]
    if not matches:
        return None
    return max(matches, key=lambda j: j.started_at)


def _reap():
    """Drop jobs that finished long enough ago that nobody is watching."""
    cutoff = time.time() - RETAIN_SECONDS
    for job_id in [jid for jid, j in _jobs.items()
                   if j.finished_at and j.finished_at < cutoff]:
        _jobs.pop(job_id, None)


def chunked(items, size):
    """Yield ``items`` in lists of at most ``size``."""
    size = max(1, int(size or 1))
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch
