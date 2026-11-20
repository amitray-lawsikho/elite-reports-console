# -*- coding: utf-8 -*-
"""
services/ozonetel.py
====================
Sales incoming calls from the Ozonetel CDR API — what used to be the uploaded
call export.

WHICH DAYS
----------
The Incoming master sheet holds every call up to the last report that was
pushed. So the newest Call Date in it *is* the day the report was last
prepared, and the days to fetch are that day through today:

    master's newest Call Date  ->  today (IST), one request per day

The last day in the master is fetched again because the report may have been
prepared half-way through it. Ozonetel only serves the last 15 days, so an
older gap is clamped and the log says so.

WHAT COUNTS
-----------
Only calls whose Skill is one of OZONETEL_SKILLS (``sales`` and
``Arbitrage_Sales`` — campaigns LawSikho_Incoming and Arbitrage_Incoming).
Ozonetel repeats a CallID across legs of the same call, so rows are
de-duplicated on UCID, never on CallID.

Each call becomes a row in the export's own shape — Campaign, Phone Number
(from E164), Call Date (date and start time), Call Flow, Status — and the
Incoming report then runs exactly as it always has.

RATE LIMIT AND CACHE
--------------------
Two requests a minute, so there is a pause between requests (32 s by default)
and a 429 waits a minute and retries. Every day fetched is kept on disk under
``ozonetel_cache/``: a finished day is never fetched again, and today is
re-fetched only when the copy is older than OZONETEL_TODAY_REFRESH_MINUTES —
so the rebuild after a LeadSquared import costs at most one request.
"""

import json
import os
import threading
import time
from datetime import datetime, timedelta

import pandas as pd
import requests

import config
from services import dates

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "ozonetel_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

MAX_DAYS_BACK = 15      # what the API serves
MAX_PAGES = 50

COLUMNS = ["Campaign", "Phone Number", "Call Date", "Call Flow", "Status"]

_lock = threading.Lock()
_last_request = {"at": 0.0}


class OzonetelError(RuntimeError):
    pass


def configured() -> bool:
    return bool(config.get("OZONETEL_API_KEY") and config.get("OZONETEL_USERNAME"))


def skills() -> list:
    return [s.strip() for s in str(config.get("OZONETEL_SKILLS") or "").split(",") if s.strip()]


# ---------------------------------------------------------------------
# One day from the API
# ---------------------------------------------------------------------
def _wait_turn(job=None):
    """Keep to Ozonetel's two requests a minute, across every caller."""
    gap = max(0, config.get_int("OZONETEL_SLEEP_SECONDS", 32))
    while True:
        with _lock:
            left = _last_request["at"] + gap - time.time()
            if left <= 0:
                _last_request["at"] = time.time()
                return
        if job is not None and job.check_stop():
            raise OzonetelError("Stopped.")
        time.sleep(min(left, 1.0))


def _request(session, day, page_no, page_size, job=None):
    api_key = config.require("OZONETEL_API_KEY", "Ozonetel API key")
    username = config.require("OZONETEL_USERNAME", "Ozonetel username")
    payload = {"fromDate": f"{day} 00:00:00", "toDate": f"{day} 23:59:59", "userName": username}
    params = {"pageNo": page_no, "pageSize": page_size, "apiKey": api_key}

    for attempt in range(4):
        _wait_turn(job)
        try:
            res = session.get(config.get("OZONETEL_API_URL"), json=payload, params=params,
                              headers={"apiKey": api_key, "Content-Type": "application/json"},
                              timeout=90)
        except requests.RequestException as exc:
            if attempt == 3:
                raise OzonetelError(f"Could not reach Ozonetel: {exc}") from exc
            continue
        if res.status_code == 429:
            if job is not None:
                job.log("Ozonetel says slow down — waiting a minute.")
            _last_request["at"] = time.time() + 30
            continue
        if res.status_code in (401, 403):
            raise OzonetelError("Ozonetel refused the API key or username — check them in Settings.")
        if res.status_code != 200:
            raise OzonetelError(f"Ozonetel returned HTTP {res.status_code}: {res.text[:200]}")
        try:
            data = res.json()
        except ValueError as exc:
            raise OzonetelError("Ozonetel did not return JSON.") from exc
        if str(data.get("status", "success")).lower() not in ("success", "true"):
            raise OzonetelError(f"Ozonetel: {data.get('message') or data}")
        return data
    raise OzonetelError("Ozonetel kept rate-limiting — try again in a few minutes.")


