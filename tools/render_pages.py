"""Render ui/templates/*.html (the Reports Console's Jinja pages) into static web/*.html, once, at build time.
Values the Flask server used to fill in get their spec defaults here; the browser replaces them with the signed-in
person's own settings (src/client/main.js)."""
import json
import os
import re
import shutil

from jinja2 import Environment, FileSystemLoader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ROOT, "ui")
WEB = os.path.join(ROOT, "web")

REPORTS = [  # registry.catalogue() — push_configured is filled in by the browser
    {"key": "chat_email_referral", "title": "Chat, Email & Referral", "subtitle": "Hand-kept enquiry sheet, enriched from LeadSquared and the enrollment tracker.",
     "report_type": "Chat/Email/Referral", "needs_upload": None, "push_configured": False, "filename": "Chat_Email_Referral"},
    {"key": "incoming", "title": "Incoming Leads", "subtitle": "Sales incoming calls from the Ozonetel API, merged with the master sheet and resolved against LeadSquared.",
     "report_type": "Incoming", "needs_upload": None, "push_configured": False, "filename": "Incoming_Report"},
    {"key": "high_priority", "title": "High Priority Leads", "subtitle": "This month's and last month's lead sheets, resolved against LeadSquared by Prospect ID.",
     "report_type": "High Priority", "needs_upload": None, "push_configured": False, "filename": "High_Priority_Report"},
]
FETCH_BASES = [{"key": "assigned", "label": "Assigned On", "schema": "mx_Assigned_On"},
               {"key": "modified", "label": "Modified On", "schema": "ModifiedOn"},
               {"key": "created", "label": "Created On", "schema": "CreatedOn"},
               {"key": "last_called", "label": "Last Called On", "schema": "mx_Last_Called_Date_DT"}]
CONTEXT = {"cred_status": {}, "lsq_ready": True, "reports": REPORTS, "default_fetch_days": 30, "fetch_bases": FETCH_BASES,
           "default_fetch_basis": "modified", "breach_days": {"Follow Up For Closure": 2, "Counselled lead": 2, "Call Back Later": 2},
           "dnp_rule": {"counter": "phone", "op": "lt", "value": "4"}, "settings_defaults": {"retry_attempts": 3, "retry_time": 180},
           "app_version": "online", "url_for": lambda endpoint, filename="": f"/static/{filename}"}


def post(html):
    # downloads used to be plain navigations to the server; the browser builds them now
    html = re.sub(r"window\.location(?:\.href)? = (`/download/[^`]*`);", r"lcDownload(\1);", html)
    # this person's own MCube retry defaults (main.js sets ERC_DEFAULTS from their settings)
    html = html.replace('const s = {"retry_attempts": 3, "retry_time": 180};', 'const s = window.ERC_DEFAULTS ? window.ERC_DEFAULTS() : {"retry_attempts": 3, "retry_time": 180};')
    # the report list's "push configured" depends on the shared links: main.js fills it in once settings are loaded
    html = html.replace("const REPORTS = [", "const REPORTS = window.ERC_REPORTS = [")
    return html


def page(env, tpl, out, **extra):
    html = env.get_template(tpl).render(**{**CONTEXT, **extra})
    path = os.path.join(WEB, out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(post(html))


def redirect(out, to):
    path = os.path.join(WEB, out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={to}"><script>location.replace({json.dumps(to)})</script>')


def main():
    env = Environment(loader=FileSystemLoader(os.path.join(UI, "templates")), autoescape=False)
    os.makedirs(WEB, exist_ok=True)
    page(env, "reports.html", "index.html", active="reports")
    page(env, "setup.html", "setup.html", active="setup")
    page(env, "settings.html", "settings.html", active="settings")
    for r in REPORTS:
        page(env, "analysis.html", f"analysis/{r['key']}.html", active="analysis", report={**r, "columns": []})
    redirect("analysis/index.html", f"/analysis/{REPORTS[0]['key']}")
    redirect("update.html", "/")
    for sub in ("css", "js"):
        dst = os.path.join(WEB, "static", sub)
        os.makedirs(dst, exist_ok=True)
        for name in os.listdir(os.path.join(UI, "static", sub)):
            shutil.copy(os.path.join(UI, "static", sub, name), os.path.join(dst, name))
    with open(os.path.join(WEB, "404.html"), "w", encoding="utf-8") as fh:
        fh.write('<!doctype html><meta charset="utf-8"><title>Not found · Elite Reports Console</title>'
                 '<body style="font-family:Inter,Arial;background:#0a0a0a;color:#ededed;display:grid;place-items:center;height:100vh">'
                 '<div><h1>Page not found</h1><p><a style="color:#8fb6ff" href="/">Back to the Elite Reports Console</a></p></div>')
    print(f"rendered {3 + len(REPORTS)} pages")


if __name__ == "__main__":
    main()
