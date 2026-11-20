# -*- coding: utf-8 -*-
"""
tests/test_routes.py
====================
Every page renders and every API answers, with a report already built.

Templates fail at request time, not import time, so a typo in a Jinja block
only shows up when the page is actually asked for — which is what this does.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tests.mock_run as mock   # noqa: E402  (sets up the fakes)

import config                                  # noqa: E402
from services import roster, sheets            # noqa: E402
from services import runs as storage           # noqa: E402
from services.reports import registry          # noqa: E402

FAILURES = []


def check(label, condition, detail=""):
    print(f"  [{'PASS' if condition else 'FAIL'}] {label}" + (f"  ({detail})" if not condition else ""))
    if not condition:
        FAILURES.append(label)


def main():
    mock.setup_fakes()

    token = storage.new_token()
    storage.save_fetch(token, mock.SNAP, {
        "token": token, "days": 30, "basis": "modified", "basis_label": "Modified On",
        "fetched_at": "2026-09-18T10:00:00", "stats": {"rows": len(mock.SNAP), "tagged": 60,
        "untagged": 0, "zip_intent": 45, "no_last_call": 0, "report_types": {}},
        "zip_fields_missing": []})

    for key in registry.ORDER:
        job = mock.FakeJob()
        registry.run(job, key, token)

    import app as application
    client = application.app.test_client()

    print("\n=== PAGES ===")
    for path in ["/", "/analysis", "/analysis/chat_email_referral",
                 "/analysis/incoming", "/analysis/high_priority", "/setup", "/settings"]:
        res = client.get(path, follow_redirects=True)
        check(f"GET {path}", res.status_code == 200, f"HTTP {res.status_code}")
        body = res.get_data(as_text=True)
        check(f"GET {path} — rendered, not a Jinja error",
              "Traceback" not in body and "jinja2" not in body.lower())

    print("\n=== API ===")
    for path in ["/api/health", "/api/settings", "/api/reports", "/api/fetch/latest",
                 "/api/update/pending", "/api/roster",
                 "/api/analysis/incoming/options",
                 "/api/reports/incoming/summary", "/api/reports/incoming/preview",
                 "/api/rules", "/api/dialers/counts"]:
        res = client.get(path)
        check(f"GET {path}", res.status_code == 200 and res.get_json().get("ok"),
              f"HTTP {res.status_code} {res.get_data(as_text=True)[:160]}")

    for key in registry.ORDER:
        res = client.post(f"/api/analysis/{key}", json={"token": token})
        check(f"POST /api/analysis/{key}", res.status_code == 200 and res.get_json().get("ok"),
              res.get_data(as_text=True)[:160])
        res = client.post(f"/api/analysis/{key}/leads",
                          json={"token": token, "panel": "breached"})
        check(f"POST /api/analysis/{key}/leads", res.status_code == 200)

    res = client.get("/update")
    check("the old update page sends you to Reports", res.status_code == 302
          and res.headers["Location"].endswith("/"), str(res.status_code))
    body = client.get("/analysis/incoming").get_data(as_text=True)
    check("the Power BI line is gone from Analysis", "Power BI page" not in body)
    body = client.get("/").get_data(as_text=True)
    check("the Reports page has all four steps",
          all(t in body for t in ("Fetch", "Build the reports", "Update LeadSquared", "Rebuild")))
    check("no Ozonetel upload on the page",
          'id="file-incoming"' not in body and "Ozonetel call records" not in body)
    check("the MCube and Acefone push panels are on the page",
          'id="mcubeCard"' in body and 'id="acefoneCard"' in body)

    res = client.post("/api/analysis/incoming/options",
                      json={"token": token, "filters": {"team": ["Growth"]}})
    owners = next(s["values"] for s in res.get_json()["slicers"] if s["key"] == "owner")
    check("POSTed options cascade", set(owners) <= {"Suhail Showkat", "Salma Mallick"},
          str(owners))

    res = client.get(f"/api/analysis/chat_email_referral/options?token={token}").get_json()
    check("Chat/Email/Referral has Team and Vertical slicers",
          {"team", "vertical"} <= {sl["key"] for sl in res["slicers"]}, str([sl["key"] for sl in res["slicers"]]))
    check("the Analysis pages open on team Elite", res.get("default_team") == "Elite")

    print("\n=== RULES DIALOG ===")
    res = client.post("/api/build-all", json={"token": token, "rules": {
        "breach_days": {"Follow Up For Closure": "x"}}})
    check("bad breached days are refused", res.status_code == 400)
    res = client.post("/api/build-all", json={"token": token, "rules": {
        "dnp": {"counter": "phone", "op": "eq", "value": "two"}}})
    check("a bad DNP value is refused", res.status_code == 400)
    res = client.post("/api/build-all", json={"token": token, "rules": {
        "breach_days": {"Follow Up For Closure": "2", "Counselled lead": "5",
                        "Call Back Later": "2"},
        "dnp": {"counter": "assigned", "op": "lt", "value": "3"}}})
    check("build-all starts", res.status_code == 200, res.get_data(as_text=True)[:200])
    from services import jobs as job_registry
    built_job = job_registry.get(res.get_json()["job_id"])
    built_job.thread.join(timeout=120)
    check("build-all finished", built_job.status == "done", built_job.status)
    rules = client.get("/api/rules").get_json()
    check("the dialog's choices were remembered",
          rules["breach_days"]["Counselled lead"] == 5 and rules["dnp"]["counter"] == "assigned",
          str(rules))
    summary = client.get("/api/reports/incoming/summary").get_json()["summary"]
    check("the build recorded the rules it used",
          summary["rules"]["dnp_caption"] == "Assigned On Call Counter less than 3",
          str(summary.get("rules")))
    client.post("/api/build-all", json={"token": token, "rules": {
        "breach_days": {"Counselled lead": "2"},
        "dnp": {"counter": "phone", "op": "lt", "value": "4"}}})
    job_registry.latest_of("build").thread.join(timeout=120)

    print("\n=== DIALERS ===")
    res = client.post("/api/dialers/files", json={"token": token, "categories": []})
    check("no category is refused", res.status_code == 400)
    res = client.post("/api/dialers/files", json={"token": token,
                                                  "categories": ["breached", "dnp", "fresh"]})
    check("dialer files made", res.status_code == 200 and res.get_json()["summary"]["leads"] > 0,
          res.get_data(as_text=True)[:200])
    for which in ("mcube", "acefone", "leads", "skipped"):
        r = client.get(f"/download/{token}/dialer/{which}")
        check(f"download dialer/{which}", r.status_code == 200 and len(r.data) > 30,
              f"HTTP {r.status_code}")
    res = client.post("/api/dialers/push", json={"token": token, "target": "mcube"})
    check("push needs a campaign", res.status_code == 400)
    res = client.post("/api/dialers/push", json={"token": token, "target": "mcube", "id": "1",
                                                  "retry_attempts": "abc"})
    check("a bad retry value is refused", res.status_code == 400)
    res = client.post("/api/dialers/owners", json={"token": token,
                                                   "categories": ["breached", "dnp", "fresh"]})
    callers = res.get_json()["callers"]
    check("the caller picker lists roster callers with counts",
          res.status_code == 200 and any(c["leads"] for c in callers), str(callers)[:200])
    one = next(c["caller"] for c in callers if c["leads"])
    res = client.post("/api/dialers/files", json={"token": token, "categories": ["breached", "dnp", "fresh"],
                                                  "owners": [one]})
    leads = client.get(f"/download/{token}/dialer/leads").get_data(as_text=True)
    check("files for one caller hold only that caller",
          res.status_code == 200 and all(one in line for line in leads.strip().splitlines()[1:]),
          leads[:300])
    import io
    res = client.post("/api/dialers/upload/mcube", data={"token": token, "file": (
        io.BytesIO(b"Number,Name,Source,Agent Number,Ref Id,Priority\n9000000001,A,Priya Singh,800,x,1\n"),
        "mine.csv")}, content_type="multipart/form-data")
    check("an MCube file can be uploaded", res.status_code == 200 and res.get_json()["rows"] == 1,
          res.get_data(as_text=True)[:200])
    res = client.post("/api/dialers/upload/acefone", data={"token": token, "file": (
        io.BytesIO(b"Name\nA\n"), "bad.csv")}, content_type="multipart/form-data")
    check("a file without Phone Number is refused", res.status_code == 400)
    res = client.get(f"/download/analysis/incoming?token={token}&filters=%7B%7D")
    check("the Analysis download is an Excel file",
          res.status_code == 200 and res.data[:2] == b"PK", str(res.status_code))
    import openpyxl
    book = openpyxl.load_workbook(io.BytesIO(res.data))
    check("it holds the leads and the data view",
          book.sheetnames[0] == "Leads" and "Breached leads" in book.sheetnames, str(book.sheetnames))
    heads = [c.value for c in book["Leads"][1]]
    check("the leads carry the breach reason", "Why (breach reason)" in heads, str(heads))

    print("\n=== DOWNLOADS ===")
    for key in registry.ORDER:
        for which in ("xlsx", "csv", "pending"):
            res = client.get(f"/download/{token}/{key}/{which}")
            # A small CSV is fine — a report with five unmatched leads is a
            # short file. What must not happen is an empty body or an error.
            floor = 400 if which == "xlsx" else 40
            check(f"download {key}/{which}",
                  res.status_code == 200 and len(res.data) > floor,
                  f"HTTP {res.status_code}, {len(res.data)} bytes")
            if which != "xlsx":
                check(f"download {key}/{which} has a header row",
                      res.get_data(as_text=True).splitlines()[0].count(",") >= 1)
    res = client.get(f"/download/{token}/lsq-update")
    check("download the combined update CSV", res.status_code == 200)
    text = res.get_data(as_text=True)
    check("the update CSV names all three report types",
          all(t in text for t in ("Chat/Email/Referral", "Incoming", "High Priority")))
    res = client.get(f"/download/{token}/snapshot")
    check("download the LSQ snapshot", res.status_code == 200)

    print("\n=== JOBS AND THE REBUILD PASS ===")
    res = client.get("/api/jobs")
    check("GET /api/jobs", res.status_code == 200 and res.get_json().get("ok"))

    # A finished job must still hand over its whole log, and must terminate the
    # stream — that is what makes the log survive a tab switch.
    from services import jobs as job_registry
    done = job_registry.start("test", "A finished job",
                              lambda job: [job.log(f"line {i}") for i in range(5)])
    done.thread.join(timeout=5)
    listing = client.get("/api/jobs").get_json()["jobs"]
    check("a finished job is still listed", any(j["id"] == done.id for j in listing))

    stream = client.get(f"/api/jobs/{done.id}/logs")
    text = stream.get_data(as_text=True)
    check("the log replays in full for a browser that arrives late",
          all(f"line {i}" in text for i in range(5)), text[:200])
    check("the replayed stream terminates", "__DONE__" in text)

    # And twice over: two tabs must not steal each other's lines.
    again = client.get(f"/api/jobs/{done.id}/logs").get_data(as_text=True)
    check("a second reader gets the same log, not the leftovers",
          all(f"line {i}" in again for i in range(5)))

    res = client.post("/api/refresh", json={"days": 0})
    check("the rebuild pass validates its days", res.status_code == 400)

    print("\n=== FAILURE PATHS ===")
    check("an unknown report 404s", client.get("/api/reports/nope/summary").status_code == 404)
    check("an unknown download 404s",
          client.get(f"/download/{token}/incoming/nope").status_code == 404)
    check("a bad token cannot escape the runs folder",
          client.get("/download/..%2F..%2Fetc/incoming/csv").status_code in (404, 308, 400))
    res = client.post("/api/fetch", json={"days": 999})
    check("a silly day count is refused", res.status_code == 400)
    res = client.post("/api/settings", json={"CER_PUSH_URL": "not-a-url"})
    check("a malformed link is refused", res.status_code == 400,
          res.get_data(as_text=True)[:120])

    print("\n" + "=" * 60)
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S): " + ", ".join(FAILURES))
        sys.exit(1)
    print("Everything passed.")


if __name__ == "__main__":
    main()
