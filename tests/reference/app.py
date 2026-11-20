# -*- coding: utf-8 -*-
"""
Reports Console
===============
One roof for the three lead reports and the dashboards built on them.

  Reports     Fetch LeadSquared once, then build Chat/Email/Referral,
              Incoming and High Priority from that one snapshot. Each report
              lists the leads it could not match, so their Report_Type can be
              set in LeadSquared and the report rebuilt.
              The unmatched leads' CSV (step 3), the rebuild (step 4) and the
              MCube / Acefone files and pushes live on the same page.
  Analysis    The dashboard panels, drawn from the report you just built —
              fresh leads, breached DNP, breached leads, leads given,
              enrollments, and the three cards, with the same slicers.
  Settings    Keys, sheet links and the breach rules, editable without
              touching a file.

The working loop is the one the team already uses:

    Fetch (30 days) -> Build -> some leads do not map -> download the update
    CSV -> set Report_Type in LeadSquared -> Fetch -> Build -> Push.

Every report gains two columns at the end, from the snapshot:
Zip Intent (mx_Zip_Intent) and Zip Intent Justification
(mx_Zip_Intent_Justification).
"""

import json
import os
import queue
import sys
import threading
import time
from datetime import datetime

# Launched with pythonw.exe (the hidden launcher) there is no console at all,
# so sys.stdout/stderr are None and the first print() would crash the app
# before it ever serves a page. Send both to server.log instead, which is also
# the only place errors can be read from when running with no window.
if sys.stdout is None or sys.stderr is None:
    _LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.log")
    try:
        if os.path.getsize(_LOG_PATH) > 2 * 1024 * 1024:
            os.replace(_LOG_PATH, _LOG_PATH + ".old")
    except OSError:
        pass
    _log = open(_LOG_PATH, "a", buffering=1, encoding="utf-8", errors="replace")
    sys.stdout = sys.stdout or _log
    sys.stderr = sys.stderr or _log

import pandas as pd
from flask import (
    Flask, Response, jsonify, redirect, render_template, request, send_file, url_for
)

import config
import launcher
import watchdog as watchdog_mod
from apis.acefone import lead_lists as acefone_lists
from apis.mcube import autodialers as mcube_autodialers
from services import breach, dialers, jobs, lsq_fetch, ozonetel, pipeline, roster, salesiq, sheets
from services import runs as storage
from services.analysis import dashboards
from services.reports import registry

APP_VERSION = "1.1"

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB uploads


storage.cleanup()


@app.context_processor
def _inject_globals():
    """Every template gets the readiness picture and the defaults, so an
    unconfigured install says so on whatever page you happen to open."""
    status = config.status()
    return {
        "cred_status": status,
        "lsq_ready": status["lsq"],
        "reports": registry.catalogue(),
        "default_fetch_days": config.get_int("DEFAULT_FETCH_DAYS", 30),
        "fetch_bases": [dict(key=key, **lsq_fetch.FETCH_BASES[key])
                        for key in lsq_fetch.BASIS_ORDER],
        "default_fetch_basis": (config.get("DEFAULT_FETCH_BASIS")
                                if config.get("DEFAULT_FETCH_BASIS") in lsq_fetch.FETCH_BASES
                                else lsq_fetch.DEFAULT_BASIS),
        "breach_days": config.breach_days(),
        "dnp_rule": config.dnp_rule(),
        "settings_defaults": {"retry_attempts": config.get_int("MCUBE_RETRY_ATTEMPTS", 3),
                              "retry_time": config.get_int("MCUBE_RETRY_TIME", 180)},
        "app_version": APP_VERSION,
    }


# =====================================================================
# OPTIONAL PASSWORD GATE
# =====================================================================
@app.before_request
def _require_login():
    user, password = config.get("APP_USER"), config.get("APP_PASS")
    if not (user and password):
        return None  # open — fine for a local install
    auth = request.authorization
    if not auth or auth.username != user or auth.password != password:
        return Response("Authentication required.", 401,
                        {"WWW-Authenticate": 'Basic realm="Reports Console"'})
    return None


def fail(message, code=400):
    return jsonify({"ok": False, "error": str(message)}), code


def ok(**payload):
    payload.setdefault("ok", True)
    return jsonify(payload)


def body():
    return request.get_json(silent=True) or {}


def _days_and_basis(data):
    """Days and basis from a request, refused (not corrected) when out of range."""
    raw_days = data.get("days")
    if raw_days is None or str(raw_days).strip() == "":
        raw_days = config.get_int("DEFAULT_FETCH_DAYS", 30)
    try:
        days = int(str(raw_days).strip())
    except ValueError:
        raise ValueError("Days must be a whole number.")
    if days < 1 or days > 365:
        raise ValueError("Days must be between 1 and 365.")
    basis = str(data.get("basis") or config.get("DEFAULT_FETCH_BASIS")
                or lsq_fetch.DEFAULT_BASIS).strip().lower()
    if basis not in lsq_fetch.FETCH_BASES:
        raise ValueError(f"Unknown fetch basis: {basis!r}")
    return days, basis


