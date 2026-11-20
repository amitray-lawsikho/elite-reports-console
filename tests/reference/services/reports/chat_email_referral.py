# -*- coding: utf-8 -*-
"""
services/reports/chat_email_referral.py
=======================================
Chat / Email / Referral.

The lead list is a Google Sheet the team maintains by hand (one row per chat,
email or referral enquiry). Everything else — who owns the lead now, what
stage it is in, when it was last called, how many times it has been dialled,
and now its Zip Intent — is joined on from the LeadSquared snapshot by phone
number.

A lead that is not in the snapshot comes out as **Unavailable** on the Manage
Contact Tracker and lands on the pending list: set its Report_Type in
LeadSquared to ``Chat/Email/Referral``, fetch again, rebuild, and it maps.
"""

import numpy as np
import pandas as pd

import config
from services import breach, roster, sheets
from services.reports import base

KEY = "chat_email_referral"
TITLE = "Chat, Email & Referral"
SUBTITLE = "Hand-kept enquiry sheet, enriched from LeadSquared and the enrollment tracker."
REPORT_TYPE = "Chat/Email/Referral"
NEEDS_UPLOAD = None

# The sheet as it is pushed, in this order. Zip Intent and Zip Intent
# Justification are appended by base.finish().
COLUMNS = [
    "Date", "Course_Enquired", "Name", "Email", "Lead_Phone_Number", "Owner",
    "Contact_Stage", "Type", "Last Called date", "Next Follow Up Date", "Follow Up status",
    "Phone Call Counter", "Phone Call Counter Formula",
    "Enrollment Tracker", "Manage Contact Tracker",
    "Assigned On Call Counter", "Assigned On Call Counter Formula",
]

PUSH_SETTING = "CER_PUSH_URL"
FILENAME = "Chat_Email_Referral"


