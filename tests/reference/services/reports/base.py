# -*- coding: utf-8 -*-
"""
services/reports/base.py
========================
The parts all three reports share.

Each report is a small class that knows its own sources and column order; the
joins they all do — enrollments, stage-change comments, the roster, the
follow-up verdict, the dashboard view — are here, done once and the same way.

Two conventions hold across every report:

* **Zip Intent and Zip Intent Justification are always the last two columns.**
  ``finish()`` puts them there, so a report can list its own columns without
  remembering to, and the sheets all gain the two fields in the same place.
* Columns beginning with ``_`` are internal: the dashboards read them, and
  ``finish()`` strips them before anything is written or pushed.
"""

import re

import numpy as np
import pandas as pd

import config
from services import breach, roster, sheets
from services import dates as datelib
from services.lsq_fetch import clean_phone

NA = "#N/A"

# The last two columns of every report, in this order.
ZIP_COLUMNS = ["Zip Intent", "Zip Intent Justification"]

# The internal columns the dashboards read. Every report fills these.
VIEW_COLUMNS = [
    "_owner", "_stage", "_follow_up", "_dial_label", "_dial_count",
    "_team", "_vertical", "_month", "_type", "_campaign", "_date", "_enrolled",
    "_assigned_count", "_phone", "_reason",
]


# ---------------------------------------------------------------------
# Small shared pieces
# ---------------------------------------------------------------------
def text(series) -> pd.Series:
    """A column as clean strings, with pandas' many spellings of empty gone."""
    s = pd.Series(series, dtype="object")
    return s.where(s.notna(), "").map(
        lambda v: "" if str(v).strip().lower() in ("nan", "nat", "none", "null") else str(v).strip()
    )


def phones(series) -> pd.Series:
    return pd.Series(series, dtype="object").map(clean_phone)


def emails(series) -> pd.Series:
    return text(series).str.lower()


def month_label(stamps) -> pd.Series:
    """"SEPTEMBER-2026" — the dashboards' Month of Lead slicer."""
    s = pd.to_datetime(pd.Series(stamps), errors="coerce")
    return s.dt.strftime("%B-%Y").str.upper().where(s.notna(), "")


def fmt_dates(stamps, pattern=None) -> pd.Series:
    return datelib.fmt(pd.to_datetime(pd.Series(stamps), errors="coerce"),
                       pattern or config.get("DOWNLOAD_DATE_FORMAT"))


def ops_caller_column(frame):
    """
    Find the enrollment tracker's "who circulated the link" column.

    In the sheet it is literally
    ``Caller name         (for ops) for enrollment link circulation`` — the run
    of spaces is real and has been retyped by hand more than once, so it is
    matched on its words rather than its exact text.
    """
    for column in frame.columns:
        flat = re.sub(r"\s+", " ", str(column)).strip().lower()
        if "caller name" in flat and "ops" in flat:
            return column
    return None