def _save_rules(rules):
    """
    The breached days and DNP rule from the build dialog, checked and saved,
    so the build uses them and the next dialog opens on them.
    """
    if not rules:
        return
    values = {}
    for stage, key in config.BREACH_DAY_KEYS.items():
        raw = (rules.get("breach_days") or {}).get(stage)
        if raw is None or str(raw).strip() == "":
            continue
        try:
            n = int(str(raw).strip())
        except ValueError:
            raise ValueError(f"Breached days for {stage} must be a whole number.")
        if n < 0 or n > 365:
            raise ValueError(f"Breached days for {stage} must be between 0 and 365.")
        values[key] = str(n)
    if rules.get("dnp"):
        dnp = breach.validate_dnp_rule(rules["dnp"])
        values.update({"DNP_COUNTER": dnp["counter"], "DNP_OPERATOR": dnp["op"],
                       "DNP_VALUE": dnp["value"]})
    config.update(values)


def _token(value=None):
    token = str(value or "").strip() or storage.latest_token()
    if not token:
        raise FileNotFoundError("Nothing fetched yet — press Fetch on the Reports page first.")
    return token


def _send(frame, token, filename, excel=True):
    path = storage.export_path(token, filename)
    if excel:
        frame.to_excel(path, index=False)
        mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        # utf-8-sig so Excel shows Hindi and accented names correctly.
        frame.to_csv(path, index=False, encoding="utf-8-sig")
        mimetype = "text/csv"
    return send_file(path, as_attachment=True, download_name=filename, mimetype=mimetype)


# =====================================================================
# PAGES
# =====================================================================
@app.route("/")
def page_reports():
    if not config.status()["lsq"]:
        return redirect(url_for("page_setup"))
    return render_template("reports.html", active="reports")


@app.route("/update")
def page_update():
    # The LeadSquared update now lives on the Reports page (step 3).
    return redirect(url_for("page_reports"))


@app.route("/analysis")
def page_analysis_index():
    return redirect(url_for("page_analysis", key=registry.ORDER[0]))


@app.route("/analysis/<key>")
def page_analysis(key):
    try:
        module = registry.get(key)
    except ValueError:
        return redirect(url_for("page_analysis", key=registry.ORDER[0]))
    return render_template("analysis.html", active="analysis",
                           report=registry.describe(module))


@app.route("/salesiq")
def page_salesiq():
    return render_template("salesiq.html", active="salesiq")


@app.route("/setup")
def page_setup():
    return render_template("setup.html", active="setup")


@app.route("/settings")
def page_settings():
    return render_template("settings.html", active="settings")


# =====================================================================
# HEALTH / SETTINGS
# =====================================================================
@app.route("/api/health")
def api_health():
    return ok(credentials=config.status(), version=APP_VERSION,
              auto_shutdown=watchdog_mod.watchdog.enabled,
              open_tabs=watchdog_mod.watchdog.open_tabs,
              busy=jobs.any_running())


@app.route("/api/settings", methods=["GET", "POST"])
def api_settings():
    if request.method == "GET":
        return ok(settings=config.snapshot(), secrets=sorted(config.SECRET_KEYS))
    try:
        written = config.update(body())
        # A changed sheet link must not keep serving the old sheet's cache.
        sheets.clear_cache()
        roster.clear_cache()
        return ok(written=written, settings=config.snapshot())
    except Exception as exc:
        return fail(exc)


@app.route("/api/sources/refresh", methods=["POST"])
def api_refresh_sources():
    sheets.clear_cache()
    roster.clear_cache()
    return ok(message="Every linked sheet will be re-read on the next build.")


@app.route("/api/roster")
def api_roster():
    try:
        frame = roster.load(force=request.args.get("refresh") == "1")
        return ok(rows=frame.fillna("").to_dict("records"), count=int(len(frame)))
    except Exception as exc:
        return fail(f"Could not read the roster sheet: {exc}", 502)


# =====================================================================
# SETUP — test each key and link against the live source
# =====================================================================
# Every sheet link on the Setup page, with what it is called there.
SHEET_LINKS = {
    "ROSTER_URL": "the roster sheet",
    "CER_COMBINED_URL": "the Chat / Email / Referral sheet",
    "REV_SHEET_URL": "the enrollment tracker",
    "STAGE_LOG_URL": "the stage-change log",
    "INCOMING_MASTER_URL": "the Incoming master sheet",
    "HP_CURRENT_MONTH_URL": "the current month's High Priority sheet",
    "HP_PREVIOUS_MONTH_URL": "the previous month's High Priority sheet",
    "HP_REV_URL_1": "the High Priority enrollment tracker (tab 1)",
    "HP_REV_URL_2": "the High Priority enrollment tracker (tab 2)",
}


