# -*- coding: utf-8 -*-
"""
services/sheets.py
==================
Reading the published Google Sheets the reports join against, and pushing a
finished report back to its Apps Script endpoint.

Reads are cached briefly (CACHE_TTL) and keyed by URL, so a report that wants
the revenue tracker three times in one build fetches it once, and rebuilding
after a LeadSquared re-fetch does not re-download every sheet. "Refresh
sources" on the page clears it.

Pushes go to the same Apps Script web apps the notebooks posted to: a JSON
body of ``[[header row], [row], [row], ...]``, every cell a string. The
notebooks sent that in one request and hoped; here the response is checked,
the size is reported, and a large report can be sent in chunks
(PUSH_CHUNK_ROWS) for endpoints that time out on a single huge body.
"""

import io
import threading
import time

import pandas as pd
import requests

import config

CACHE_TTL = 180  # seconds

_lock = threading.Lock()
_cache = {}      # url -> (timestamp, DataFrame)


# ---------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------
def read_csv(url, label=None, dtype=None, force=False) -> pd.DataFrame:
    """
    Fetch a published Google Sheet as a DataFrame.

    ``label`` is what the operator sees in an error — "the revenue tracker"
    reads better than a 90-character URL when a link has gone stale.
    """
    name = label or "a linked sheet"
    url = str(url or "").strip()
    if not url:
        raise ValueError(f"No link is set for {name}. Open Settings and paste it.")

    key = (url, str(dtype))
    with _lock:
        hit = _cache.get(key)
        if hit and not force and (time.time() - hit[0]) < CACHE_TTL:
            return hit[1].copy()

    try:
        response = requests.get(url, timeout=120)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"Could not read {name}: {exc}") from exc

    # A sheet that is not actually published comes back as Google's sign-in
    # page — HTML, status 200. Without this check that surfaces much later as
    # a baffling "column not found".
    head = response.content[:400].lstrip().lower()
    if head.startswith(b"<!doctype html") or head.startswith(b"<html"):
        raise ValueError(
            f"{name} did not return CSV — the link is probably not published "
            "to the web, or points at the sheet's normal view. Use "
            "File → Share → Publish to web (CSV), or an export?format=csv link."
        )

    try:
        frame = pd.read_csv(io.BytesIO(response.content), dtype=dtype)
    except Exception as exc:
        raise ValueError(f"Could not read {name} as a CSV: {exc}") from exc

    frame.columns = [str(c).strip() for c in frame.columns]
    # Two columns with the same head make every later .loc ambiguous.
    frame = frame.loc[:, ~frame.columns.duplicated()]

    with _lock:
        _cache[key] = (time.time(), frame.copy())
    return frame


def clear_cache():
    with _lock:
        _cache.clear()


def require_columns(frame, columns, label):
    """Fail early, naming the sheet and what it is actually missing."""
    missing = [c for c in columns if c not in frame.columns]
    if missing:
        raise ValueError(
            f"{label} is missing the column(s) {', '.join(missing)}. "
            f"Found: {', '.join(map(str, frame.columns[:25]))}"
        )
    return frame


def first_column(frame, *names):
    """The first of ``names`` present on the frame, or None.

    The team's sheets spell the same field differently in different tabs
    (``Contact No`` / ``Contact_No``, ``Email Id`` / ``Email_Id``), so every
    lookup goes through here instead of hard-coding one spelling.
    """
    lookup = {str(c).strip().lower(): c for c in frame.columns}
    for name in names:
        hit = lookup.get(str(name).strip().lower())
        if hit is not None:
            return hit
    return None


# ---------------------------------------------------------------------
# Pushing
# ---------------------------------------------------------------------
def push(url, frame, label=None, log=None, stop=None):
    """
    POST a report to its Apps Script web app as [[headers], [row], ...].

    Everything is stringified first: an Apps Script receiving a NaN or a numpy
    int64 writes an empty cell or fails outright, which is how a push can
    report success and leave a column blank.
    """
    name = label or "the Google Sheet"
    url = str(url or "").strip()
    if not url:
        raise ValueError(f"No Apps Script link is set for {name}. Open Settings and paste it.")

    clean = frame.fillna("").astype(str)
    header = [str(c) for c in clean.columns]
    rows = clean.values.tolist()
    timeout = max(30, config.get_int("PUSH_TIMEOUT_SECONDS", 300))
    chunk = max(0, config.get_int("PUSH_CHUNK_ROWS", 0))

    def send(payload, note):
        response = requests.post(url, json=payload, timeout=timeout)
        if response.status_code != 200:
            raise ValueError(
                f"{name} refused the push — HTTP {response.status_code}: "
                f"{response.text[:300]}"
            )
        if log:
            log(f"{note} — Google replied: {response.text.strip()[:200] or 'OK'}")
        return response.text

    if log:
        log(f"Pushing {len(rows):,} row(s) and {len(header)} column(s) to {name}…")

    if not chunk or len(rows) <= chunk:
        reply = send([header] + rows, "Pushed in one request")
        return {"rows": len(rows), "requests": 1, "reply": reply[:400]}

    # Chunked: the first request carries the header and replaces the sheet;
    # the rest append. The endpoint decides how it treats them — this only
    # guarantees the header arrives first and exactly once.
    sent = 0
    requests_made = 0
    reply = ""
    for start in range(0, len(rows), chunk):
        if stop is not None and stop():
            raise RuntimeError(f"Push stopped after {sent:,} row(s) — the sheet is now partial.")
        batch = rows[start:start + chunk]
        payload = ([header] + batch) if start == 0 else batch
        reply = send(payload, f"Rows {start + 1:,}–{start + len(batch):,}")
        sent += len(batch)
        requests_made += 1
    return {"rows": sent, "requests": requests_made, "reply": reply[:400]}