# ---------------------------------------------------------------------
# Enrollments
# ---------------------------------------------------------------------
class Enrollments:
    """
    The revenue / enrollment tracker, looked up by phone and then by email.

    A lead that appears in here is enrolled: its stage becomes
    "Actually Enrolled" and its owner becomes whoever circulated the link,
    which is how the dashboards' enrollment counts are attributed. The most
    recent row wins when the same person appears twice.
    """

    def __init__(self, by_phone, by_email, rows, source):
        self.by_phone = by_phone
        self.by_email = by_email
        self.rows = rows
        self.source = source

    @classmethod
    def load(cls, urls, label, only_new_enrollment=False, log=None, force=False):
        frames = []
        for url in [u for u in (urls if isinstance(urls, (list, tuple)) else [urls]) if str(u).strip()]:
            frames.append(sheets.read_csv(url, label=label, force=force))
        if not frames:
            raise ValueError(f"No link is set for {label}. Open Settings and paste it.")

        rev = pd.concat(frames, ignore_index=True)
        rev.columns = [str(c).strip() for c in rev.columns]

        phone_col = sheets.first_column(rev, "Contact No", "Contact_No", "Contact Number", "Phone")
        email_col = sheets.first_column(rev, "Email Id", "Email_Id", "Email", "Email Address")
        date_col = sheets.first_column(rev, "Date", "Enrollment Date")
        caller_col = ops_caller_column(rev)

        if phone_col is None and email_col is None:
            raise ValueError(
                f"{label} has no contact number or email column to match on. "
                f"Found: {', '.join(map(str, rev.columns[:25]))}"
            )
        if date_col is None:
            raise ValueError(f"{label} has no Date column, so enrollments cannot be dated.")

        # The High Priority tracker records more than new enrollments (renewals,
        # upgrades); only new ones count towards the conversion number.
        if only_new_enrollment:
            flag = sheets.first_column(rev, "Enrollment", "Enrollment Type")
            if flag is not None:
                before = len(rev)
                rev = rev[text(rev[flag]).str.lower() == "new enrollment"]
                if log:
                    log(f"{label}: {len(rev):,} new enrollment(s) of {before:,} row(s).")

        rev = rev.copy()
        rev["_date"] = pd.to_datetime(rev[date_col], errors="coerce", dayfirst=True)
        rev["_caller"] = text(rev[caller_col]) if caller_col else ""
        rev["_phone"] = phones(rev[phone_col]) if phone_col else ""
        rev["_email"] = emails(rev[email_col]) if email_col else ""

        # Most recent row wins; rows with no date sort last rather than vanish.
        rev = rev.sort_values("_date", ascending=False, na_position="last")

        by_phone = (rev[rev["_phone"] != ""].drop_duplicates("_phone")
                    .set_index("_phone")[["_date", "_caller"]])
        by_email = (rev[rev["_email"] != ""].drop_duplicates("_email")
                    .set_index("_email")[["_date", "_caller"]])

        if caller_col is None and log:
            log(f"WARNING: {label} has no 'Caller name (for ops)' column, so enrolled leads "
                "keep the owner they already had instead of the person who circulated the link.")

        return cls(by_phone, by_email, len(rev), label)

    def lookup(self, phone_series, email_series=None):
        """(enrollment date, ops caller) for each row — phone first, then email."""
        phone_keys = pd.Series(phone_series, dtype="object").fillna("")
        date = phone_keys.map(self.by_phone["_date"])
        caller = phone_keys.map(self.by_phone["_caller"])

        if email_series is not None and len(self.by_email):
            email_keys = emails(email_series)
            date = date.where(date.notna(), email_keys.map(self.by_email["_date"]))
            caller = caller.where(caller.notna() & (caller != ""),
                                  email_keys.map(self.by_email["_caller"]))

        return pd.to_datetime(date, errors="coerce"), text(caller)


# ---------------------------------------------------------------------
# Stage-change comments
# ---------------------------------------------------------------------
def stage_comments(log=None, force=False) -> pd.Series:
    """
    ``phone -> latest caller comment`` from the stage-change log.

    Rows whose comment is one of LeadSquared's own automation payloads (they
    start with an ``ActionType`` blob) are dropped: they are machine noise, not
    something a caller wrote, and they used to end up in the sheet verbatim.
    """
    url = config.get("STAGE_LOG_URL")
    if not str(url).strip():
        if log:
            log("No stage-change log link is set, so Comment LSQ will be blank.")
        return pd.Series(dtype="object")

    stage = sheets.read_csv(url, label="the stage-change log", force=force)
    phone_col = sheets.first_column(stage, "Phone", "Phone Number", "Mobile")
    comment_col = sheets.first_column(stage, "Comments", "Comment")
    when_col = sheets.first_column(stage, "StageChangedOn", "Stage Changed On", "ModifiedOn")

    if phone_col is None or comment_col is None:
        if log:
            log("WARNING: the stage-change log has no Phone/Comments columns, "
                "so Comment LSQ will be blank.")
        return pd.Series(dtype="object")

    stage = stage.copy()
    stage["_phone"] = phones(stage[phone_col])
    stage["_comment"] = text(stage[comment_col])
    stage = stage[(stage["_phone"] != "") & (stage["_comment"] != "")]
    stage = stage[~stage["_comment"].str.contains("ActionType", na=False)]

    if when_col is not None:
        stage["_when"] = pd.to_datetime(stage[when_col], errors="coerce", dayfirst=True)
        stage = stage.sort_values("_when", ascending=False, na_position="last")

    return stage.drop_duplicates("_phone").set_index("_phone")["_comment"]