@app.route("/api/test/<what>")
def api_test(what):
    """Prove a saved key or link works, with one cheap read."""
    try:
        if what == "lsq":
            from apis.lsq import users as lsq_users
            users = lsq_users.fetch_all()
            return ok(message=f"LeadSquared returned {len(users)} user(s).")
        if what == "ozonetel":
            from services import dates as datelib
            day = datelib.today_ist().strftime("%Y-%m-%d")
            rows = ozonetel.fetch_day(day)
            sales = ozonetel.to_frame(rows)
            return ok(message=f"Ozonetel returned {len(rows):,} call(s) for today, "
                              f"{len(sales):,} of them sales incoming "
                              f"({', '.join(ozonetel.skills())}).")
        if what == "mcube_agents":
            agents = dialers.load_agents()
            with_number = sum(1 for a in agents if str(a.get("emp_phone") or "").strip())
            return ok(message=f"MCube returned {len(agents)} agent(s), "
                              f"{with_number} with a dial number.")
        if what == "mcube":
            campaigns = mcube_autodialers.fetch_campaigns()
            note = "" if config.get("MCUBE_API_KEY") else \
                " The API key for pushing is not saved yet."
            return ok(message=f"MCube returned {len(campaigns)} campaign(s).{note}")
        if what == "acefone":
            lists = acefone_lists.fetch_all()
            message = f"Acefone returned {len(lists)} lead list(s)."
            if config.get("ACEFONE_SKILL_LIST_ID"):
                from apis.acefone import skills as acefone_skills
                skills = acefone_skills.fetch_skills(config.get("ACEFONE_SKILL_LIST_ID"))
                message += f" The skill list has {len(skills)} skill(s)."
            else:
                message += " No skill list id yet, so pushed leads would arrive unrouted."
            return ok(message=message)
        if what == "salesiq":
            return ok(message=salesiq.test_connection())
        if what == "sheet":
            key = str(request.args.get("key") or "")
            if key not in SHEET_LINKS:
                return fail("Unknown sheet.", 404)
            url = config.get(key)
            if not url:
                return fail("Nothing saved for this link yet.")
            frame = sheets.read_csv(url, label=SHEET_LINKS[key], force=True)
            columns = ", ".join(map(str, frame.columns[:8]))
            more = "…" if len(frame.columns) > 8 else ""
            return ok(message=f"Read {len(frame):,} row(s). Columns: {columns}{more}")
        return fail("Unknown test.", 404)
    except Exception as exc:
        return fail(f"Saved, but it did not work — {exc}", 502)