def fetch_day(day, job=None, session=None) -> list:
    """Every call on one day, as Ozonetel returns them (all skills)."""
    session = session or requests.Session()
    page_size = max(1, config.get_int("OZONETEL_PAGE_SIZE", 500))
    rows, seen = [], set()
    for page_no in range(1, MAX_PAGES + 1):
        data = _request(session, day, page_no, page_size, job)
        details = data.get("details") or []
        fresh = [r for r in details if str(r.get("UCID") or r.get("CallID")) not in seen]
        for r in fresh:
            seen.add(str(r.get("UCID") or r.get("CallID")))
        rows.extend(fresh)

        total = data.get("totalCount")
        # Stop on: an empty page; a page that brought nothing new (paging is
        # ignored); a page bigger than asked for (the whole day came at once);
        # a short page; or the stated total reached.
        if (not details or not fresh or len(details) > page_size
                or len(details) < page_size
                or (total not in (None, "") and len(rows) >= int(total))):
            break
    return rows


# ---------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------
def _cache_path(day):
    return os.path.join(CACHE_DIR, f"{day}.json")


def _cached(day, today):
    path = _cache_path(day)
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            blob = json.load(handle)
    except (OSError, ValueError):
        return None
    fetched = pd.Timestamp(blob.get("fetched_at"))
    if fetched.normalize() > pd.Timestamp(day):
        return blob["rows"]                      # fetched after the day ended — final
    if day == today.strftime("%Y-%m-%d"):
        fresh_for = config.get_int("OZONETEL_TODAY_REFRESH_MINUTES", 30)
        if dates.now_ist() - fetched < pd.Timedelta(minutes=fresh_for):
            return blob["rows"]
    return None


def _store(day, rows):
    blob = {"day": day, "fetched_at": dates.now_ist().isoformat(), "rows": rows}
    tmp = _cache_path(day) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(blob, handle)
    os.replace(tmp, _cache_path(day))


def clean_cache(keep_days=40):
    cutoff = (dates.today_ist() - pd.Timedelta(days=keep_days)).strftime("%Y-%m-%d")
    for name in os.listdir(CACHE_DIR):
        if name.endswith(".json") and name[:10] < cutoff:
            try:
                os.remove(os.path.join(CACHE_DIR, name))
            except OSError:
                pass


# ---------------------------------------------------------------------
# Raw rows -> the export's shape
# ---------------------------------------------------------------------
def to_frame(rows, wanted_skills=None) -> pd.DataFrame:
    """Sales incoming calls in the old export's columns, de-duplicated on UCID."""
    wanted = {s.lower() for s in (wanted_skills or skills())}
    raw = pd.DataFrame(rows or [])
    if raw.empty:
        return pd.DataFrame(columns=COLUMNS + ["UCID", "Skill"])
    for column in ("Skill", "UCID", "CallID", "E164", "CallerID", "CallDate", "StartTime",
                   "CampaignName", "CallFlow", "Event", "Status"):
        if column not in raw.columns:
            raw[column] = ""
        raw[column] = raw[column].fillna("").astype(str).str.strip()

    raw = raw[raw["Skill"].str.lower().isin(wanted)]
    raw["UCID"] = raw["UCID"].where(raw["UCID"] != "", raw["CallID"])
    raw = raw.drop_duplicates("UCID")

    phone = raw["E164"].where(raw["E164"] != "", raw["CallerID"])
    when = pd.to_datetime(raw["CallDate"] + " " + raw["StartTime"], errors="coerce",
                          format="%Y-%m-%d %H:%M:%S")
    when = when.fillna(pd.to_datetime(raw["CallDate"], errors="coerce", format="%Y-%m-%d"))
    return pd.DataFrame({
        "Campaign": raw["CampaignName"].values,
        "Phone Number": phone.values,
        "Call Date": when.values,
        "Call Flow": raw["CallFlow"].where(raw["CallFlow"] != "", raw["Event"]).values,
        "Status": raw["Status"].values,
        "UCID": raw["UCID"].values,
        "Skill": raw["Skill"].values,
    })


