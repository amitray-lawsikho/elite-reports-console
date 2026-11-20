# -*- coding: utf-8 -*-
"""
services/breach.py
==================
The one breach engine, the one DNP rule and the one call-counter wording,
shared by all three reports, the dashboards and the dialer files.

THE BREACH RULE (the same one Leads Console uses)
-------------------------------------------------
N is the breached-days count for the lead's stage, asked for before every
build (defaults: Follow Up For Closure 2, Counselled lead 2, Call Back Later 2).
Followup DNP is no longer a stage in LeadSquared, so it has no rule. Days are whole calendar days counted back from today, in IST.
"Last call" is Last Called Date DT, falling back to Last Called Date.

  1. The lead has a Follow up date and time:
       * still ahead of now (later today counts)   -> NOT breached
       * less than N days old                      -> NOT breached
       * N or more days old                        -> BREACHED, unless the lead
                                                      was called in the last N days
  2. No follow-up:
       * last call more than N days ago            -> BREACHED
       * called within the last N days             -> not breached
  3. Never called and no follow-up                 -> BREACHED

Stages outside the three get a blank status. The status spellings are the ones
the Power BI pages filter on — do not "tidy" them.

LESS-DIALLED DNP
----------------
Call Not Connected / Call Not Picking Up **and** a call counter (Phone Call
Counter or Assigned On Call Counter) that is less than / more than / equal to
a number — Phone Call Counter less than 4 by default. "Less than 4" is 0-3;
the typed number is never itself included. "Equals" takes 3, 2-5 or 2,5,7.
A blank counter counts as 0.
"""

import re

import numpy as np
import pandas as pd

import config
from services import dates

# Stage -> (timely label, breached label).
STAGE_LABELS = {
    "Follow Up For Closure": ("Timely Follow Up",    "Follow Up Breached"),
    "Counselled lead":       ("Timely Counselled",   "Breached Counselled lead"),
    "Call Back Later":       ("Timely Called Back",  "Breached Call Back"),
}

BREACHED_LABELS = [breached for _, breached in STAGE_LABELS.values()]
BREACH_STAGES = list(STAGE_LABELS)

# Stages that count as "fresh" — not worked yet.
FRESH_STAGES = ["New Lead", "Re-enquired Lead", "Opportunity Created", "Untouched Lead"]

# Stages that count as "DNP" — the dialer reached nobody.
DNP_STAGES = ["Call Not Connected", "Call Not Picking Up"]

ENROLLED_STAGE = "Actually Enrolled"

COUNTER_LABELS = {"phone": "Phone Call Counter", "assigned": "Assigned On Call Counter"}
OP_WORDS = {"lt": "less than", "gt": "more than", "eq": "equal to"}

NA = "#N/A"


def days_by_stage() -> dict:
    return config.breach_days()


# ---------------------------------------------------------------------
# Follow-up status
# ---------------------------------------------------------------------
def _plural(k):
    k = int(k)
    return f"{k} day" if abs(k) == 1 else f"{k} days"


def judge(stages, last_called, follow_up=None, days=None, now=None):
    """
    ``(status, reason)`` for a whole column of leads.

    ``last_called`` and ``follow_up`` are parsed IST datetimes (NaT where
    blank). ``status`` is the timely/breached spelling for the four stages and
    blank for every other stage; ``reason`` says why, for the lead tables.
    """
    days = days or days_by_stage()
    now = pd.Timestamp(now) if now is not None else dates.now_ist()
    today = now.normalize()

    stage_text = pd.Series(stages, dtype="object").fillna("").astype(str).str.strip()
    index = stage_text.index
    last = pd.to_datetime(pd.Series(last_called, index=index), errors="coerce")
    if follow_up is None:
        fu = pd.Series(pd.NaT, index=index, dtype="datetime64[ns]")
    else:
        fu = pd.to_datetime(pd.Series(follow_up, index=index), errors="coerce")

    n = stage_text.map(lambda s: days.get(s)).astype("float")
    d_lc = dates.days_since(last, today)
    d_fu = dates.days_since(fu, today)

    has_fu = fu.notna()
    has_lc = last.notna()
    fu_ahead = has_fu & (fu > now)
    fu_not_due = fu_ahead | (has_fu & (d_fu < n))
    called_recently = has_lc & (d_lc <= n)
    breached = ~fu_not_due & ~called_recently

    status = pd.Series("", index=index, dtype="object")
    for stage, (timely, bad) in STAGE_LABELS.items():
        hit = stage_text == stage
        status[hit] = np.where(breached[hit], bad, timely)

    reason = pd.Series("", index=index, dtype="object")
    in_scope = n.notna()
    for i in index[in_scope]:
        if fu_ahead[i]:
            reason[i] = f"Follow-up due {fu[i]:%d %b %Y %H:%M}"
        elif fu_not_due[i]:
            reason[i] = f"Follow-up {_plural(d_fu[i])} ago — not overdue yet"
        elif called_recently[i]:
            reason[i] = "Called today" if d_lc[i] <= 0 else f"Called {_plural(d_lc[i])} ago"
        elif has_fu[i]:
            tail = f"last call {_plural(d_lc[i])} ago" if has_lc[i] else "never called"
            reason[i] = f"Follow-up overdue by {_plural(d_fu[i])}, {tail}"
        elif has_lc[i]:
            reason[i] = f"No call in {_plural(d_lc[i])}"
        else:
            reason[i] = "Never called, no follow-up"
    return status, reason


