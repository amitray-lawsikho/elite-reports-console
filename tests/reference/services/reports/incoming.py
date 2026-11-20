# -*- coding: utf-8 -*-
"""
services/reports/incoming.py
============================
Incoming leads.

Starts from the sales incoming calls fetched from the Ozonetel API — every
day from the master sheet's newest Call Date up to today — merged with the
master sheet of calls already recorded. One row per caller number — the most
recent call wins, its Status included — then LeadSquared supplies the stage,
owner, last call, follow-up and counters, and the enrollment tracker supplies
the conversions.

A number the snapshot has never heard of comes out with ``#NA`` in
Contact_Stage and lands on the pending list: set its Report_Type in
LeadSquared to ``Incoming``, fetch again, rebuild.
"""

import pandas as pd

import config
from services import breach, ozonetel, roster, sheets
from services import runs as storage
from services.reports import base

KEY = "incoming"
TITLE = "Incoming Leads"
SUBTITLE = "Sales incoming calls from the Ozonetel API, merged with the master sheet and resolved against LeadSquared."
REPORT_TYPE = "Incoming"
NEEDS_UPLOAD = None

COLUMNS = [
    "Campaign", "Phone Number", "Call Date", "Call Flow", "Status",
    "Contact_Stage", "Owner", "Last Called Date", "Next Follow Up Date", "Follow Up Status",
    "Phone call counter", "Phone call counter formula",
    "Enrollment Tracker", "Owner According to Rev Sheet",
    "Verticals", "Team", "Comment LSQ", "Comment Analysis",
    "Assigned On Call Counter", "Assigned On Call Counter Formula",
]

PUSH_SETTING = "INCOMING_PUSH_URL"
FILENAME = "Incoming_Report"

NA = "#NA"


def read_master(force=False):
    """The master call history, in the report's own columns."""
    master = sheets.read_csv(config.require("INCOMING_MASTER_URL", "Incoming master sheet"),
                             label="the Incoming master sheet", force=force).copy()
    master_phone = sheets.first_column(master, "Phone Number", "Caller No", "Phone")
    master_date = sheets.first_column(master, "Call Date", "Date")
    if master_phone is None or master_date is None:
        raise ValueError("The Incoming master sheet needs a phone column and a Call Date column.")
    master["Phone Number"] = base.phones(master[master_phone])
    master["Call Date"] = pd.to_datetime(master[master_date], errors="coerce", dayfirst=True)
    for column in ("Campaign", "Call Flow", "Status", "Comment LSQ", "Comment Analysis"):
        if column not in master.columns:
            master[column] = ""
    return master[["Campaign", "Phone Number", "Call Date", "Call Flow", "Status",
                   "Comment LSQ", "Comment Analysis"]]


def last_report_day(master):
    """The newest Call Date in the master — the day the report was last prepared.

    A date in the future is a typo in the sheet, not the last report."""
    stamps = master["Call Date"].dropna()
    stamps = stamps[stamps <= pd.Timestamp.now() + pd.Timedelta(days=1)]
    return stamps.max().normalize() if len(stamps) else None


def prepare_calls(job, token, force=False):
    """
    Fetch the sales incoming calls the master sheet does not have yet and park
    them under the fetch token, so a build or rebuild reads them from there.
    """
    master = read_master(force=force)
    last = last_report_day(master)
    job.log(f"Incoming master sheet: {len(master):,} call(s), newest "
            f"{last:%d %b %Y}." if last is not None else
            f"Incoming master sheet: {len(master):,} call(s), no readable Call Date.")
    calls, info = ozonetel.collect(job, last)
    info["master_last_day"] = last.strftime("%Y-%m-%d") if last is not None else None
    storage.save_report(token, "ozonetel_calls", calls, info)
    return calls, info