def stage_emails(force=False) -> pd.Series:
    """``phone -> email`` from the stage-change log, used to fill gaps."""
    url = config.get("STAGE_LOG_URL")
    if not str(url).strip():
        return pd.Series(dtype="object")
    stage = sheets.read_csv(url, label="the stage-change log", force=force)
    phone_col = sheets.first_column(stage, "Phone", "Phone Number")
    email_col = sheets.first_column(stage, "EmailAddress", "Email Address", "Email")
    if phone_col is None or email_col is None:
        return pd.Series(dtype="object")
    stage = stage.copy()
    stage["_phone"] = phones(stage[phone_col])
    stage["_email"] = text(stage[email_col])
    stage = stage[(stage["_phone"] != "") & (stage["_email"] != "")]
    return stage.drop_duplicates("_phone").set_index("_phone")["_email"]


# ---------------------------------------------------------------------
# The verdict columns every report carries
# ---------------------------------------------------------------------
def apply_breach(frame, stage_column, last_called_column, follow_up_column, counter_column,
                 status_column, label_column):
    """Follow-up status (and why) plus the call-counter wording, from the shared engine."""
    frame = frame.copy()
    follow_up = frame[follow_up_column] if follow_up_column in frame.columns else None
    status, reason = breach.judge(frame[stage_column], frame[last_called_column], follow_up)
    frame[status_column] = status
    frame["_reason"] = reason
    frame[label_column] = breach.dial_labels(frame[counter_column])
    return frame


def build_view(frame, owner, stage, follow_up, dial_label, dial_count,
               month_from, type_column=None, campaign=None, date_column=None,
               phone=None, assigned_count="Assigned On Call Counter"):
    """
    Fill the ``_`` columns the ANALYSIS tab reads.

    Every report ends up with the same dashboard vocabulary, which is why one
    set of chart code can serve all three pages.
    """
    frame = frame.copy()
    frame["_owner"] = text(frame[owner]).replace("", "(No owner)")
    frame["_stage"] = text(frame[stage])
    frame["_follow_up"] = text(frame[follow_up])
    frame["_dial_label"] = text(frame[dial_label])
    frame["_dial_count"] = breach.dial_counts(frame[dial_count])
    frame["_assigned_count"] = (breach.dial_counts(frame[assigned_count])
                                if assigned_count in frame.columns else 0)
    # Bare ten digits, for the dialer files.
    frame["_phone"] = phones(frame[phone]) if phone and phone in frame.columns else ""
    if "_reason" not in frame.columns:
        frame["_reason"] = ""
    frame["_month"] = month_label(frame[month_from])
    frame["_type"] = text(frame[type_column]) if type_column else ""
    frame["_campaign"] = text(frame[campaign]) if campaign else ""
    frame["_date"] = pd.to_datetime(frame[date_column if date_column else month_from],
                                    errors="coerce")
    frame["_enrolled"] = frame["_stage"] == breach.ENROLLED_STAGE

    if "Team" in frame.columns:
        frame["_team"] = text(frame["Team"]).replace("", roster.OTHERS)
    else:
        frame["_team"] = roster.OTHERS
    if "Verticals" in frame.columns:
        frame["_vertical"] = text(frame["Verticals"]).replace("", roster.OTHERS)
    else:
        frame["_vertical"] = roster.OTHERS
    return frame


def finish(frame, columns):
    """
    The output frame: the report's own columns, then Zip Intent and Zip Intent
    Justification, and nothing internal.

    Missing columns are created empty rather than raised on — a source sheet
    that has lost a column should cost that column, not the whole report.
    """
    out = pd.DataFrame(index=frame.index)
    for column in columns:
        if column in ZIP_COLUMNS:
            continue
        out[column] = frame[column] if column in frame.columns else ""
    for column in ZIP_COLUMNS:
        out[column] = frame[column] if column in frame.columns else ""
    return out.fillna("")


def summarise(frame, view=None):
    """The headline numbers shown on the report card and the dashboard tiles."""
    view = frame if view is None else view
    stage = view["_stage"] if "_stage" in view else pd.Series(dtype="object")
    follow = view["_follow_up"] if "_follow_up" in view else pd.Series(dtype="object")
    enrolled = int((stage == breach.ENROLLED_STAGE).sum())
    total = int(len(view))
    return {
        "total": total,
        "enrolled": enrolled,
        "conversion": round(enrolled * 100.0 / total, 1) if total else 0.0,
        "breached": int(breach.is_breached(follow).sum()),
        "fresh": int(stage.isin(breach.FRESH_STAGES).sum()),
        "dnp": int(breach.dnp_mask(view).sum()) if "_stage" in view else 0,
        "owners": int(view["_owner"].nunique()) if "_owner" in view else 0,
        "zip_intent": int((text(frame["Zip Intent"]) != "").sum())
                      if "Zip Intent" in frame.columns else 0,
    }
