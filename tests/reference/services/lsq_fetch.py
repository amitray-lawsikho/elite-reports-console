# -*- coding: utf-8 -*-
"""
services/lsq_fetch.py
=====================
The LeadSquared snapshot every report is built from.

This is the notebooks' first cell, done once: ``Leads.Get`` paged over the last
N days, owners resolved from ``Users.Get``, phones cleaned, dates read into
real timestamps, and the result parked under a token so all three reports —
and a rebuild after an LSQ update — share one fetch instead of hitting the API
three times over.

Two columns are new here and reach the end of every report:
``mx_Zip_Intent`` and ``mx_Zip_Intent_Justification``.

**Report_Type is the hinge.** The notebooks kept only rows whose
``mx_Report_Type`` is non-blank, and that is what makes the update loop work:
a lead with no Report_Type set in LeadSquared is not in the snapshot, so it
comes out of a report unmapped, lands on the "pending update" list, gets its
Report_Type set in LSQ, and is picked up by the next fetch. Both views are
kept — ``frame`` is everything fetched, ``tagged`` is the Report_Type rows —
so a report can say which one it wants and the page can show how many leads
are waiting on a Report_Type.
"""

import re
import time
from datetime import datetime, timedelta, timezone

import pandas as pd

import config
from apis.lsq import retrieve as lsq_leads
from apis.lsq import users as lsq_users
from services import dates
from services import runs as storage

# Hard ceiling so a runaway loop cannot page forever.
MAX_PAGES = 1000

# (frame column, LeadSquared schema name). Order is the order reports see.
FIELDS = [
    ("First Name",               "FirstName"),
    ("Last Name",                "LastName"),
    ("Email",                    "EmailAddress"),
    ("Enquired Course",          "mx_Enquired_Course"),
    ("Campaign Name",            "mx_Campaign_Name"),
    ("Contact Stage",            "ProspectStage"),
    ("Created On",               "CreatedOn"),
    ("Funnel name",              "mx_Funnel_name"),
    ("Last Called Date",         "mx_Last_Call_new"),
    ("Owner",                    "OwnerId"),
    ("Phone call counter",       "mx_Phone_call_counter"),
    ("Phone Number",             "Phone"),
    ("Report_Type",              "mx_Report_Type"),
    ("Assigned On Call Counter", "mx_Assigned_On_Call_Counter"),
    # The two new ones. They ride through every report to its last two columns.
    ("Zip Intent",               "mx_Zip_Intent"),
    ("Zip Intent Justification", "mx_Zip_Intent_Justification"),
]

# Requested but never a report column of their own: the lead id and the dates
# a fetch can be based on.
SYSTEM_FIELDS = ["ProspectID", "ModifiedOn", "mx_Assigned_On", "mx_Last_Called_Date_DT",
                 "mx_Follow_up_date_and_time", "mx_Next_follow_up_date"]

# The follow-up dates the breach rule reads: Follow up date and time (the
# field Leads Console uses) and Next follow up date. The later of the two is
# the lead's next follow-up — a lead is not breached while either is ahead.
FOLLOW_UP_FIELD = "mx_Follow_up_date_and_time"
NEXT_FOLLOW_UP_FIELD = "mx_Next_follow_up_date"

FETCH_FIELDS = SYSTEM_FIELDS + [schema for _, schema in FIELDS]

# What "Fetch on the basis of" offers.
FETCH_BASES = {
    "assigned":    {"label": "Assigned On",    "schema": "mx_Assigned_On"},
    "modified":    {"label": "Modified On",    "schema": "ModifiedOn"},
    "created":     {"label": "Created On",     "schema": "CreatedOn"},
    "last_called": {"label": "Last Called On", "schema": "mx_Last_Called_Date_DT"},
}
BASIS_ORDER = ["assigned", "modified", "created", "last_called"]
DEFAULT_BASIS = "modified"

# The two Zip fields the whole feature rests on. If the account has renamed
# them the fetch still runs, but the report says so rather than shipping two
# silently empty columns.
ZIP_FIELDS = ["mx_Zip_Intent", "mx_Zip_Intent_Justification"]


def clean_phone(value) -> str:
    """Last ten digits, or blank. The single phone rule for the whole app.

    Every join in every report is on this, so it lives in one place: a number
    stored as ``+91-98765 43210``, ``9876543210.0`` and ``91 9876543210``
    must all become ``9876543210`` or the joins quietly miss.
    """
    if value is None:
        return ""
    digits = re.sub(r"\D", "", str(value))
    return digits[-10:] if len(digits) >= 10 else ""


def _text(series) -> pd.Series:
    return series.astype("object").where(series.notna(), "").map(
        lambda v: "" if str(v).strip().lower() in ("nan", "none", "null") else str(v).strip()
    )