# =====================================================================
# JOBS
# =====================================================================
@app.route("/api/jobs/<job_id>/logs")
def api_job_logs(job_id):
    job = jobs.get(job_id)
    if job is None:
        return ("Unknown job.", 404)

    def stream():
        # Everything the job has already written goes out first, so a tab that
        # was closed and reopened — or a second tab — sees the whole log rather
        # than whatever happens to arrive next.
        sub, backlog = job.subscribe()
        try:
            for line in backlog:
                yield f"data: {line}\n\n"
            # A job that finished before this browser arrived must close the
            # stream here, or the page sits waiting on a stream that will never
            # speak again. Its DONE is already in the backlog when it ended
            # normally; it is only missing if the job died without finishing.
            if jobs.DONE in backlog:
                return
            if not job.running:
                yield f"data: {jobs.DONE}\n\n"
                return
            while True:
                try:
                    line = sub.get(timeout=25)
                except queue.Empty:
                    yield ": keepalive\n\n"
                    continue
                yield f"data: {line}\n\n"
                if line == jobs.DONE:
                    break
        finally:
            job.unsubscribe(sub)

    return Response(stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/jobs")
def api_jobs():
    """Running jobs first, then recently finished ones.

    A page asks for this the moment it loads: it is how a tab you navigated
    away from and came back to finds the job it was watching and picks the log
    back up, instead of showing an empty box next to a job that is still going.
    """
    return ok(jobs=jobs.recent(12), running=jobs.any_running())


@app.route("/api/jobs/<job_id>")
def api_job(job_id):
    job = jobs.get(job_id)
    if job is None:
        return fail("Unknown job.", 404)
    return ok(job=job.snapshot())


@app.route("/api/jobs/<job_id>/stop", methods=["POST"])
def api_job_stop(job_id):
    return ok(stopped=jobs.stop(job_id))


@app.route("/keepalive")
def keepalive():
    """
    Held open by every page. When the last one drops, the watchdog exits the
    process — which is what lets the no-window launcher be closed by simply
    closing the browser tab, with no stray Python left behind.
    """
    return Response(watchdog_mod.watchdog.stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# =====================================================================
# FETCH
# =====================================================================
@app.route("/api/fetch", methods=["POST"])
def api_fetch():
    """Step 1: LeadSquared, then the Ozonetel calls the master sheet lacks."""
    try:
        days, basis = _days_and_basis(body())
    except ValueError as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    try:
        config.require("LSQ_ACCESS_KEY", "LeadSquared access key")
        config.require("LSQ_SECRET_KEY", "LeadSquared secret key")
        job = jobs.start("fetch",
                         f"Fetch last {days} days ({lsq_fetch.FETCH_BASES[basis]['label']}) "
                         "+ Ozonetel",
                         pipeline.fetch, days, basis)
        return ok(job_id=job.id)
    except Exception as exc:
        return fail(exc, 500)


@app.route("/api/rules")
def api_rules():
    return ok(breach_days=config.breach_days(), dnp=config.dnp_rule(),
              dnp_caption=breach.dnp_caption(), stages=breach.BREACH_STAGES)


@app.route("/api/fetch/latest")
def api_fetch_latest():
    token = storage.latest_token()
    if not token:
        return ok(meta=None, reports={})
    return ok(meta=storage.load_meta(token), reports=storage.built_reports(token, registry.ORDER))


@app.route("/api/fetch/result/<job_id>")
def api_fetch_result(job_id):
    job = jobs.get(job_id)
    if job is None:
        return fail("That fetch has expired.", 404)
    if job.result is None:
        return fail(job.errors[0] if job.errors else "The fetch did not finish.", 409)
    return ok(meta=job.result)


@app.route("/download/<token>/snapshot")
def download_snapshot(token):
    """The raw LeadSquared snapshot, for checking a value by hand."""
    try:
        token = _token(token)
        frame = storage.load_frame(token)
        out = frame[[c for c in frame.columns if not c.startswith("_")]].fillna("")
        stamp = datetime.now().strftime("%Y%m%d_%H%M")
        return _send(out, token, f"LSQ_Snapshot_{stamp}.csv", excel=False)
    except (FileNotFoundError, ValueError) as exc:
        return (str(exc), 404)


# =====================================================================
# REPORTS
# =====================================================================
@app.route("/api/reports")
def api_reports():
    token = storage.latest_token()
    catalogue = registry.catalogue()
    return ok(reports=catalogue,
              token=token,
              meta=storage.load_meta(token) if token else None,
              built=storage.built_reports(token, registry.ORDER) if token else {})


@app.route("/api/reports/<key>/build", methods=["POST"])
def api_build(key):
    """Build (or rebuild) one report from the current snapshot."""
    try:
        module = registry.get(key)
    except ValueError as exc:
        return fail(exc, 404)
    data = body()
    try:
        token = _token(data.get("token"))
        _save_rules(data.get("rules"))
    except FileNotFoundError as exc:
        return fail(exc, 404)
    except ValueError as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    try:
        job = jobs.start(f"build:{module.KEY}", f"Build {module.TITLE}",
                         registry.run, module.KEY, token, None, bool(data.get("refresh")))
        return ok(job_id=job.id, token=token)
    except Exception as exc:
        return fail(exc, 500)


@app.route("/api/build-all", methods=["POST"])
def api_build_all():
    """Step 2: all three reports from the current snapshot, in one job."""
    data = body()
    try:
        token = _token(data.get("token"))
        _save_rules(data.get("rules"))
    except FileNotFoundError as exc:
        return fail(exc, 404)
    except ValueError as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    keys = [k for k in (data.get("reports") or []) if k in registry.BY_KEY] or None
    before = {k: int((storage.report_summary(token, k) or {}).get("pending") or 0)
              for k in registry.ORDER if storage.report_summary(token, k)}
    job = jobs.start("build", "Build the reports", pipeline.build_all, token, keys, before)
    return ok(job_id=job.id, token=token)


@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    """
    Step 4: fetch again (LeadSquared and Ozonetel) and rebuild everything, in
    one job. The log ends with whether the unmatched count went down.
    """
    data = body()
    try:
        days, basis = _days_and_basis(data)
        _save_rules(data.get("rules"))
    except ValueError as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    try:
        config.require("LSQ_ACCESS_KEY", "LeadSquared access key")
        config.require("LSQ_SECRET_KEY", "LeadSquared secret key")
    except Exception as exc:
        return fail(exc)
    keys = [k for k in (data.get("reports") or []) if k in registry.BY_KEY] or None
    job = jobs.start("refresh", f"Fetch and rebuild ({days} days)",
                     pipeline.rebuild, days, basis, keys)
    return ok(job_id=job.id)


@app.route("/api/reports/<key>/summary")
def api_report_summary(key):
    try:
        module = registry.get(key)
        token = _token(request.args.get("token"))
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)
    summary = storage.report_summary(token, module.KEY)
    if summary is None:
        return ok(token=token, summary=None)
    return ok(token=token, summary=summary)


@app.route("/api/reports/<key>/preview")
def api_report_preview(key):
    try:
        token = _token(request.args.get("token"))
        frame = registry.output_frame(token, key)
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)
    limit = max(1, min(int(request.args.get("limit") or 50), 500))
    return ok(token=token, columns=list(frame.columns), rows=int(len(frame)),
              preview=frame.head(limit).astype(str).to_dict("records"))