# ---------------------------------------------------------------------
# The whole job: master's last day -> today
# ---------------------------------------------------------------------
def days_to_fetch(last_day, today=None):
    """``(days, note)`` — every day from ``last_day`` to today, clamped to 15."""
    today = (today or dates.today_ist()).normalize()
    earliest = today - pd.Timedelta(days=MAX_DAYS_BACK)
    note = ""
    if last_day is None or pd.isna(last_day):
        start = earliest
        note = ("The master sheet has no Call Date to start from, so the last "
                f"{MAX_DAYS_BACK} days are fetched.")
    else:
        start = pd.Timestamp(last_day).normalize()
        if start > today:
            start = today
        if start < earliest:
            note = (f"The master sheet's newest call is {start:%d %b %Y}, but Ozonetel only "
                    f"keeps {MAX_DAYS_BACK} days — calls from {start:%d %b} to "
                    f"{earliest - pd.Timedelta(days=1):%d %b} cannot be fetched. Upload them "
                    "into the master sheet by hand if they matter.")
            start = earliest
    days = [d.strftime("%Y-%m-%d") for d in pd.date_range(start, today, freq="D")]
    return days, note


def collect(job, last_day):
    """
    Fetch (or read from cache) every day from ``last_day`` to today.

    Returns ``(calls_frame, info)``.
    """
    if not configured():
        raise OzonetelError("Ozonetel is not set up — add the API key and username in Settings.")

    today = dates.today_ist()
    days, note = days_to_fetch(last_day, today)
    if note:
        job.log("WARNING: " + note)
    wanted = skills()
    job.log(f"Ozonetel: {len(days)} day(s), {days[0]} to {days[-1]}, "
            f"skills {', '.join(wanted)}.")

    need = [d for d in days if _cached(d, today) is None]
    if need:
        gap = config.get_int("OZONETEL_SLEEP_SECONDS", 32)
        mins = max(1, round(len(need) * gap / 60))
        job.log(f"{len(days) - len(need)} day(s) already cached; fetching {len(need)} — "
                f"about {mins} minute(s) at Ozonetel's two requests a minute.")

    session = requests.Session()
    frames, per_day = [], []
    for number, day in enumerate(days, start=1):
        if job.check_stop():
            raise OzonetelError("Stopped — the Ozonetel fetch did not finish.")
        rows = _cached(day, today)
        source = "cache"
        if rows is None:
            job.queue.put(f"__STEP__ Ozonetel — day {number} of {len(days)} ({day})…")
            rows = fetch_day(day, job, session)
            _store(day, rows)
            source = "API"
        calls = to_frame(rows, wanted)
        frames.append(calls)
        per_day.append({"day": day, "calls": len(rows), "sales": int(len(calls)), "source": source})
        job.log(f"Ozonetel {day}: {len(rows):,} call(s), {len(calls):,} sales incoming "
                f"({source}).")

    clean_cache()
    calls = pd.concat(frames, ignore_index=True) if frames else to_frame([])
    calls = calls.drop_duplicates("UCID")
    info = {
        "from": days[0], "to": days[-1], "days": per_day, "calls": int(len(calls)),
        "numbers": int(calls["Phone Number"].nunique()) if len(calls) else 0,
        "note": note, "fetched_at": dates.now_ist().isoformat(),
    }
    job.log(f"Ozonetel: {info['calls']:,} sales incoming call(s) from "
            f"{info['numbers']:,} number(s).")
    return calls, info