def build(job, lsq, force=False):
    log = job.log

    # ---------------------------------------------------------- sources
    log("Reading the Chat / Email / Referral enquiry sheet…")
    combined = sheets.read_csv(config.require("CER_COMBINED_URL", "Chat/Email/Referral sheet"),
                               label="the Chat / Email / Referral sheet", force=force)
    sheets.require_columns(combined, ["Lead_Phone_Number"], "The Chat / Email / Referral sheet")
    combined = combined.copy()
    log(f"{len(combined):,} enquiry row(s).")

    # The snapshot, one row per phone. Last wins: a lead re-touched during the
    # fetch window should be read at its newest state.
    lsq = lsq.copy()
    lsq = lsq[lsq["Phone"] != ""].drop_duplicates("Phone", keep="last").set_index("Phone")
    log(f"{len(lsq):,} LeadSquared lead(s) with a usable phone number to match against.")

    combined["Phone"] = base.phones(combined["Lead_Phone_Number"])

    # ---------------------------------------------------------- email
    # The enquiry sheet is often missing the email; three sources can supply
    # it, in order of how much they are trusted.
    if "Email" not in combined.columns:
        combined["Email"] = ""
    combined["Email"] = base.text(combined["Email"])

    filled = combined["Email"].copy()
    filled = filled.where(filled != "", combined["Phone"].map(lsq["Email"]))
    filled = filled.where(base.text(filled) != "", combined["Phone"].map(base.stage_emails(force)))
    combined["Email"] = base.text(filled)

    # ---------------------------------------------------------- LSQ join
    combined["_last_called"] = pd.to_datetime(combined["Phone"].map(lsq["_last_called"]),
                                              errors="coerce")
    combined["_follow_up_dt"] = pd.to_datetime(combined["Phone"].map(lsq["_follow_up_dt"]),
                                               errors="coerce")
    combined["Phone Call Counter"] = combined["Phone"].map(lsq["Phone call counter"]).fillna(0)
    combined["Assigned On Call Counter"] = combined["Phone"].map(
        lsq["Assigned On Call Counter"]).fillna("")
    combined["Zip Intent"] = base.text(combined["Phone"].map(lsq["Zip Intent"]))
    combined["Zip Intent Justification"] = base.text(
        combined["Phone"].map(lsq["Zip Intent Justification"]))

    if "Contact_Stage" not in combined.columns:
        combined["Contact_Stage"] = ""
    if "Owner" not in combined.columns:
        combined["Owner"] = ""
    # Contact stage: LeadSquared first, the sheet's own value where LSQ has
    # none. Enrollment still overrides it below.
    sheet_stage = base.text(combined["Contact_Stage"])
    lsq_stage = base.text(combined["Phone"].map(lsq["Contact Stage"]))
    combined["Contact_Stage"] = lsq_stage.where(lsq_stage != "", sheet_stage)
    log(f"Contact stage from LeadSquared on {int((lsq_stage != '').sum()):,} row(s); "
        f"from the sheet on the rest.")
    combined["Owner"] = base.text(combined["Owner"])

    # ---------------------------------------------------------- enrollments
    log("Matching the enrollment tracker…")
    enrollments = base.Enrollments.load(config.get("REV_SHEET_URL"),
                                        "the enrollment tracker", log=log, force=force)
    enrolled_on, ops_caller = enrollments.lookup(combined["Phone"], combined["Email"])

    hit = enrolled_on.notna()
    combined["Enrollment Tracker"] = base.fmt_dates(enrolled_on, "%d/%m/%Y").replace("", base.NA)
    combined.loc[hit, "Contact_Stage"] = breach.ENROLLED_STAGE
    # Only overwrite the owner where the tracker actually names someone —
    # otherwise an enrolled lead loses the caller it had for no gain.
    named = hit & (ops_caller != "")
    combined.loc[named, "Owner"] = ops_caller[named]
    log(f"{int(hit.sum()):,} lead(s) matched an enrollment.")

    # ---------------------------------------------------------- availability
    known_phones = set(lsq.index)
    known_emails = set(base.emails(lsq["Email"])) - {""}
    combined["Manage Contact Tracker"] = np.where(
        combined["Phone"].isin(known_phones) | combined["Email"].str.lower().isin(known_emails),
        "Available", "Unavailable",
    )

    # ---------------------------------------------------------- verdicts
    combined = base.apply_breach(
        combined, "Contact_Stage", "_last_called", "_follow_up_dt", "Phone Call Counter",
        "Follow Up status", "Phone Call Counter Formula")
    combined["Assigned On Call Counter Formula"] = breach.dial_labels(
        combined["Assigned On Call Counter"])

    combined["Last Called date"] = base.fmt_dates(combined["_last_called"]).replace("", base.NA)

    combined["Next Follow Up Date"] = base.fmt_dates(combined["_follow_up_dt"]).replace("", base.NA)

    # The phone is written back as bare digits, which is what the sheet and
    # Power BI both expect; a blank one keeps whatever was typed originally.
    combined["Lead_Phone_Number"] = combined["Phone"].where(
        combined["Phone"] != "", base.text(combined["Lead_Phone_Number"]))

    if "Date" not in combined.columns:
        combined["Date"] = ""
    combined["_date"] = pd.to_datetime(combined["Date"], errors="coerce", dayfirst=True)

    # Team and Vertical for the dashboard slicers — not report columns.
    combined = roster.attach(combined, "Owner")

    # ---------------------------------------------------------- view + out
    view = base.build_view(combined, owner="Owner", stage="Contact_Stage",
                           follow_up="Follow Up status",
                           dial_label="Phone Call Counter Formula",
                           dial_count="Phone Call Counter",
                           month_from="_date", type_column="Type",
                           campaign="Course_Enquired", date_column="_date",
                           phone="Phone")

    out = base.finish(view, COLUMNS)
    summary = base.summarise(out, view)
    summary["unavailable"] = int((view["Manage Contact Tracker"] == "Unavailable").sum())
    log(f"Built {len(out):,} row(s); {summary['unavailable']:,} not yet in LeadSquared.")
    return out, view, summary


def pending(out, view):
    """
    Leads the report could not map — they need a Report_Type in LeadSquared.

    "Unavailable" and no last call together mean the lead is genuinely absent
    from the snapshot, rather than present but never dialled.
    """
    missing = (view["Manage Contact Tracker"] == "Unavailable") & view["_last_called"].isna()
    rows = view[missing & (view["Phone"] != "")]
    return pd.DataFrame({
        "Phone Number": rows["Phone"].values,
        "Prospect ID": "",
        "Email": rows["Email"].values,
        "Report_Type": REPORT_TYPE,
    }).drop_duplicates("Phone Number")