def build(job, lsq, upload_path=None, force=False, token=None):
    log = job.log

    # ---------------------------------------------------------- calls
    calls, info = None, None
    if token:
        try:
            calls = storage.load_report(token, "ozonetel_calls")
            info = storage.report_summary(token, "ozonetel_calls") or {}
            log(f"Using the Ozonetel calls fetched with this snapshot: "
                f"{info.get('from')} to {info.get('to')}.")
        except FileNotFoundError:
            calls = None
    if calls is None:
        log("No Ozonetel calls with this snapshot yet — fetching them now.")
        calls, info = prepare_calls(job, token, force=force) if token else (None, None)
        if calls is None:
            master = read_master(force=force)
            calls, info = ozonetel.collect(job, last_report_day(master))

    calls = calls.copy()
    calls["Phone Number"] = base.phones(calls["Phone Number"])
    calls["Call Date"] = pd.to_datetime(calls["Call Date"], errors="coerce")
    for column in ("Campaign", "Call Flow", "Status"):
        if column not in calls.columns:
            calls[column] = ""
    calls = calls[["Campaign", "Phone Number", "Call Date", "Call Flow", "Status"]]
    calls["Comment LSQ"] = ""
    calls["Comment Analysis"] = ""
    log(f"{len(calls):,} sales incoming call(s) from Ozonetel.")

    # ---------------------------------------------------------- history
    log("Reading the master call history…")
    master = read_master(force=force)
    log(f"{len(master):,} historic call record(s).")

    combined = pd.concat([calls, master], ignore_index=True)
    combined = combined[combined["Phone Number"] != ""]
    # Newest call per number. na_position keeps undated rows as a last resort
    # rather than letting them win the sort.
    combined = (combined.sort_values("Call Date", ascending=False, na_position="last")
                .drop_duplicates("Phone Number"))
    log(f"{len(combined):,} distinct number(s) after merging the two sources.")

    # ---------------------------------------------------------- LSQ join
    lsq = lsq[lsq["Phone"] != ""].drop_duplicates("Phone", keep="last").set_index("Phone")
    key = combined["Phone Number"]

    combined["Contact_Stage"] = base.text(key.map(lsq["Contact Stage"])).replace("", NA)
    combined["Owner"] = base.text(key.map(lsq["Owner"])).replace("", NA)
    combined["_last_called"] = pd.to_datetime(key.map(lsq["_last_called"]), errors="coerce")
    combined["_follow_up_dt"] = pd.to_datetime(key.map(lsq["_follow_up_dt"]), errors="coerce")
    combined["Phone call counter"] = breach.dial_counts(key.map(lsq["Phone call counter"]))
    combined["Assigned On Call Counter"] = breach.dial_counts(
        key.map(lsq["Assigned On Call Counter"]))
    combined["Email"] = base.text(key.map(lsq["Email"]))
    combined["Zip Intent"] = base.text(key.map(lsq["Zip Intent"]))
    combined["Zip Intent Justification"] = base.text(key.map(lsq["Zip Intent Justification"]))

    unmapped = int((combined["Contact_Stage"] == NA).sum())
    log(f"{len(combined) - unmapped:,} number(s) matched a LeadSquared lead; {unmapped:,} did not.")

    # ---------------------------------------------------------- enrollments
    log("Matching the enrollment tracker…")
    enrollments = base.Enrollments.load(config.get("REV_SHEET_URL"),
                                        "the enrollment tracker", log=log, force=force)
    enrolled_on, ops_caller = enrollments.lookup(combined["Phone Number"], combined["Email"])

    hit = enrolled_on.notna()
    combined["Enrollment Tracker"] = base.fmt_dates(enrolled_on, "%d/%m/%Y").replace("", NA)
    combined["Owner According to Rev Sheet"] = ops_caller.replace("", NA)
    combined.loc[hit, "Contact_Stage"] = breach.ENROLLED_STAGE
    named = hit & (ops_caller != "")
    combined.loc[named, "Owner"] = ops_caller[named]
    log(f"{int(hit.sum()):,} number(s) matched an enrollment.")

    # ---------------------------------------------------------- verdicts
    combined = base.apply_breach(
        combined, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone call counter",
        "Follow Up Status", "Phone call counter formula")
    combined["Assigned On Call Counter Formula"] = breach.dial_labels(
        combined["Assigned On Call Counter"])
    combined["Last Called Date"] = base.fmt_dates(combined["_last_called"]).replace("", base.NA)
    combined["Next Follow Up Date"] = base.fmt_dates(combined["_follow_up_dt"]).replace("", base.NA)

    # ---------------------------------------------------------- roster + comments
    combined = roster.attach(combined, "Owner")
    comments = base.stage_comments(log=log, force=force)
    if len(comments):
        fresh = base.text(combined["Phone Number"].map(comments))
        combined["Comment LSQ"] = fresh.where(fresh != "",
                                              base.text(combined["Comment LSQ"]).replace("", base.NA))
    else:
        combined["Comment LSQ"] = base.text(combined["Comment LSQ"]).replace("", base.NA)
    combined["Comment Analysis"] = base.text(combined["Comment Analysis"])

    combined["Call Date"] = pd.to_datetime(combined["Call Date"], errors="coerce")
    combined["_call_date"] = combined["Call Date"]
    combined["Call Date"] = base.fmt_dates(combined["_call_date"], "%d/%m/%Y")

    view = base.build_view(combined, owner="Owner", stage="Contact_Stage",
                           follow_up="Follow Up Status",
                           dial_label="Phone call counter formula",
                           dial_count="Phone call counter",
                           month_from="_call_date", campaign="Campaign",
                           date_column="_call_date", phone="Phone Number")

    out = base.finish(view, COLUMNS)
    summary = base.summarise(out, view)
    summary["unavailable"] = unmapped
    summary["ozonetel"] = {k: (info or {}).get(k) for k in ("from", "to", "calls", "numbers", "note")}
    log(f"Built {len(out):,} row(s); {unmapped:,} not yet in LeadSquared.")
    return out, view, summary


def pending(out, view):
    rows = view[(view["Contact_Stage"] == NA) & (view["Phone Number"] != "")]
    return pd.DataFrame({
        "Phone Number": rows["Phone Number"].values,
        "Prospect ID": "",
        "Email": rows["Email"].values if "Email" in rows else "",
        "Report_Type": REPORT_TYPE,
    }).drop_duplicates("Phone Number")
