# -*- coding: utf-8 -*-
"""
services/reports/high_priority.py
=================================
High Priority leads.

The lead list is two published sheets — this month's and last month's — merged
and de-duplicated on **Prospect ID**, most recent Timestamp winning. Rows with
no Prospect ID are kept as they are: there is no reliable key to de-duplicate
them on, and dropping them would lose real leads.

**The previous-month link is rolled over every month.** It is a plain Settings
field for exactly that reason: at the start of a month, this month's sheet
moves into "Previous month" and the new one goes into "Current month". Nothing
else needs touching.

Everything else is joined from the LeadSquared snapshot **by Prospect ID**,
not by phone: these leads arrive with their LSQ id already on them, and an id
match cannot be confused by two people sharing a number.

A Prospect ID the snapshot does not have comes out with ``#N/A`` as its
Caller Name and lands on the pending list, keyed on Prospect ID.
"""

import re

import pandas as pd

import config
from services import breach, roster, sheets
from services.reports import base

KEY = "high_priority"
TITLE = "High Priority Leads"
SUBTITLE = "This month's and last month's lead sheets, resolved against LeadSquared by Prospect ID."
REPORT_TYPE = "High Priority"
NEEDS_UPLOAD = None

COLUMNS = [
    "Course Name", "Name", "Email", "Country Code", "Phone no",
    "Lead Description", "Lead Source", "Date",
    "Caller Name", "Call_Status", "Last Called Date", "Next Follow Up Date",
    "Phone Call Counter", "Phone Call Counter Formula",
    "Caller Comments", "Enrolled", "Follow Up Status",
    "Verticals", "Team",
    "Assigned On Call Counter", "Assigned On Call Counter Formula",
    "Prospect ID",
]

PUSH_SETTING = "HP_PUSH_URL"
FILENAME = "High_Priority_Report"


def _load_lead_sheets(log, force=False):
    """This month's and last month's sheets, merged and de-duplicated."""
    frames = []
    for key, label in (("HP_CURRENT_MONTH_URL", "the current month's High Priority sheet"),
                       ("HP_PREVIOUS_MONTH_URL", "the previous month's High Priority sheet")):
        url = config.get(key)
        if not str(url).strip():
            log(f"No link set for {label} — skipping it.")
            continue
        frame = sheets.read_csv(url, label=label, dtype=str, force=force)
        log(f"{label}: {len(frame):,} row(s).")
        frames.append(frame)

    if not frames:
        raise ValueError(
            "Neither High Priority lead sheet is set. Open Settings and paste at least "
            "the current month's link."
        )

    merged = pd.concat(frames, ignore_index=True)
    merged.columns = [str(c).strip() for c in merged.columns]

    id_col = sheets.first_column(merged, "Prospect ID", "ProspectID", "Prospect Id")
    if id_col is None:
        raise ValueError(
            "The High Priority lead sheets have no Prospect ID column, which is what "
            f"they are matched on. Found: {', '.join(map(str, merged.columns[:25]))}"
        )
    merged = merged.rename(columns={id_col: "Prospect ID"})
    merged["Prospect ID"] = base.text(merged["Prospect ID"])

    stamp_col = None
    merged["_stamp"] = pd.NaT
    for name in ("Timestamp", "Created On", "Date"):
        column = sheets.first_column(merged, name)
        if column is None:
            continue
        stamp_col = stamp_col or column
        parsed = pd.to_datetime(merged[column], errors="coerce", dayfirst=True)
        merged["_stamp"] = merged["_stamp"].where(merged["_stamp"].notna(), parsed)

    has_id = merged["Prospect ID"] != ""
    with_id = (merged[has_id].sort_values("_stamp", ascending=False, na_position="last")
               .drop_duplicates("Prospect ID"))
    without_id = merged[~has_id]

    if len(without_id):
        log(f"{len(without_id):,} row(s) have no Prospect ID — kept as they are, "
            "but they cannot be matched to LeadSquared.")

    out = pd.concat([with_id, without_id], ignore_index=True)
    log(f"{len(out):,} lead(s) after merging and de-duplicating on Prospect ID.")
    return out, stamp_col


