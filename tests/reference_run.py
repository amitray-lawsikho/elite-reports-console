"""Record the original Python's answers for the parity tests (tests/parity.test.js).

Runs the Reports Console's own mock data (tests/reference/tests/mock_run.py: a synthetic LeadSquared snapshot, every
sheet and Ozonetel faked) through all three reports, the pending lists, the dialer selection and the Analysis panels,
with the clock pinned, and writes inputs + outputs to tests/fixtures/reference.json.

    python3 tests/reference_run.py
"""
import json
import os
import sys

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "reference")
sys.path.insert(0, REF)
sys.path.insert(0, os.path.join(REF, "tests"))

import mock_run as M                               # noqa: E402
from services import dates, dialers                 # noqa: E402
from services import runs as storage                # noqa: E402
from services.analysis import dashboards            # noqa: E402
from services.reports import registry               # noqa: E402

NOW = M.TODAY + pd.Timedelta(hours=14, minutes=30)
dates.now_ist = lambda: NOW
dates.today_ist = lambda: NOW.normalize()
EPOCH = pd.Timestamp("1970-01-01")


def ms(v):
    return None if v is None or pd.isna(v) else int((pd.Timestamp(v) - EPOCH) / pd.Timedelta(milliseconds=1))


def jsonable(frame):
    out = []
    for rec in frame.to_dict("records"):
        row = {}
        for k, v in rec.items():
            if isinstance(v, pd.Timestamp) or (hasattr(v, "dtype") and "datetime" in str(getattr(v, "dtype", ""))):
                row[k] = ms(v)
            elif v is None or (isinstance(v, float) and pd.isna(v)) or v is pd.NaT:
                row[k] = None
            elif hasattr(v, "item"):
                row[k] = v.item()
            else:
                row[k] = v
        out.append(row)
    return out


def main():
    M.setup_fakes()
    sheets = {}
    for key in ["ROSTER_URL", "CER_COMBINED_URL", "INCOMING_MASTER_URL", "HP_CURRENT_MONTH_URL", "HP_PREVIOUS_MONTH_URL",
                "HP_REV_URL_1", "HP_REV_URL_2", "REV_SHEET_URL", "STAGE_LOG_URL"]:
        sheets[key] = M.fake_sheet(f"https://fake/{key}").to_csv(index=False)
    days = {}
    for i in range(16):
        day = (NOW.normalize() - pd.Timedelta(days=15 - i)).strftime("%Y-%m-%d")
        days[day] = M.fake_day(day)

    snap = M.SNAP.copy()
    # a real LeadSquared fetch hands the counters over as text (lsq_fetch._text); the mock has them as numbers
    for col in ("Phone call counter", "Assigned On Call Counter"):
        snap[col] = snap[col].astype(str)
    token = storage.new_token()
    storage.save_fetch(token, snap, {"token": token, "days": 30, "basis": "modified", "basis_label": "Modified On",
                                     "fetched_at": NOW.isoformat(), "zip_fields_missing": []})
    out = {"now_ist": ms(NOW), "sheets": sheets, "ozonetel_days": days, "snapshot": jsonable(snap), "reports": {}}
    for key in registry.ORDER:
        job = M.FakeJob()
        registry.run(job, key, token)
        frame = registry.output_frame(token, key)
        view = storage.load_report(token, key)
        summary = storage.report_summary(token, key)
        filters = {}
        out["reports"][key] = {
            "columns": list(frame.columns),
            "rows": frame.astype(str).to_dict("records"),
            "pending": registry.pending_frame(token, key).astype(str).to_dict("records"),
            "summary": {k: summary[k] for k in ("total", "enrolled", "conversion", "breached", "fresh", "dnp", "owners",
                                                "zip_intent", "unavailable", "rows", "pending")},
            "view": [{k: (str(r[k]) if k in r else "") for k in ("_owner", "_stage", "_follow_up", "_dial_label", "_dial_count",
                                                                 "_team", "_vertical", "_month", "_type", "_campaign", "_phone", "_reason")}
                     for r in view.to_dict("records")],
            "analysis": dashboards.compute(view, key, filters),
            "options": dashboards.options(view, key, {}),
            "leads": dashboards.leads(view, key, {}, panel="breached"),
        }
    out["combined_pending"] = registry.combined_pending(token).astype(str).to_dict("records")
    out["dialer_counts"] = dialers.counts(token)["reports"]
    leads, stats = dialers.select(token, ["breached", "dnp", "fresh"])
    out["dialer_select"] = {"leads": leads.astype(str).to_dict("records"), "stats": stats}
    os.makedirs(os.path.join(HERE, "fixtures"), exist_ok=True)
    with open(os.path.join(HERE, "fixtures", "reference.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, default=lambda v: v.item() if hasattr(v, "item") else str(v))
    print("reports:", {k: len(v["rows"]) for k, v in out["reports"].items()}, "dialer leads:", len(leads))


if __name__ == "__main__":
    main()
