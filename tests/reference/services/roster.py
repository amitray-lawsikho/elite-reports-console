# -*- coding: utf-8 -*-
"""
services/roster.py
==================
The caller roster — Caller Name, Team Name, Vertical, Email id — read from the
published Google Sheet named in Settings.

Two reports need it (Incoming and High Priority both carry Team and Verticals
columns), the dashboards slice on it, and the Chat/Email/Referral report uses
it only to fill in an owner's email. It is read once and cached here so a
build that touches it four times fetches it once.

Owners that match no roster row are kept under "Others" rather than dropped,
because a missing row is a roster problem the team wants to see on the chart
— not a reason to lose the lead.
"""

import re
import threading
import time

import pandas as pd

import config
from services import sheets

REQUIRED_COLS = ["Caller Name", "Team Name"]
OPTIONAL_COLS = ["Vertical", "Email id", "Analyst", "Sales Leader"]

OTHERS = "Others"

_lock = threading.Lock()
_cache = {"roster": None, "ts": 0.0}
CACHE_TTL = 300


def normalise_name(name) -> str:
    """Key used to match an owner to a roster row: case, punctuation and
    repeated spaces all ignored, so "Priya Singh", "priya  singh" and
    "Priya.Singh" collapse together."""
    if name is None:
        return ""
    text = re.sub(r"[^a-z0-9\s]+", " ", str(name).strip().lower())
    return re.sub(r"\s+", " ", text).strip()


def load(force=False) -> pd.DataFrame:
    with _lock:
        fresh = _cache["roster"] is not None and (time.time() - _cache["ts"]) < CACHE_TTL
        if fresh and not force:
            return _cache["roster"].copy()

    url = config.require("ROSTER_URL", "Roster sheet URL (ROSTER_URL)")
    roster = sheets.read_csv(url, label="the roster sheet", force=force)
    roster.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in roster.columns]

    # "Vertical" is spelt three ways across the team's copies of this sheet.
    if "Vertical" not in roster.columns:
        lower = {c.lower(): c for c in roster.columns}
        for option in ("verticals", "vertical name", "vertical"):
            if option in lower:
                roster = roster.rename(columns={lower[option]: "Vertical"})
                break

    sheets.require_columns(roster, REQUIRED_COLS, "The roster sheet")
    for col in OPTIONAL_COLS:
        if col not in roster.columns:
            roster[col] = ""
    for col in REQUIRED_COLS + OPTIONAL_COLS:
        roster[col] = roster[col].fillna("").astype(str).str.strip()

    roster = roster[roster["Caller Name"] != ""].reset_index(drop=True)

    with _lock:
        _cache["roster"] = roster.copy()
        _cache["ts"] = time.time()
    return roster


def clear_cache():
    with _lock:
        _cache.update({"roster": None, "ts": 0.0})
    sheets.clear_cache()


def index(roster=None) -> dict:
    """``normalised caller name -> {team, vertical, email, caller}``."""
    roster = load() if roster is None else roster
    out = {}
    for _, row in roster.iterrows():
        key = normalise_name(row["Caller Name"])
        if key and key not in out:
            out[key] = {
                "caller":   row["Caller Name"],
                "team":     row["Team Name"] or OTHERS,
                "vertical": row.get("Vertical") or OTHERS,
                "email":    row.get("Email id") or "",
            }
    return out


def attach(frame, owner_column, roster=None):
    """
    Add ``Team`` and ``Verticals`` to a report frame from its owner column.

    Unmatched owners land in "Others", which is what the dashboards already
    expect and what makes a roster gap visible instead of silent.
    """
    lookup = index(roster)
    keys = frame[owner_column].fillna("").astype(str).map(normalise_name)
    frame = frame.copy()
    frame["Verticals"] = keys.map(lambda k: (lookup.get(k) or {}).get("vertical", OTHERS))
    frame["Team"] = keys.map(lambda k: (lookup.get(k) or {}).get("team", OTHERS))
    return frame


def email_for(name, roster=None) -> str:
    return (index(roster).get(normalise_name(name)) or {}).get("email", "")