def build(job, lsq, force=False):
    log = job.log

    leads, stamp_col = _load_lead_sheets(log, force=force)

    # ---------------------------------------------------------- base columns
    # The two month sheets are merged, and they do not always name a column
    # the same way ("Phone Number" in one, "Mobile Number" in the other). So
    # every candidate is read and the first non-blank value wins, row by row —
    # taking only the first column that exists left every row from the other
    # sheet blank.
    def pick(*names):
        out = pd.Series("", index=leads.index, dtype="object")
        lower = {re.sub(r"[^a-z0-9]", "", str(c).lower()): c for c in leads.columns}
        for name in names:
            column = lower.get(re.sub(r"[^a-z0-9]", "", name.lower()))
            if column is None:
                continue
            values = base.text(leads[column])
            out = out.where(out != "", values)
        return out

    frame = pd.DataFrame(index=leads.index)
    frame["Course Name"] = pick("Enquired Course", "Course Name", "Course")
    frame["Name"] = pick("First Name", "Name", "Lead Name", "Full Name")
    frame["Email"] = pick("Email Address", "Email", "Email Id", "EmailAddress")
    frame["Country Code"] = ""
    raw_phone = pick("Phone Number", "Phone", "Phone no", "Mobile Number", "Mobile",
                     "Contact Number", "Contact No", "Mobile No", "WhatsApp Number")
    cleaned = base.phones(raw_phone)
    # A number that is not ten digits is kept as typed rather than blanked.
    frame["Phone no"] = cleaned.where(cleaned != "", raw_phone)
    frame["Lead Description"] = pick("Campaign Name", "Lead Description", "Campaign")
    frame["Lead Source"] = pick("Source", "Lead Source")
    frame["Prospect ID"] = leads["Prospect ID"]
    frame["_stamp"] = leads["_stamp"]
    frame["Date"] = base.fmt_dates(leads["_stamp"], "%d/%m/%Y")
    log(f"Phone number found on {int((frame['Phone no'] != '').sum()):,} of "
        f"{len(frame):,} lead(s) in the sheets.")

    # ---------------------------------------------------------- LSQ join
    log("Mapping LeadSquared data by Prospect ID…")
    snapshot = lsq[base.text(lsq["Prospect ID"]) != ""].copy()
    # Where a lead somehow appears twice, the most recently called row wins.
    snapshot = (snapshot.sort_values("_last_called", ascending=False, na_position="last")
                .drop_duplicates("Prospect ID").set_index("Prospect ID"))

    key = frame["Prospect ID"]
    frame["Caller Name"] = base.text(key.map(snapshot["Owner"]))
    frame["Call_Status"] = base.text(key.map(snapshot["Contact Stage"]))
    frame["_last_called"] = pd.to_datetime(key.map(snapshot["_last_called"]), errors="coerce")
    frame["_follow_up_dt"] = pd.to_datetime(key.map(snapshot["_follow_up_dt"]), errors="coerce")
    frame["Phone Call Counter"] = breach.dial_counts(key.map(snapshot["Phone call counter"]))
    frame["Assigned On Call Counter"] = breach.dial_counts(
        key.map(snapshot["Assigned On Call Counter"]))
    frame["Zip Intent"] = base.text(key.map(snapshot["Zip Intent"]))
    frame["Zip Intent Justification"] = base.text(key.map(snapshot["Zip Intent Justification"]))

    # Fall back to the snapshot's email and phone where the sheet has none, so
    # the enrollment match has something to work with.
    frame["Email"] = frame["Email"].where(frame["Email"] != "",
                                          base.text(key.map(snapshot["Email"])))
    snap_phone = base.text(key.map(snapshot["Phone"]))
    short = ~frame["Phone no"].str.fullmatch(r"\d{10}")
    frame["Phone no"] = frame["Phone no"].where(~short | (snap_phone == ""), snap_phone)

    unmapped = int((frame["Caller Name"] == "").sum())
    log(f"{len(frame) - unmapped:,} lead(s) matched a LeadSquared owner; {unmapped:,} did not.")

    # ---------------------------------------------------------- enrollments
    log("Matching the High Priority enrollment tracker…")
    enrollments = base.Enrollments.load(
        [config.get("HP_REV_URL_1"), config.get("HP_REV_URL_2")],
        "the High Priority enrollment tracker",
        only_new_enrollment=True, log=log, force=force)
    enrolled_on, ops_caller = enrollments.lookup(frame["Phone no"], frame["Email"])

    hit = enrolled_on.notna()
    frame["Enrolled"] = base.fmt_dates(enrolled_on, "%d/%m/%Y").replace("", base.NA)
    frame.loc[hit, "Call_Status"] = breach.ENROLLED_STAGE
    named = hit & (ops_caller != "")
    frame.loc[named, "Caller Name"] = ops_caller[named]
    log(f"{int(hit.sum()):,} lead(s) matched a new enrollment.")

    # ---------------------------------------------------------- verdicts
    frame = base.apply_breach(frame, "Call_Status", "_last_called", "_follow_up_dt",
                              "Phone Call Counter",
                              "Follow Up Status", "Phone Call Counter Formula")
    frame["Assigned On Call Counter Formula"] = breach.dial_labels(frame["Assigned On Call Counter"])
    frame["Last Called Date"] = base.fmt_dates(frame["_last_called"]).replace("", base.NA)
    frame["Next Follow Up Date"] = base.fmt_dates(frame["_follow_up_dt"]).replace("", base.NA)

    # ---------------------------------------------------------- roster + comments
    frame = roster.attach(frame, "Caller Name")
    comments = base.stage_comments(log=log, force=force)
    frame["Caller Comments"] = (base.text(frame["Phone no"].map(comments)).replace("", base.NA)
                                if len(comments) else base.NA)

    # Unmapped leads read as #N/A in the sheet, the way the team already reads them.
    for column in ("Caller Name", "Call_Status"):
        frame[column] = frame[column].replace("", base.NA)

    view = base.build_view(frame, owner="Caller Name", stage="Call_Status",
                           follow_up="Follow Up Status",
                           dial_label="Phone Call Counter Formula",
                           dial_count="Phone Call Counter",
                           month_from="_stamp", campaign="Lead Description",
                           date_column="_stamp", phone="Phone no")

    out = base.finish(view, COLUMNS)
    summary = base.summarise(out, view)
    summary["unavailable"] = unmapped
    log(f"Built {len(out):,} row(s); {unmapped:,} with no LeadSquared owner.")
    return out, view, summary


def pending(out, view):
    """
    Leads with no LeadSquared owner, keyed on Prospect ID.

    Prospect ID is the key here rather than the phone number: these rows
    already carry their LSQ id, and an id update lands on exactly one lead
    where a phone update can hit a duplicate or miss a blank number entirely.
    """
    rows = view[(view["Caller Name"] == base.NA) & (view["Prospect ID"] != "")]
    return pd.DataFrame({
        "Phone Number": rows["Phone no"].values,
        "Prospect ID": rows["Prospect ID"].values,
        "Email": rows["Email"].values,
        "Report_Type": REPORT_TYPE,
    }).drop_duplicates("Prospect ID")