@app.route("/download/<token>/<key>/<which>")
def download_report(token, key, which):
    try:
        token = _token(token)
        module = registry.get(key)
        stamp = datetime.now().strftime("%Y%m%d_%H%M")
        if which in ("xlsx", "csv"):
            frame = registry.output_frame(token, key)
            name = f"{module.FILENAME}_{stamp}.{which}"
            return _send(frame, token, name, excel=(which == "xlsx"))
        if which == "pending":
            frame = registry.pending_frame(token, key)
            return _send(frame, token, f"{module.FILENAME}_Pending_{stamp}.csv", excel=False)
        return ("Unknown download.", 404)
    except (FileNotFoundError, ValueError) as exc:
        return (str(exc), 404)


@app.route("/api/reports/<key>/push", methods=["POST"])
def api_push(key):
    try:
        module = registry.get(key)
        token = _token(body().get("token"))
        frame = registry.output_frame(token, key)
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)

    url = config.get(module.PUSH_SETTING)
    if not url:
        return fail(f"No Apps Script link is set for {module.TITLE}. Open Settings and paste it.")
    if any(j["kind"] == f"push:{module.KEY}" for j in jobs.active()):
        return fail(f"{module.TITLE} is already being pushed.")

    def run(job):
        job.log(f"Pushing {module.TITLE} — {len(frame):,} row(s), "
                f"{len(frame.columns)} column(s), ending with Zip Intent and "
                "Zip Intent Justification.")
        result = sheets.push(url, frame, label=f"the {module.TITLE} sheet",
                             log=job.log, stop=job.check_stop)
        job.log(f"Pushed {result['rows']:,} row(s) in {result['requests']} request(s). "
                "Refresh the Power BI dataset to see it there.")
        job.result = result

    job = jobs.start(f"push:{module.KEY}", f"Push {module.TITLE}", run)
    return ok(job_id=job.id)


# =====================================================================
# LSQ UPDATE — the leads that did not map
# =====================================================================
@app.route("/api/update/pending")
def api_pending():
    try:
        token = _token(request.args.get("token"))
    except FileNotFoundError as exc:
        return fail(exc, 404)

    per_report = {}
    for key in registry.ORDER:
        frame = registry.pending_frame(token, key)
        module = registry.get(key)
        per_report[key] = {
            "title": module.TITLE,
            "report_type": module.REPORT_TYPE,
            "built": storage.report_summary(token, key) is not None,
            "rows": int(len(frame)),
            "keyed_on": "Prospect ID" if key == "high_priority" else "Phone Number",
            "sample": frame.head(15).astype(str).to_dict("records"),
        }

    combined = registry.combined_pending(token)
    return ok(token=token, reports=per_report, total=int(len(combined)),
              preview=combined.head(50).astype(str).to_dict("records"))


@app.route("/download/<token>/lsq-update")
def download_lsq_update(token):
    try:
        token = _token(token)
        frame = registry.combined_pending(token)
        stamp = datetime.now().strftime("%Y%m%d_%H%M")
        return _send(frame, token, f"LSQ_Report_Type_Update_{stamp}.csv", excel=False)
    except (FileNotFoundError, ValueError) as exc:
        return (str(exc), 404)


# =====================================================================
# DIALERS — MCube / Acefone files and pushes for flagged leads
# =====================================================================
@app.route("/api/dialers/counts")
def api_dialer_counts():
    try:
        token = _token(request.args.get("token"))
    except FileNotFoundError as exc:
        return fail(exc, 404)
    try:
        last = storage.report_summary(token, "dialer")
    except ValueError:
        last = None
    return ok(token=token, last=last, **dialers.counts(token),
              ready={"mcube": config.status()["mcube"],
                     "mcube_agents": config.status()["mcube_agents"],
                     "acefone": config.status()["acefone"],
                     "acefone_skills": bool(config.get("ACEFONE_SKILL_LIST_ID"))})