def build_frame(rows, owners, iso_is_utc=True, report=None) -> pd.DataFrame:
    """Raw Leads.Get rows -> the snapshot frame every report reads."""
    raw = pd.DataFrame(rows or [])
    for field in FETCH_FIELDS:
        if field not in raw.columns:
            raw[field] = ""

    # A lead touched twice during a long fetch can appear on two pages.
    raw["ProspectID"] = _text(raw["ProspectID"])
    with_id = raw[raw["ProspectID"] != ""].drop_duplicates("ProspectID", keep="last")
    raw = pd.concat([with_id, raw[raw["ProspectID"] == ""]], ignore_index=True)

    df = pd.DataFrame(index=raw.index)
    for column, schema in FIELDS:
        df[column] = _text(raw[schema])

    owner_ids = df["Owner"]
    df["Owner"] = owner_ids.map(lambda i: (owners.get(i) or {}).get("name", "")).fillna("")
    df["Owner Email"] = owner_ids.map(lambda i: (owners.get(i) or {}).get("email", "")).fillna("")

    df["Prospect ID"] = _text(raw["ProspectID"])
    df["Phone"] = df["Phone Number"].map(clean_phone)
    # The notebooks wrote the phone back as "91 XXXXXXXXXX"; keep that shape
    # for anything that reads the column by name, and the bare digits in
    # "Phone" for joining.
    df["Phone Number"] = df["Phone"].map(lambda p: f"91 {p}" if p else "")

    first, last = df["First Name"], df["Last Name"]
    df["Lead Name"] = (first + " " + last).str.strip().where(last != "", first)

    # Dates. mx_Last_Called_Date_DT is a real date field and wins where it is
    # set; mx_Last_Call_new is free text and fills the gaps.
    info = {}
    df["_created"] = dates.standardise(df["Created On"], iso_is_utc, past_only=True, report=info)
    if report is not None:
        report.append(dict(info, field="Created On", schema="CreatedOn"))

    info = {}
    text_call = dates.standardise(df["Last Called Date"], iso_is_utc, past_only=True,
                                  default_dayfirst=False, report=info)
    if report is not None:
        report.append(dict(info, field="Last Called Date", schema="mx_Last_Call_new"))

    info = {}
    field_call = dates.standardise(_text(raw["mx_Last_Called_Date_DT"]), iso_is_utc,
                                   past_only=True, report=info)
    if report is not None:
        report.append(dict(info, field="Last Called On", schema="mx_Last_Called_Date_DT"))

    df["_last_called"] = field_call.where(field_call.notna(), text_call)
    df["_last_called_source"] = ""
    df.loc[text_call.notna(), "_last_called_source"] = "mx_Last_Call_new"
    df.loc[field_call.notna(), "_last_called_source"] = "mx_Last_Called_Date_DT"

    # Follow up date and time — can be in the future, so not past_only.
    info = {}
    follow = dates.standardise(_text(raw[FOLLOW_UP_FIELD]), iso_is_utc, report=info)
    if report is not None:
        report.append(dict(info, field="Follow up date and time", schema=FOLLOW_UP_FIELD))
    info = {}
    next_follow = dates.standardise(_text(raw[NEXT_FOLLOW_UP_FIELD]), iso_is_utc, report=info)
    if report is not None:
        report.append(dict(info, field="Next follow up date", schema=NEXT_FOLLOW_UP_FIELD))
    df["_follow_up_dt"] = pd.concat([follow, next_follow], axis=1).max(axis=1)

    df["_assigned"] = dates.standardise(_text(raw["mx_Assigned_On"]), iso_is_utc, past_only=True)
    df["_modified"] = dates.standardise(_text(raw["ModifiedOn"]), iso_is_utc, past_only=True)

    return df


