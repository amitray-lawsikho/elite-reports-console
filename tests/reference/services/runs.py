# -*- coding: utf-8 -*-
"""
services/runs.py
================
Where a LeadSquared fetch and the reports built from it live between steps.

The working loop is: fetch once, build three reports, find the leads that
did not map, fix their Report_Type in LeadSquared, fetch again, rebuild. That
only works if a fetch survives page reloads and a console restart — which is
what this module is for.

  report_runs/<token>/leads.pkl          the fetch
  report_runs/<token>/meta.json          what the fetch was
  report_runs/<token>/<report>.pkl       a report built from it
  report_runs/<token>/<report>.json      that report's summary
  report_runs/<token>/*.xlsx | *.csv     downloads written on demand
  report_runs/latest                     the token to reopen on

Folders older than KEEP_HOURS are swept on startup, so nothing accumulates.
"""

import json
import os
import re
import shutil
import threading
import time
import uuid

import pandas as pd

import config

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS_DIR = os.path.join(BASE_DIR, "report_runs")
LATEST = os.path.join(RUNS_DIR, "latest")

os.makedirs(RUNS_DIR, exist_ok=True)

_lock = threading.Lock()
_frames = {}          # token -> the fetch frame
_reports = {}         # (token, report) -> a built report frame

SAFE_NAME = re.compile(r"^[a-z0-9_\-]+$")


def new_token():
    return str(uuid.uuid4())


def run_dir(token, create=False):
    """Folder for one fetch. The token arrives from a URL, so it is
    sanitised — nothing outside report_runs/ should ever be touched."""
    safe = os.path.basename(str(token or "").strip())
    if not safe or safe in (".", "..", "latest"):
        raise ValueError("Invalid token.")
    path = os.path.join(RUNS_DIR, safe)
    if create:
        os.makedirs(path, exist_ok=True)
    return path


def _report_name(report):
    name = str(report or "").strip().lower()
    if not SAFE_NAME.match(name):
        raise ValueError(f"Unknown report: {report!r}")
    return name


