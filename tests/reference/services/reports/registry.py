# -*- coding: utf-8 -*-
"""
services/reports/registry.py
============================
The three reports as one list, and the job that builds any of them.

Adding a fourth report means writing one module with ``build()``, ``pending()``
and a ``COLUMNS`` list, then adding a line here — the page, the downloads, the
push, the pending-update CSV and the dashboards all pick it up without further
changes.
"""

from datetime import datetime

import pandas as pd

import config
from services import breach, lsq_fetch, sheets
from services import runs as storage
from services.reports import chat_email_referral, high_priority, incoming

MODULES = [chat_email_referral, incoming, high_priority]
BY_KEY = {module.KEY: module for module in MODULES}
ORDER = [module.KEY for module in MODULES]


def get(key):
    module = BY_KEY.get(str(key or "").strip().lower())
    if module is None:
        raise ValueError(f"Unknown report: {key!r}")
    return module


def describe(module):
    return {
        "key": module.KEY,
        "title": module.TITLE,
        "subtitle": module.SUBTITLE,
        "report_type": module.REPORT_TYPE,
        "needs_upload": module.NEEDS_UPLOAD,
        "columns": list(module.COLUMNS) + ["Zip Intent", "Zip Intent Justification"],
        "push_configured": bool(config.get(module.PUSH_SETTING)),
        "filename": module.FILENAME,
    }


def catalogue():
    return [describe(BY_KEY[key]) for key in ORDER]


# ---------------------------------------------------------------------
# Building
# ---------------------------------------------------------------------
def run(job, key, token, upload_path=None, refresh_sources=False):
    """Build one report (see ``_run``), marking the step for the page."""
    job.queue.put(f"__STEP__ Building {get(key).TITLE}…")
    return _run(job, key, token, refresh_sources)


def current_rules():
    """The breach days and DNP rule a build uses — shown back on the page."""
    return {"breach_days": config.breach_days(), "dnp": breach.dnp_rule(),
            "dnp_caption": breach.dnp_caption()}


def _run(job, key, token, refresh_sources=False):
    """
    Build one report from a fetch and park it under the same token.

    The report frame (what gets downloaded and pushed) and the dashboard view
    (the same rows plus the internal ``_`` columns) are saved together, so the
    ANALYSIS tab never has to rebuild anything to draw a chart.
    """
    module = get(key)
    started = datetime.now()

    if refresh_sources:
        job.log("Re-reading every linked sheet rather than using the cached copies.")
        sheets.clear_cache()

    frame = storage.load_frame(token)
    meta = storage.load_meta(token) or {}
    job.log(f"Using the fetch of {meta.get('days', '?')} day(s) "
            f"on {meta.get('basis_label', '?')} — {len(frame):,} lead(s).")

    tagged = lsq_fetch.tagged_only(frame)
    job.log(f"{len(tagged):,} of those carry a Report_Type and are what this report matches "
            "against.")
    if not len(tagged):
        raise ValueError(
            "No lead in this fetch has a Report_Type set, so nothing can be matched. "
            "Check that mx_Report_Type is populated in LeadSquared, then fetch again."
        )

    if "_follow_up_dt" not in tagged.columns:
        job.log("This snapshot was fetched before the follow-up date was added — "
                "fetch again for the full breach rule.")
        tagged["_follow_up_dt"] = pd.NaT

    rules = current_rules()
    days = ", ".join(f"{stage} {n}d" for stage, n in rules["breach_days"].items())
    job.log(f"Breached days: {days}. Less-dialled DNP: {rules['dnp_caption']}.")

    if module.KEY == "incoming":
        out, view, summary = module.build(job, tagged, force=refresh_sources, token=token)
    else:
        out, view, summary = module.build(job, tagged, force=refresh_sources)

    waiting = module.pending(out, view)
    summary.update({
        "key": module.KEY,
        "title": module.TITLE,
        "report_type": module.REPORT_TYPE,
        "rows": int(len(out)),
        "columns": list(out.columns),
        "pending": int(len(waiting)),
        "built_at": datetime.now().isoformat(),
        "seconds": round((datetime.now() - started).total_seconds(), 1),
        "token": token,
        "fetch_days": meta.get("days"),
        "fetch_basis": meta.get("basis_label"),
        "zip_fields_missing": meta.get("zip_fields_missing") or [],
        "rules": rules,
    })

    # The view carries the output columns too, so one pickle serves downloads,
    # the pending list and every chart.
    for column in out.columns:
        if column not in view.columns:
            view[column] = out[column]
    storage.save_report(token, module.KEY, view, summary)
    storage.save_report(token, f"{module.KEY}__pending", waiting,
                        {"rows": int(len(waiting)), "report": module.KEY})

    if summary["pending"]:
        job.log(f"{summary['pending']:,} lead(s) could not be matched. Download the LSQ update "
                f"CSV, set Report_Type to '{module.REPORT_TYPE}' in LeadSquared, fetch again "
                "and rebuild.")
    else:
        job.log("Every lead matched — nothing to update in LeadSquared.")

    if summary.get("zip_fields_missing"):
        job.log("NOTE: " + ", ".join(summary["zip_fields_missing"]) +
                " are not on this LeadSquared account, so the two Zip Intent columns are blank.")

    job.log(f"Done — {len(out):,} row(s) ready to download or push.")
    job.result = summary


def output_frame(token, key):
    """Just the report's own columns, in order, for download and push."""
    module = get(key)
    view = storage.load_report(token, module.KEY)
    columns = [c for c in module.COLUMNS if c in view.columns]
    columns += [c for c in ("Zip Intent", "Zip Intent Justification") if c in view.columns]
    return view[columns].fillna("")


def pending_frame(token, key):
    try:
        return storage.load_report(token, f"{get(key).KEY}__pending")
    except FileNotFoundError:
        return pd.DataFrame(columns=["Phone Number", "Prospect ID", "Email", "Report_Type"])


def combined_pending(token):
    """
    Every report's unmatched leads in one CSV for the LeadSquared import.

    High Priority rows are keyed on Prospect ID and the other two on Phone
    Number, which is why both columns are present: the importer matches on
    whichever is filled.
    """
    parts = []
    for key in ORDER:
        frame = pending_frame(token, key)
        if len(frame):
            parts.append(frame)
    if not parts:
        return pd.DataFrame(columns=["Phone Number", "Prospect ID", "Email", "Report_Type"])
    out = pd.concat(parts, ignore_index=True).fillna("")
    # A lead can legitimately appear under two report types; the same lead
    # under the same type twice is noise.
    return out.drop_duplicates(subset=["Phone Number", "Prospect ID", "Report_Type"])