# ---------------------------------------------------------------------
# The job
# ---------------------------------------------------------------------
def run(job, days, basis=None, keep=True):
    """
    Fetch the snapshot. With ``keep`` (the Reports page) it is saved as the
    snapshot every report builds from; without it (Sales IQ Chats) the frame
    is only handed back in ``job.result["frame"]``, so mapping chats never
    replaces the reports' snapshot.
    """
    days = int(days)
    if days < 1 or days > 365:
        raise ValueError("Days must be between 1 and 365.")

    basis = str(basis or DEFAULT_BASIS).strip().lower()
    if basis not in FETCH_BASES:
        raise ValueError(
            "Choose what to fetch on the basis of: "
            + ", ".join(FETCH_BASES[k]["label"] for k in BASIS_ORDER)
        )
    basis_label = FETCH_BASES[basis]["label"]
    basis_schema = FETCH_BASES[basis]["schema"]

    started = time.time()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_text = cutoff.strftime("%Y-%m-%d %H:%M:%S")
    job.log(f"Fetching on the basis of {basis_label} ({basis_schema}): "
            f"the last {days} day(s), after {cutoff_text} UTC.")
    if basis != "modified":
        job.log(f"Leads with no {basis_label} date are not part of this fetch.")

    # 1. owners -----------------------------------------------------------
    job.log("Reading the LeadSquared user list…")
    users = lsq_users.fetch_all()
    owners = {u["id"]: {"name": u["name"], "email": u["email"]} for u in users}
    job.log(f"{len(owners)} LeadSquared users loaded.")

    # 2. fields -----------------------------------------------------------
    wanted = list(FETCH_FIELDS)
    known = lsq_leads.available_fields()
    missing = []
    if known:
        if basis_schema not in known:
            raise ValueError(
                f"{basis_label} ({basis_schema}) is not a field on this LeadSquared "
                "account, so the fetch cannot be based on it. Pick another one."
            )
        missing = [f for f in wanted if f not in known and f not in ("ProspectID", "ModifiedOn")]
        if missing:
            job.log("Not on this LeadSquared account, left blank: " + ", ".join(missing))
        for field in (FOLLOW_UP_FIELD, NEXT_FOLLOW_UP_FIELD):
            if field in missing:
                job.log(f"WARNING: {field} is not on this account, so the breach rule "
                        "cannot use it.")
        zip_missing = [f for f in ZIP_FIELDS if f in missing]
        if zip_missing:
            job.log("WARNING: " + " and ".join(zip_missing) + " do not exist on this account, so "
                    "Zip Intent / Zip Intent Justification will be blank in every report. "
                    "Check the field's schema name in LeadSquared.")
        wanted = [f for f in wanted if f not in missing]
    else:
        job.log("Could not read the field list — asking for every field as-is.")

    # 3. pages ------------------------------------------------------------
    page_size = max(1, min(config.get_int("LSQ_PAGE_SIZE", 1000), 1000))
    rows, page = [], 1
    while page <= MAX_PAGES:
        if job.check_stop():
            raise RuntimeError("Fetch stopped — nothing was saved.")
        batch = lsq_leads.fetch_page(cutoff_text, wanted, page, page_size, log=job.log,
                                     lookup_name=basis_schema)
        if not batch:
            break
        rows.extend(batch)
        job.processed = len(rows)
        job.log(f"Page {page}: {len(batch):,} leads — {len(rows):,} so far.")
        job.queue.put(f"__COUNT__ {len(rows)} {page}")
        page += 1
        time.sleep(0.25)

    job.log(f"LeadSquared returned {len(rows):,} lead rows.")

    # 4. frame ------------------------------------------------------------
    date_check = []
    frame = build_frame(rows, owners,
                        iso_is_utc=config.get_bool("LSQ_DATES_ARE_UTC", True),
                        report=date_check)
    for item in date_check:
        if not item.get("nonblank"):
            continue
        read = item["nonblank"] - item["unparsed"]
        job.log(f"{item['field']}: {read:,} of {item['nonblank']:,} read — {item['order']}")
        if item["unparsed"]:
            job.log(f"WARNING: {item['unparsed']:,} {item['field']} value(s) could not be read "
                    "as dates and are treated as blank.")

    tagged = int((frame["Report_Type"].str.strip() != "").sum())
    zip_intent = int((frame["Zip Intent"].str.strip() != "").sum())
    job.log(f"{tagged:,} of {len(frame):,} lead(s) have a Report_Type set — "
            "those are the ones the reports are built from.")
    job.log(f"Zip Intent is filled on {zip_intent:,} lead(s).")

    stats = {
        "rows": int(len(frame)),
        "tagged": tagged,
        "untagged": int(len(frame)) - tagged,
        "zip_intent": zip_intent,
        "zip_justification": int((frame["Zip Intent Justification"].str.strip() != "").sum()),
        "no_owner": int((frame["Owner"] == "") .sum()),
        "no_last_call": int(frame["_last_called"].isna().sum()),
        "follow_up": int(frame["_follow_up_dt"].notna().sum()),
        "report_types": (frame.loc[frame["Report_Type"].str.strip() != "", "Report_Type"]
                         .value_counts().head(20).to_dict()),
    }

    token = storage.new_token()
    meta = {
        "token": token,
        "days": days,
        "basis": basis,
        "basis_label": basis_label,
        "basis_schema": basis_schema,
        "cutoff_utc": cutoff_text,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "raw_rows": len(rows),
        "missing_fields": missing,
        "zip_fields_missing": [f for f in ZIP_FIELDS if f in missing],
        "stats": stats,
        "date_check": date_check,
        "seconds": round(time.time() - started, 1),
    }
    mins, secs = divmod(int(meta["seconds"]), 60)
    if not keep:
        job.log(f"Done — {len(frame):,} unique leads in {mins}m {secs}s.")
        job.result = dict(meta, frame=frame)
        return
    storage.save_fetch(token, frame, meta)
    storage.cleanup()

    job.log(f"Done — {len(frame):,} unique leads ready in {mins}m {secs}s.")
    job.result = meta


def tagged_only(frame) -> pd.DataFrame:
    """The Report_Type rows — what the notebooks called REPORT_LSQ."""
    return frame[frame["Report_Type"].fillna("").str.strip() != ""].copy()