@app.route("/api/dialers/files", methods=["POST"])
def api_dialer_files():
    data = body()
    try:
        token = _token(data.get("token"))
        summary = dialers.make_files(token, data.get("categories") or [],
                                     data.get("reports") or None,
                                     owners=data.get("owners") or None)
        return ok(token=token, summary=summary)
    except FileNotFoundError as exc:
        return fail(exc, 404)
    except ValueError as exc:
        return fail(exc)
    except Exception as exc:
        return fail(f"Could not make the dialer files: {exc}", 500)


@app.route("/api/dialers/owners", methods=["POST"])
def api_dialer_owners():
    """The caller picker: roster callers by team, with their leads in the selection."""
    data = body()
    try:
        token = _token(data.get("token"))
        if data.get("refresh"):
            roster.clear_cache()
        return ok(**dialers.owner_summary(token, data.get("categories") or [],
                                          data.get("reports") or None))
    except FileNotFoundError as exc:
        return fail(exc, 404)
    except Exception as exc:
        return fail(f"Could not read the roster: {exc}", 502)


@app.route("/api/dialers/upload/<target>", methods=["POST"])
def api_dialer_upload(target):
    """Push a hand-picked CSV instead of the file made here."""
    if target not in ("mcube", "acefone"):
        return fail("Unknown dialer.", 404)
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return fail("Choose a CSV file.")
    try:
        token = _token(request.form.get("token"))
        return ok(**dialers.save_upload(token, target, uploaded))
    except FileNotFoundError as exc:
        return fail(exc, 404)
    except ValueError as exc:
        return fail(exc)
    except Exception as exc:
        return fail(f"Could not read that file: {exc}")


@app.route("/api/dialers/acefone/skill-lists")
def api_acefone_skill_lists():
    try:
        from apis.acefone import skills as acefone_skills
        return ok(skill_lists=[{"id": x["id"], "name": x["name"]}
                               for x in acefone_skills.fetch_skill_lists()],
                  selected=config.get("ACEFONE_SKILL_LIST_ID"))
    except Exception as exc:
        return fail(f"Could not load Acefone skill lists: {exc}", 502)


@app.route("/api/dialers/acefone/skill-list", methods=["POST"])
def api_acefone_pick_skill_list():
    """Remember the skill list owners are matched against."""
    try:
        config.update({"ACEFONE_SKILL_LIST_ID": str(body().get("id") or "").strip()})
        return ok(selected=config.get("ACEFONE_SKILL_LIST_ID"))
    except Exception as exc:
        return fail(exc)


@app.route("/api/dialers/acefone/skill-mapping", methods=["POST"])
def api_acefone_skill_mapping():
    data = body()
    try:
        token = _token(data.get("token"))
        return ok(**dialers.skill_mapping(token, data.get("skill_list_id") or None,
                                          data.get("overrides"),
                                          data.get("source") or "made"))
    except (FileNotFoundError, OSError):
        return fail("Make the dialer files first, or upload an Acefone file.")
    except Exception as exc:
        return fail(f"Could not map callers to skills: {exc}", 502)


@app.route("/download/<token>/dialer/<which>")
def download_dialer(token, which):
    names = {"mcube": "MCUBE_Upload", "acefone": "Acefone_Upload",
             "skipped": "MCUBE_Skipped_No_Agent", "leads": "Dialer_Leads"}
    if which not in names:
        return ("Unknown download.", 404)
    try:
        token = _token(token)
        frame, _ = dialers.load_file(token, which)
        stamp = datetime.now().strftime("%Y%m%d_%H%M")
        return _send(frame, token, f"{names[which]}_{stamp}.csv", excel=False)
    except (FileNotFoundError, ValueError, OSError):
        return ("Make the dialer files first.", 404)


@app.route("/api/dialers/mcube/campaigns")
def api_mcube_campaigns():
    try:
        return ok(campaigns=[{"id": c["id"], "name": c["name"]}
                             for c in mcube_autodialers.fetch_campaigns()])
    except Exception as exc:
        return fail(f"Could not load MCube campaigns: {exc}", 502)


@app.route("/api/dialers/acefone/lists")
def api_acefone_lists():
    try:
        return ok(lists=[{"id": i["id"], "name": i["name"]} for i in acefone_lists.fetch_all()])
    except Exception as exc:
        return fail(f"Could not load Acefone lead lists: {exc}", 502)