# ---------------------------------------------------------------------
# The fetch
# ---------------------------------------------------------------------
def save_fetch(token, frame, meta):
    folder = run_dir(token, create=True)
    frame.to_pickle(os.path.join(folder, "leads.pkl"))
    with open(os.path.join(folder, "meta.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2, default=str)
    with open(LATEST, "w", encoding="utf-8") as handle:
        handle.write(token)
    with _lock:
        # Only ever hold one fetch in memory; these frames are large.
        _frames.clear()
        _reports.clear()
        _frames[token] = frame


def save_fetch_meta(token, meta):
    """Rewrite a fetch's meta.json — the Ozonetel step adds to it."""
    with open(os.path.join(run_dir(token, create=True), "meta.json"), "w",
              encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2, default=str)


def load_frame(token):
    with _lock:
        if token in _frames:
            return _frames[token]
    path = os.path.join(run_dir(token), "leads.pkl")
    if not os.path.exists(path):
        raise FileNotFoundError("That fetch has expired or was cleaned up — fetch again.")
    frame = pd.read_pickle(path)
    with _lock:
        _frames.clear()
        _frames[token] = frame
    return frame


def load_meta(token):
    path = os.path.join(run_dir(token), "meta.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def latest_token():
    try:
        with open(LATEST, encoding="utf-8") as handle:
            token = handle.read().strip()
    except OSError:
        return None
    try:
        if token and os.path.exists(os.path.join(run_dir(token), "leads.pkl")):
            return token
    except ValueError:
        pass
    return None


# ---------------------------------------------------------------------
# A built report
# ---------------------------------------------------------------------
def save_report(token, report, frame, summary):
    name = _report_name(report)
    folder = run_dir(token, create=True)
    frame.to_pickle(os.path.join(folder, f"{name}.pkl"))
    with open(os.path.join(folder, f"{name}.json"), "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2, default=str)
    with _lock:
        _reports[(token, name)] = frame


def load_report(token, report):
    name = _report_name(report)
    with _lock:
        hit = _reports.get((token, name))
        if hit is not None:
            return hit
    path = os.path.join(run_dir(token), f"{name}.pkl")
    if not os.path.exists(path):
        raise FileNotFoundError(
            "That report has not been built from this fetch yet — build it first."
        )
    frame = pd.read_pickle(path)
    with _lock:
        _reports[(token, name)] = frame
    return frame


def report_summary(token, report):
    name = _report_name(report)
    path = os.path.join(run_dir(token), f"{name}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def built_reports(token, keys=None):
    """
    Which reports exist for this fetch.

    ``keys`` restricts it to the real report names. Without that, the
    ``<key>__pending`` side-files count as reports of their own, which is how
    "3 reports built" turns into "6" on the page.
    """
    try:
        folder = run_dir(token)
    except ValueError:
        return {}
    if not os.path.isdir(folder):
        return {}
    allowed = set(keys) if keys else None
    out = {}
    for name in os.listdir(folder):
        if not name.endswith(".json") or name == "meta.json":
            continue
        key = name[:-5]
        if key.endswith("__pending"):
            continue
        if allowed is not None and key not in allowed:
            continue
        out[key] = report_summary(token, key)
    return out


# ---------------------------------------------------------------------
# Remembered uploads
# ---------------------------------------------------------------------
# A report that needs a file (the Ozonetel export) is almost always rebuilt
# against the same file minutes later, after the LeadSquared update. Asking
# for it a second time is pure friction, so the last path used is remembered
# here and re-used unless a new file is chosen.
UPLOADS_FILE = os.path.join(RUNS_DIR, "uploads.json")


def remember_upload(report, path):
    if not path or not os.path.exists(path):
        return
    name = _report_name(report)
    try:
        current = {}
        if os.path.exists(UPLOADS_FILE):
            with open(UPLOADS_FILE, encoding="utf-8") as handle:
                current = json.load(handle)
        current[name] = {"path": path, "at": time.time(),
                         "name": os.path.basename(path)}
        with open(UPLOADS_FILE, "w", encoding="utf-8") as handle:
            json.dump(current, handle, indent=2)
    except (OSError, ValueError):
        pass


def last_upload(report):
    """The file this report was last built from, if it is still on disk."""
    try:
        name = _report_name(report)
        if not os.path.exists(UPLOADS_FILE):
            return None
        with open(UPLOADS_FILE, encoding="utf-8") as handle:
            entry = json.load(handle).get(name)
        if entry and os.path.exists(entry.get("path", "")):
            return entry["path"]
    except (OSError, ValueError):
        pass
    return None


def last_upload_name(report):
    path = last_upload(report)
    return os.path.basename(path) if path else None


# ---------------------------------------------------------------------
# Downloads and housekeeping
# ---------------------------------------------------------------------
def export_path(token, name):
    """A file written into a run's folder (the Excel and CSV downloads)."""
    return os.path.join(run_dir(token, create=True), os.path.basename(name))


def cleanup(max_age_hours=None):
    hours = max_age_hours if max_age_hours is not None else config.get_int("KEEP_HOURS", 12)
    cutoff = time.time() - max(1, hours) * 3600
    removed = 0
    keep = latest_token()
    for name in os.listdir(RUNS_DIR):
        if name in (".gitkeep", "latest") or name == keep:
            continue
        path = os.path.join(RUNS_DIR, name)
        try:
            if os.path.getmtime(path) >= cutoff:
                continue
            shutil.rmtree(path, ignore_errors=True) if os.path.isdir(path) else os.remove(path)
            removed += 1
            with _lock:
                _frames.pop(name, None)
                for key in [k for k in _reports if k[0] == name]:
                    _reports.pop(key, None)
        except OSError:
            pass
    return removed
