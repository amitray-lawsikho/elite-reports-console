# -*- coding: utf-8 -*-
"""
services/pipeline.py
====================
The four steps on the Reports page, as jobs.

  1. Fetch      LeadSquared, then the Ozonetel sales incoming calls the
                Incoming master sheet does not have yet.
  2. Build      all three reports from that snapshot, with the breached days
                and DNP rule chosen in the dialog.
  3. Update     (no job) download the unmatched leads' CSV, import it into
                LeadSquared against mx_Report_Type.
  4. Rebuild    fetch again and rebuild every report, ending with the one
                number that says whether the import landed:

                    unmatched went 312 -> 7

Nothing is thrown away if a single report fails: the others still build and
the failure is named in the log.
"""

import time

from services import lsq_fetch, ozonetel
from services import runs as storage
from services.reports import incoming, registry


def fetch(job, days, basis, with_calls=True):
    """LeadSquared, then Ozonetel. Returns the fetch meta."""
    job.queue.put("__STEP__ Fetching from LeadSquared…")
    lsq_fetch.run(job, days, basis)
    meta = job.result
    token = meta["token"]

    if not with_calls:
        return meta
    job.log("")
    if not ozonetel.configured():
        job.log("Ozonetel is not set up in Settings, so Incoming cannot be built "
                "until the API key and username are added.")
        meta["ozonetel"] = {"error": "not configured"}
    else:
        job.queue.put("__STEP__ Fetching sales incoming calls from Ozonetel…")
        try:
            _calls, info = incoming.prepare_calls(job, token)
            meta["ozonetel"] = {k: info.get(k) for k in
                                ("from", "to", "calls", "numbers", "note", "master_last_day")}
        except Exception as exc:
            if job.stopped:
                raise
            job.log(f"ERROR: Ozonetel — {exc}. The other two reports can still be built; "
                    "Incoming will try again when it is built.")
            meta["ozonetel"] = {"error": str(exc)}
    storage.save_fetch_meta(token, meta)
    job.result = meta
    return meta


def _pending_by_report(token):
    out = {}
    if not token:
        return out
    for key in registry.ORDER:
        summary = storage.report_summary(token, key)
        if summary:
            out[key] = int(summary.get("pending") or 0)
    return out


def build_all(job, token, keys=None, before=None, started=None):
    """Build each report in ``keys`` (all three by default) from ``token``."""
    started = started or time.time()
    wanted = [k for k in registry.ORDER if not keys or k in set(keys)]
    built, failed = [], []
    for number, key in enumerate(wanted, start=1):
        module = registry.get(key)
        if job.check_stop():
            job.log(f"Stopped — {module.TITLE} and anything after it were not built.")
            break
        job.log(f"Report {number} of {len(wanted)} — {module.TITLE}.")
        try:
            registry.run(job, key, token)
            built.append((key, job.result))
        except Exception as exc:
            if job.stopped:
                break
            failed.append((key, str(exc)))
            job.log(f"ERROR: {module.TITLE} could not be built — {exc}")
        job.log("")

    _conclude(job, token, built, failed, before, started)


def rebuild(job, days, basis, keys=None):
    """Step 4: fetch again with the same settings and rebuild everything."""
    started = time.time()
    before = _pending_by_report(storage.latest_token())
    meta = fetch(job, days, basis)
    job.log("")
    build_all(job, meta["token"], keys=keys or (list(before) or None),
              before=before, started=started)


def _conclude(job, token, built, failed, before, started):
    before = before or {}
    after = {key: int(summary.get("pending") or 0) for key, summary in built}
    total_before = sum(before.get(key, 0) for key, _ in built)
    total_after = sum(after.values())

    job.log("=" * 52)
    for key, summary in built:
        was = before.get(key)
        line = f"{summary['title']}: {summary['rows']:,} rows, {summary['pending']:,} unmatched"
        if was is not None and was != summary["pending"]:
            line += f" (was {was:,})"
        job.log(line)
    for key, reason in failed:
        job.log(f"{registry.get(key).TITLE}: not built — {reason}")

    if built and before and total_before:
        if total_after < total_before:
            job.log(f"Unmatched leads went {total_before:,} -> {total_after:,}. "
                    "The LeadSquared update worked.")
        elif total_after == total_before:
            job.log(f"Unmatched leads are unchanged at {total_after:,}. Either the "
                    "import has not been applied in LeadSquared yet, or it matched "
                    "nothing — check that it was imported against mx_Report_Type.")
        else:
            job.log(f"Unmatched leads went UP, {total_before:,} -> {total_after:,}. "
                    "New leads have arrived since the last pass; download the update "
                    "CSV again.")
    elif total_after:
        job.log(f"{total_after:,} lead(s) still need a Report_Type in LeadSquared — "
                "step 3.")
    elif built:
        job.log("Every lead in every report matched — nothing left to update.")

    mins, secs = divmod(int(time.time() - started), 60)
    job.log(f"Done in {mins}m {secs}s.")
    if failed and not built:
        job.status = "failed"
    job.result = {
        "token": token,
        "built": [key for key, _ in built],
        "failed": [{"key": key, "error": reason} for key, reason in failed],
        "pending_before": total_before,
        "pending_after": total_after,
        "seconds": round(time.time() - started, 1),
    }