def follow_up_status(stages, last_called, follow_up=None, days=None, now=None) -> pd.Series:
    return judge(stages, last_called, follow_up, days=days, now=now)[0]


def is_breached(status) -> pd.Series:
    """True where a follow-up status is one of the breached spellings."""
    return pd.Series(status, dtype="object").fillna("").astype(str).isin(BREACHED_LABELS)


def breach_limit_for(stage) -> int:
    return int(days_by_stage().get(str(stage).strip(), 0))


# ---------------------------------------------------------------------
# Less-dialled DNP
# ---------------------------------------------------------------------
def parse_numbers(text):
    """"3" -> {3};  "2-5" -> {2,3,4,5};  "2,5,7" -> {2,5,7};  "1, 3-4" -> {1,3,4}."""
    wanted = set()
    for part in re.split(r"[,\s]+", str(text or "").strip()):
        if not part:
            continue
        match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", part)
        if match:
            low, high = sorted((int(match.group(1)), int(match.group(2))))
            if high - low > 1000:
                raise ValueError(f"The range {part} is too wide.")
            wanted.update(range(low, high + 1))
        elif part.isdigit():
            wanted.add(int(part))
        else:
            raise ValueError(f"'{part}' is not a number, a range like 2-5, or a list like 2,5,7.")
    if not wanted:
        raise ValueError("Give the DNP counter a number.")
    return wanted


def validate_dnp_rule(rule):
    """A clean ``{counter, op, value}`` or a ValueError the dialog can show."""
    counter = str((rule or {}).get("counter") or "phone").strip().lower()
    op = str((rule or {}).get("op") or "lt").strip().lower()
    value = str((rule or {}).get("value") or "").strip()
    if counter not in COUNTER_LABELS:
        raise ValueError("Pick Phone Call Counter or Assigned On Call Counter for DNP.")
    if op not in OP_WORDS:
        raise ValueError("Pick less than, more than or equal to for the DNP counter.")
    if op == "eq":
        parse_numbers(value)
    elif not value.isdigit():
        raise ValueError("The DNP counter needs a whole number.")
    return {"counter": counter, "op": op, "value": value}


def dnp_rule() -> dict:
    return config.dnp_rule()


def dnp_caption(rule=None) -> str:
    """"Phone Call Counter less than 4" — the panel subtitle."""
    rule = rule or dnp_rule()
    return f"{COUNTER_LABELS[rule['counter']]} {OP_WORDS[rule['op']]} {rule['value']}"


def counter_match(counts, rule=None) -> pd.Series:
    rule = rule or dnp_rule()
    counts = dial_counts(counts)
    if rule["op"] == "eq":
        return counts.isin(parse_numbers(rule["value"]))
    value = int(rule["value"])
    return counts < value if rule["op"] == "lt" else counts > value


def dnp_mask(view, rule=None) -> pd.Series:
    """Less-dialled DNP rows of a report view."""
    rule = rule or dnp_rule()
    column = "_assigned_count" if rule["counter"] == "assigned" else "_dial_count"
    counts = view[column] if column in view else pd.Series(0, index=view.index)
    return view["_stage"].isin(DNP_STAGES) & counter_match(counts, rule).values


def fresh_mask(view) -> pd.Series:
    return view["_stage"].isin(FRESH_STAGES)


def breached_mask(view) -> pd.Series:
    return is_breached(view["_follow_up"])


# ---------------------------------------------------------------------
# Call counter wording
# ---------------------------------------------------------------------
def dial_label(value, stage=None) -> str:
    """
    One call counter, one wording. ``0`` is "Not Dialled yet"; a value that is
    not a number (the sheets' "Dialled From Personal") is passed through.
    """
    if value is None:
        return "Not Dialled yet"

    text = str(value).strip()
    if text == "" or text.lower() in ("nan", "none", "#n/a", "na"):
        return "Not Dialled yet"

    try:
        count = int(float(text))
    except (TypeError, ValueError):
        return text

    ceiling = max(1, config.get_int("DIAL_LABEL_MAX", 6))
    if count <= 0:
        return "Not Dialled yet"
    if count == 1:
        return "1 time dialled"
    if count <= ceiling:
        return f"{count} times dialled"
    return f"Dialled more than {ceiling} times"


def dial_labels(values) -> pd.Series:
    series = pd.Series(values, dtype="object")
    return series.map(dial_label)


def dial_counts(values) -> pd.Series:
    """The counter as a number, with anything unreadable treated as 0."""
    return pd.to_numeric(pd.Series(values), errors="coerce").fillna(0).astype(int)