@app.route("/api/dialers/push", methods=["POST"])
def api_dialer_push():
    data = body()
    target = str(data.get("target") or "").strip().lower()
    target_id = str(data.get("id") or "").strip()
    name = str(data.get("name") or target_id).strip()
    source = "upload" if data.get("source") == "upload" else "made"
    if target not in ("mcube", "acefone"):
        return fail("Push to MCube or Acefone.")
    if not target_id:
        return fail("Choose a campaign." if target == "mcube" else "Choose a lead list.")

    def number(key, low, high, label):
        raw = str(data.get(key) or "").strip()
        if not raw:
            return None
        if not raw.isdigit() or not (low <= int(raw) <= high):
            raise ValueError(f"{label} must be a whole number from {low} to {high}.")
        return int(raw)

    try:
        token = _token(data.get("token"))
        dialers.load_file(token, f"{target}_upload" if source == "upload" else target)
    except (FileNotFoundError, ValueError, OSError):
        return fail("Upload a file first." if source == "upload" else "Make the dialer files first.")
    try:
        if target == "mcube":
            args = (token, target_id, name,
                    number("retry_attempts", 1, 20, "Retry attempts"),
                    number("retry_time", 1, 1440, "Retry time"),
                    number("priority", 1, 999, "Priority"), source)
        else:
            args = (token, target_id, name, number("priority", 1, 30, "Priority"),
                    data.get("skill_map") or None, data.get("skill_list_id") or None, source)
    except ValueError as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    runner = dialers.push_mcube if target == "mcube" else dialers.push_acefone
    label = "MCube" if target == "mcube" else "Acefone"
    job = jobs.start(f"dialer:{target}", f"Push to {label} — {name}", runner, *args)
    return ok(job_id=job.id)


# =====================================================================
# SALES IQ CHATS
# =====================================================================
@app.route("/api/salesiq/options")
def api_salesiq_options():
    try:
        return ok(**salesiq.options())
    except Exception as exc:
        return fail(f"Could not open the chats database: {exc}", 500)


@app.route("/api/salesiq/fetch", methods=["POST"])
def api_salesiq_fetch():
    """Step 1: chats updated since the last fetch (or a date you pick)."""
    data = body()
    from_ms = None
    raw = str(data.get("from_date") or "").strip()
    if raw:
        try:
            from_ms = salesiq.ist_to_ms(pd.Timestamp(raw).normalize())
        except ValueError:
            return fail("That start date could not be read.")
    if not salesiq.configured():
        return fail("Zoho is not set up — add the client id, secret and refresh token on "
                    "Setup and links.")
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    job = jobs.start("salesiq:fetch", "Fetch SalesIQ chats", salesiq.fetch, from_ms)
    return ok(job_id=job.id)


@app.route("/api/salesiq/days", methods=["POST"])
def api_salesiq_days():
    """The LeadSquared look-back that covers every chat in the selection."""
    return ok(days=salesiq.days_for(body().get("filters")))


@app.route("/api/salesiq/map", methods=["POST"])
def api_salesiq_map():
    """Step 2: LeadSquared on Modified On, matched to the chats in view."""
    data = body()
    try:
        days = int(str(data.get("days") or "").strip())
    except ValueError:
        return fail("Days must be a whole number.")
    if days < 1 or days > 365:
        return fail("Days must be between 1 and 365.")
    try:
        config.require("LSQ_ACCESS_KEY", "LeadSquared access key")
        config.require("LSQ_SECRET_KEY", "LeadSquared secret key")
    except Exception as exc:
        return fail(exc)
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    job = jobs.start("salesiq:map", f"Map chats to LeadSquared ({days} days)",
                     salesiq.map_to_lsq, days, data.get("filters"))
    return ok(job_id=job.id)


@app.route("/api/salesiq/chats", methods=["POST"])
def api_salesiq_chats():
    data = body()
    try:
        frame, single = salesiq.table(data.get("filters"), merged=bool(data.get("merged", True)))
    except Exception as exc:
        return fail(f"Could not read the chats: {exc}", 500)
    limit = max(1, min(int(data.get("limit") or 200), 1000))
    offset = max(0, int(data.get("offset") or 0))
    page = frame.iloc[offset:offset + limit]
    rows = []
    for r in page.to_dict("records"):
        rows.append({
            "chat_id": r["chat_id"], "when": f"{r['_when']:%d %b %Y %H:%M}",
            "type": r["chat_type"], "source": r["source"], "attendee": r["attendee"],
            "name": r["name"], "email": r["email"], "phone": r["phone"],
            "chats": int(r.get("Chats") or 1),
            "preview": (r["conversation"] or "")[:160],
            "matched_by": r["Matched By"],
            "lsq": {c: r["LSQ " + c] for c in
                    ("Owner", "Contact Stage", "Enquired Course", "Lead Name", "Prospect ID",
                     "Last Called Date", "Report_Type")},
        })
    matched = int((frame["Matched By"] != "").sum()) if len(frame) else 0
    return ok(rows=rows, total=int(len(frame)), single=int(single), matched=matched,
              offset=offset, limit=limit)


@app.route("/api/salesiq/chat/<chat_id>")
def api_salesiq_chat(chat_id):
    """One row in full — the transcript (merged when the view is merged)."""
    merged = request.args.get("merged") == "1"
    try:
        filters = json.loads(request.args.get("filters") or "{}")
    except ValueError:
        filters = {}
    frame, _ = salesiq.table(filters, merged=merged)
    hit = frame[frame["chat_id"] == chat_id]
    if hit.empty:
        return fail("That chat is no longer in this view.", 404)
    out = salesiq.to_export(hit).iloc[0].to_dict()
    return ok(chat=out)


@app.route("/download/salesiq")
def download_salesiq():
    try:
        filters = json.loads(request.args.get("filters") or "{}")
    except ValueError:
        filters = {}
    merged = request.args.get("merged", "1") == "1"
    frame, _ = salesiq.table(filters, merged=merged)
    out = salesiq.to_export(frame)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    name = f"SalesIQ_Chats_{'merged' if merged else 'single'}_{stamp}.csv"
    path = os.path.join(storage.RUNS_DIR, name)
    out.to_csv(path, index=False, encoding="utf-8-sig")
    return send_file(path, as_attachment=True, download_name=name, mimetype="text/csv")


@app.route("/api/salesiq/delete", methods=["POST"])
def api_salesiq_delete():
    data = body()
    mode = str(data.get("mode") or "")
    if jobs.any_running():
        return fail("Something is already running — wait for it, or stop it first.")
    try:
        if mode == "older":
            day = pd.Timestamp(str(data.get("date") or "").strip())
            removed = salesiq.delete_older_than(day)
            return ok(removed=removed, message=f"Deleted {removed:,} chat(s) from before {day:%d %b %Y}.")
        if mode == "selection":
            removed = salesiq.delete_selection(data.get("filters") or {})
            return ok(removed=removed, message=f"Deleted the {removed:,} chat(s) in this selection.")
    except ValueError:
        return fail("Pick a date.")
    return fail("Unknown delete.")


# =====================================================================
# ANALYSIS
# =====================================================================
@app.route("/api/analysis/<key>/options", methods=["GET", "POST"])
def api_analysis_options(key):
    """Slicer values — POSTed with the current picks, they cascade."""
    data = body() if request.method == "POST" else {}
    try:
        token = _token(data.get("token") or request.args.get("token"))
        view = storage.load_report(token, registry.get(key).KEY)
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)
    return ok(token=token, **dashboards.options(view, key, data.get("filters")))


@app.route("/api/analysis/<key>", methods=["POST"])
def api_analysis(key):
    data = body()
    try:
        token = _token(data.get("token"))
        view = storage.load_report(token, registry.get(key).KEY)
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)
    try:
        payload = dashboards.compute(view, key, data.get("filters"))
        summary = storage.report_summary(token, key) or {}
        return ok(token=token, built_at=summary.get("built_at"),
                  fetch_days=summary.get("fetch_days"), **payload)
    except Exception as exc:
        return fail(f"Could not build the dashboard: {exc}", 500)


@app.route("/download/analysis/<key>")
def download_analysis(key):
    """The current selection as Excel: every lead with its breach reason, and
    the Data view tables."""
    try:
        module = registry.get(key)
        token = _token(request.args.get("token"))
        view = storage.load_report(token, module.KEY)
        filters = json.loads(request.args.get("filters") or "{}")
        stamp = datetime.now().strftime("%Y%m%d_%H%M")
        name = f"{module.FILENAME}_Analysis_{stamp}.xlsx"
        path = storage.export_path(token, name)
        dashboards.export(view, key, list(module.COLUMNS) + ["Zip Intent", "Zip Intent Justification"],
                          filters, path)
        return send_file(path, as_attachment=True, download_name=name,
                         mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except (ValueError, FileNotFoundError) as exc:
        return (str(exc), 404)


@app.route("/api/analysis/<key>/leads", methods=["POST"])
def api_analysis_leads(key):
    data = body()
    try:
        token = _token(data.get("token"))
        view = storage.load_report(token, registry.get(key).KEY)
    except (ValueError, FileNotFoundError) as exc:
        return fail(exc, 404)
    try:
        return ok(**dashboards.leads(view, key, data.get("filters"),
                                     panel=str(data.get("panel") or "breached"),
                                     search=data.get("search") or ""))
    except Exception as exc:
        return fail(f"Could not list those leads: {exc}", 500)


# =====================================================================
if __name__ == "__main__":
    # Only the no-window launcher turns this on: a foreground run, a container
    # or a server install must never exit just because a tab was closed.
    # A fetch or a push in flight always wins over the idle timer, so closing
    # the tab mid-push cannot truncate anything.
    if watchdog_mod.should_auto_shutdown():
        watchdog_mod.watchdog.start(is_busy=jobs.any_running)
    launcher.main(app)
