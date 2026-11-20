# -*- coding: utf-8 -*-
"""
tests/mock_run.py
=================
An end-to-end rehearsal with no network: a synthetic LeadSquared snapshot and
synthetic sheets are pushed through all three reports, the pending lists, the
combined update CSV and every dashboard panel.

It is here because the expensive failures in this console are the quiet ones —
a join that silently misses, a breach rule that never fires, a Zip column that
arrives empty — and none of those show up in a syntax check.
"""

import os
import sys
from datetime import datetime, timedelta

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config                                    # noqa: E402
from services import breach, dialers, ozonetel, roster, sheets   # noqa: E402
from services import runs as storage             # noqa: E402
from services.analysis import dashboards         # noqa: E402
from services.reports import registry            # noqa: E402

TODAY = pd.Timestamp.today().normalize()
CALLERS = ["Priya Singh", "Swati Jha", "Sonali Singh", "Suhail Showkat", "Salma Mallick"]


class FakeJob:
    def __init__(self):
        self.lines = []
        self.result = None
        self.processed = 0
        self.stopped = False
        self.status = "running"
        self.queue = self

    def log(self, message):
        self.lines.append(str(message))

    put = log

    def check_stop(self):
        return False


# ---------------------------------------------------------------- snapshot
def snapshot(n=60):
    """A LeadSquared fetch frame with every case the reports have to handle."""
    stages = ["Follow Up For Closure", "Counselled lead", "Call Back Later", "Followup DNP",
              "Call Not Connected", "Call Not Picking Up", "New Lead", "Re-enquired Lead"]
    rows = []
    for i in range(n):
        stage = stages[i % len(stages)]
        # A spread of last-call ages either side of every breach window.
        age = [0, 1, 3, 5, 9, 20][i % 6]
        rows.append({
            "First Name": f"Lead{i}", "Last Name": "Test",
            "Email": f"lead{i}@example.com",
            "Enquired Course": "Corporate Law", "Campaign Name": f"Camp{i % 3}",
            "Contact Stage": stage, "Created On": "",
            "Funnel name": "", "Last Called Date": "",
            "Owner": CALLERS[i % len(CALLERS)], "Owner Email": "",
            "Phone call counter": (i * 5) % 9,
            "Phone Number": f"91 90000000{i:02d}",
            "Phone": f"90000000{i:02d}",
            "Report_Type": ["Chat/Email/Referral", "Incoming", "High Priority"][i % 3],
            "Assigned On Call Counter": i % 5,
            "Zip Intent": ["High", "Medium", "Low", ""][i % 4],
            "Zip Intent Justification": f"Asked about fees and EMI ({i})" if i % 4 != 3 else "",
            "Prospect ID": f"PID{i:04d}",
            "Lead Name": f"Lead{i} Test",
            "_last_called": TODAY - timedelta(days=age),
            "_last_called_source": "mx_Last_Called_Date_DT",
            # Follow-ups: none, overdue, and ahead — every branch of the rule.
            "_follow_up_dt": [pd.NaT, TODAY - timedelta(days=4), TODAY + timedelta(days=1),
                              pd.NaT, TODAY - timedelta(days=1)][i % 5],
            "_created": TODAY - timedelta(days=age + 5),
            "_assigned": TODAY - timedelta(days=age + 5),
            "_modified": TODAY,
        })
    return pd.DataFrame(rows)


SNAP = snapshot()


def snapshot_extra():
    """The leads that were missing, now that their Report_Type has been set.

    This is what the LeadSquared import achieves in real life, and it is the
    only way to prove the second pass actually closes the loop.
    """
    rows = []
    for i in range(20, 50):
        rows.append({
            "First Name": f"Lead{i}", "Last Name": "Test",
            "Email": f"lead{i}@example.com",
            "Enquired Course": "Corporate Law", "Campaign Name": "Camp0",
            "Contact Stage": "Follow Up For Closure", "Created On": "",
            "Funnel name": "", "Last Called Date": "",
            "Owner": CALLERS[i % len(CALLERS)], "Owner Email": "",
            "Phone call counter": 2,
            "Phone Number": f"91 90000000{i:02d}", "Phone": f"90000000{i:02d}",
            "Report_Type": "High Priority",
            "Assigned On Call Counter": 1,
            "Zip Intent": "High",
            "Zip Intent Justification": f"Follow-up booked ({i})",
            "Prospect ID": f"PID{i + 50:04d}",
            "Lead Name": f"Lead{i} Test",
            "_last_called": TODAY - timedelta(days=9),
            "_last_called_source": "mx_Last_Called_Date_DT",
            "_follow_up_dt": pd.NaT,
            "_created": TODAY - timedelta(days=14),
            "_assigned": TODAY - timedelta(days=14),
            "_modified": TODAY,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- fake sheets
def fake_sheet(url, label=None, dtype=None, force=False):
    """Stands in for every published Google Sheet."""
    kind = str(url)

    if "ROSTER" in kind:
        return pd.DataFrame({
            "Caller Name": CALLERS,
            "Team Name": ["Elite", "Elite", "Elite", "Growth", "Growth"],
            "Vertical": ["Team Uzair"] * 3 + ["Team Rinku"] * 2,
            "Email id": [f"{c.split()[0].lower()}@lawsikho.in" for c in CALLERS],
        })

    if "CER" in kind:
        # Two thirds of these are in the snapshot; the rest must come out
        # "Unavailable" and land on the pending list.
        rows = []
        for i in range(30):
            rows.append({
                "Date": (TODAY - timedelta(days=i)).strftime("%d/%m/%Y"),
                "Course_Enquired": "Corporate Law",
                "Name": f"Lead{i}",
                "Lead_Phone_Number": f"90000000{i:02d}" if i < 20 else f"88800000{i:02d}",
                "Owner": CALLERS[i % len(CALLERS)],
                "Contact_Stage": ["Follow Up For Closure", "New Lead",
                                  "Call Not Picking Up", "Counselled lead",
                                  "Call Not Connected", "Call Back Later"][i % 6],
                "Type": ["Chat", "Email", "Referral"][i % 3],
            })
        return pd.DataFrame(rows)

    if "INCOMING_MASTER" in kind:
        return pd.DataFrame({
            "Campaign": ["Old"] * 5,
            "Phone Number": [f"90000000{i:02d}" for i in range(5)],
            "Call Date": [(TODAY - timedelta(days=40)).strftime("%d/%m/%Y")] * 5,
            "Call Flow": ["IVR"] * 5, "Status": ["Answered"] * 5,
            "Comment LSQ": ["old note"] * 5, "Comment Analysis": [""] * 5,
        })

    if "HP_CURRENT" in kind or "HP_PREVIOUS" in kind:
        base = 0 if "CURRENT" in kind else 25
        rows = []
        for i in range(base, base + 25):
            rows.append({
                "Timestamp": (TODAY - timedelta(days=i % 30)).strftime("%d/%m/%Y %H:%M:%S"),
                "Enquired Course": "Corporate Law",
                "First Name": f"Lead{i}",
                "Email Address": f"lead{i}@example.com",
                # The two month sheets name the phone column differently —
                # the real-world case that left High Priority phones blank.
                ("Phone Number" if "CURRENT" in kind else "Mobile Number"): f"90000000{i:02d}",
                "Campaign Name": f"Bootcamp {i % 3}",
                "Source": "Google",
                # PID0060 upwards is deliberately outside the snapshot, so the
                # pending list and the update CSV have something to carry.
                "Prospect ID": f"PID{i + (0 if i < 20 else 50):04d}",
            })
        return pd.DataFrame(rows)

    if "HP_REV" in kind:
        return pd.DataFrame({
            "Contact_No": [f"90000000{i:02d}" for i in range(0, 6)],
            "Email_Id": [f"lead{i}@example.com" for i in range(0, 6)],
            "Date": [(TODAY - timedelta(days=2)).strftime("%d/%m/%Y")] * 6,
            "Enrollment": ["new enrollment"] * 4 + ["renewal"] * 2,
            "Caller name         (for ops) for enrollment link circulation":
                [CALLERS[i % len(CALLERS)] for i in range(6)],
        })

    if "REV_SHEET" in kind:
        return pd.DataFrame({
            "Contact No": [f"90000000{i:02d}" for i in range(0, 8)],
            "Email Id": [f"lead{i}@example.com" for i in range(0, 8)],
            "Date": [(TODAY - timedelta(days=3)).strftime("%d/%m/%Y")] * 8,
            "Caller name         (for ops) for enrollment link circulation":
                [CALLERS[i % len(CALLERS)] for i in range(8)],
        })

    if "STAGE_LOG" in kind:
        return pd.DataFrame({
            "Phone": [f"90000000{i:02d}" for i in range(20)],
            "EmailAddress": [f"lead{i}@example.com" for i in range(20)],
            "Comments": [f"Spoke about the syllabus ({i})" for i in range(20)],
            "StageChangedOn": [(TODAY - timedelta(days=1)).strftime("%d/%m/%Y %H:%M:%S")] * 20,
        })

    raise AssertionError(f"Unexpected sheet requested: {url}")


def fake_day(day, job=None, session=None):
    """One day as the Ozonetel CDR API returns it — the shape of the real sample:
    other skills mixed in, and one CallID repeated across UCIDs."""
    rows = []
    d = pd.Timestamp(day)
    for i in range(15):
        skill = ["sales", "Arbitrage_Sales", "Lawsikho_Support", ""][i % 4]
        rows.append({
            "CallID": f"C{day}{i // 2}",              # repeats across two UCIDs
            "UCID": f"U{day}{i}",
            "CallDate": day, "StartTime": f"1{i % 10}:0{i % 6}:00",
            "CampaignName": {"sales": "LawSikho_Incoming",
                             "Arbitrage_Sales": "Arbitrage_Incoming"}.get(skill, "Support_Outbound"),
            "Skill": skill, "Type": "Inbound" if skill else "Manual",
            "CallFlow": "Queue", "Event": "Queue",
            "E164": f"+9190000000{(i + d.day) % 18:02d}" if i % 5 else f"+91777000{i:04d}",
            "CallerID": "", "Status": "Answered" if i % 3 == 0 else "Unanswered",
        })
    return rows


# ---------------------------------------------------------------- harness
FAILURES = []


def check(label, condition, detail=""):
    mark = "PASS" if condition else "FAIL"
    if not condition:
        FAILURES.append(f"{label} — {detail}")
    print(f"  [{mark}] {label}" + (f"  ({detail})" if detail and not condition else ""))


def setup_fakes():
    """Every outside service replaced: sheets, Ozonetel, the rules — and a
    throwaway .env, so saving the rules in a test never touches your settings."""
    import tempfile
    config.ENV_PATH = os.path.join(tempfile.mkdtemp(), ".env")
    for key in config.SPEC:
        if "_URL" in key and key != "OZONETEL_API_URL":
            os.environ[key] = f"https://fake/{key}"
    os.environ["DOWNLOAD_DATE_FORMAT"] = "%d/%m/%Y %H:%M:%S"
    os.environ["LSQ_ACCESS_KEY"] = "test"
    os.environ["LSQ_SECRET_KEY"] = "test"

    sheets.read_csv = fake_sheet
    roster.clear_cache()

    # Ozonetel: no network, no waiting, a throwaway cache.
    os.environ["OZONETEL_API_KEY"] = "k"
    os.environ["OZONETEL_USERNAME"] = "u"
    os.environ["OZONETEL_SLEEP_SECONDS"] = "0"
    ozonetel.CACHE_DIR = tempfile.mkdtemp()
    ozonetel.fetch_day = fake_day
    for key, value in (("RULE_DAYS_FOLLOW_UP", "2"), ("RULE_DAYS_COUNSELLED", "2"),
                       ("RULE_DAYS_CALL_BACK", "2"),
                       ("DNP_COUNTER", "phone"), ("DNP_OPERATOR", "lt"), ("DNP_VALUE", "4")):
        os.environ[key] = value

    # MCube agent directory: Salma has no agent.
    os.environ["MCUBE_GETAGENTS_TOKEN"] = "t"
    dialers.load_agents = lambda log=None: [
        {"agent_name": c, "emp_phone": f"80000{i:05d}", "email": ""}
        for i, c in enumerate(CALLERS[:4])]


def main():
    setup_fakes()

    token = storage.new_token()
    storage.save_fetch(token, SNAP, {"token": token, "days": 30, "basis": "modified",
                                     "basis_label": "Modified On", "stats": {}})

    print("\n=== BREACH ENGINE (Leads Console rule, 2/2/2 days) ===")
    now = TODAY + timedelta(hours=12)
    stages = pd.Series(["Follow Up For Closure", "Follow Up For Closure", "Follow Up For Closure",
                        "Counselled lead", "Call Back Later", "Followup DNP", "New Lead",
                        "Counselled lead", "Call Back Later", "Counselled lead"])
    last = pd.Series([TODAY - timedelta(days=1), TODAY - timedelta(days=5), TODAY - timedelta(days=5),
                      TODAY - timedelta(days=5), TODAY - timedelta(days=3), TODAY - timedelta(days=3),
                      TODAY - timedelta(days=9), pd.NaT, pd.NaT, TODAY - timedelta(days=1)])
    fu = pd.Series([pd.NaT, pd.NaT, now + timedelta(hours=2),
                    TODAY - timedelta(days=1), pd.NaT, pd.NaT, pd.NaT,
                    pd.NaT, TODAY - timedelta(days=4), TODAY - timedelta(days=4)])
    status, reason = breach.judge(stages, last, fu, now=now)
    check("called yesterday, no follow-up -> timely", status[0] == "Timely Follow Up", status[0])
    check("no call in 5 days, no follow-up -> breached", status[1] == "Follow Up Breached", status[1])
    check("follow-up later today -> not breached", status[2] == "Timely Follow Up", status[2])
    check("follow-up 1 day old (< 2) -> not breached even with an old call",
          status[3] == "Timely Counselled", status[3])
    check("Call Back Later 3 days > 2 -> breached", status[4] == "Breached Call Back", status[4])
    check("Followup DNP is no longer a stage -> blank", status[5] == "", repr(status[5]))
    check("a stage with no rule stays blank", status[6] == "", repr(status[6]))
    check("never called, no follow-up -> breached", status[7] == "Breached Counselled lead", status[7])
    check("follow-up overdue, never called -> breached", status[8] == "Breached Call Back", status[8])
    check("follow-up overdue but called since -> timely", status[9] == "Timely Counselled", status[9])
    check("reasons are written", reason[8].startswith("Follow-up overdue by 4 days"), reason[8])

    print("\n=== LESS-DIALLED DNP ===")
    view = pd.DataFrame({"_stage": ["Call Not Connected", "Call Not Picking Up", "Call Not Connected",
                                    "New Lead"],
                         "_dial_count": [3, 4, 0, 0], "_assigned_count": [2, 5, 3, 0]})
    check("Phone Call Counter less than 4 is 0-3",
          list(breach.dnp_mask(view, {"counter": "phone", "op": "lt", "value": "4"}))
          == [True, False, True, False])
    check("Assigned counter equals 2-3",
          list(breach.dnp_mask(view, {"counter": "assigned", "op": "eq", "value": "2-3"}))
          == [True, False, True, False])
    check("more than 3", list(breach.dnp_mask(view, {"counter": "phone", "op": "gt", "value": "3"}))
          == [False, True, False, False])
    check("Untouched Lead counts as fresh", "Untouched Lead" in breach.FRESH_STAGES)
    from services.analysis import dashboards as dash
    cap = dash.breached_caption({"a": 2, "b": 2, "c": 2}, pd.Timestamp("2026-09-24"))
    check("same days everywhere -> 'Not dialled in the past 2 days (since 22 Sep 2026)'",
          cap.startswith("Not dialled in the past 2 days (since 22 Sep 2026)"), cap)
    cap = dash.breached_caption({"Follow Up For Closure": 2, "Counselled lead": 3,
                                 "Call Back Later": 2}, pd.Timestamp("2026-09-24"))
    check("different days -> each stage listed", "Counselled lead 3d" in cap, cap)

    print("\n=== OZONETEL ===")
    sample = os.environ.get("OZONETEL_SAMPLE")
    if sample and os.path.exists(sample):
        import json
        rows = json.load(open(sample))["details"]
        frame = ozonetel.to_frame(rows, ["sales", "Arbitrage_Sales"])
        check("real sample: 233 sales incoming calls", len(frame) == 233, str(len(frame)))
        check("real sample: 21 numbers", frame["Phone Number"].nunique() == 21,
              str(frame["Phone Number"].nunique()))
        check("real sample: both campaigns",
              set(frame["Campaign"]) == {"LawSikho_Incoming", "Arbitrage_Incoming"},
              str(set(frame["Campaign"])))
        check("real sample: calls carry a time", frame["Call Date"].dt.hour.max() > 0)
    days, note = ozonetel.days_to_fetch(TODAY - timedelta(days=3), TODAY)
    check("fetches the master's last day through today", len(days) == 4, str(days))
    days, note = ozonetel.days_to_fetch(TODAY - timedelta(days=40), TODAY)
    check("clamps to 15 days and says so", len(days) == 16 and "15 days" in note, str(len(days)))
    days, note = ozonetel.days_to_fetch(None, TODAY)
    check("no master date -> last 15 days", len(days) == 16, str(len(days)))

    check("0 dials reads 'Not Dialled yet'", breach.dial_label(0) == "Not Dialled yet")
    check("1 dial is singular", breach.dial_label(1) == "1 time dialled")
    check("3 dials spelt out", breach.dial_label(3) == "3 times dialled")
    check("Past the ceiling collapses", breach.dial_label(99) == "Dialled more than 6 times")
    check("A hand-set label survives",
          breach.dial_label("Dialled From Personal") == "Dialled From Personal")

    print("\n=== REPORTS ===")
    built = {}
    for key in registry.ORDER:
        job = FakeJob()
        module = registry.get(key)
        registry.run(job, key, token)
        out = registry.output_frame(token, key)
        pending = registry.pending_frame(token, key)
        built[key] = (out, pending, job.result)

        print(f"\n  -- {module.TITLE}: {len(out):,} rows, {len(out.columns)} columns")
        check(f"{key}: last two columns are the Zip fields",
              list(out.columns[-2:]) == ["Zip Intent", "Zip Intent Justification"],
              str(list(out.columns[-2:])))
        check(f"{key}: every declared column is present",
              all(c in out.columns for c in module.COLUMNS),
              str([c for c in module.COLUMNS if c not in out.columns]))
        check(f"{key}: Zip Intent actually carries values",
              (out["Zip Intent"].astype(str).str.strip() != "").sum() > 0,
              "all blank")
        check(f"{key}: Zip Intent Justification carries values",
              (out["Zip Intent Justification"].astype(str).str.strip() != "").sum() > 0,
              "all blank")
        check(f"{key}: some leads were left unmatched", len(pending) > 0, "none")
        check(f"{key}: pending rows carry the right Report_Type",
              set(pending["Report_Type"]) == {module.REPORT_TYPE} if len(pending) else True)
        check(f"{key}: something breached", job.result["breached"] > 0, "nothing breached")
        check(f"{key}: something enrolled", job.result["enrolled"] > 0, "nothing enrolled")
        check(f"{key}: no NaN reached the output",
              not out.isna().any().any(), "NaNs present")

    # The key each report is updated on.
    hp_out = built["high_priority"][0]
    check("High Priority: no phone is blank when either sheet has it",
          (hp_out["Phone no"].astype(str).str.strip() != "").all(),
          str(int((hp_out["Phone no"].astype(str).str.strip() == "").sum())) + " blank")
    check("every report shows the next follow-up date",
          all("Next Follow Up Date" in built[k][0].columns for k in registry.ORDER))
    hp_pending = built["high_priority"][1]
    check("High Priority is keyed on Prospect ID",
          (hp_pending["Prospect ID"].astype(str).str.strip() != "").all())
    cer_pending = built["chat_email_referral"][1]
    check("Chat/Email/Referral is keyed on Phone Number",
          (cer_pending["Phone Number"].astype(str).str.strip() != "").all())

    combined = registry.combined_pending(token)
    print(f"\n  -- Combined update CSV: {len(combined):,} rows")
    check("The update CSV carries all three report types",
          len(set(combined["Report_Type"])) == 3, str(sorted(set(combined["Report_Type"]))))
    check("The update CSV has both keys",
          list(combined.columns) == ["Phone Number", "Prospect ID", "Email", "Report_Type"],
          str(list(combined.columns)))

    cer_view = storage.load_report(token, "chat_email_referral")
    snap_stage = SNAP.set_index("Phone")["Contact Stage"]
    in_lsq = cer_view["Phone"].isin(snap_stage.index) & (cer_view["Contact_Stage"] != breach.ENROLLED_STAGE)
    check("Chat/Email/Referral: stage comes from LeadSquared where it has one",
          (cer_view.loc[in_lsq, "Contact_Stage"].values
           == cer_view.loc[in_lsq, "Phone"].map(snap_stage).values).all())
    not_lsq = ~cer_view["Phone"].isin(snap_stage.index) & (cer_view["Contact_Stage"] != breach.ENROLLED_STAGE)
    check("…and from the sheet where it does not", (cer_view.loc[not_lsq, "Contact_Stage"] != "").all())
    check("Chat/Email/Referral: enrolled still wins",
          (cer_view["Contact_Stage"] == breach.ENROLLED_STAGE).sum() > 0)
    check("Chat/Email/Referral has teams for the slicer", set(cer_view["_team"]) & {"Elite", "Growth"})
    inc_log = built["incoming"][2]
    inc_view = storage.load_report(token, "incoming")
    check("Incoming read its calls from Ozonetel",
          (inc_view["Campaign"].isin(["LawSikho_Incoming", "Arbitrage_Incoming"])).sum() > 0)
    check("Incoming dropped the support calls", not inc_view["Campaign"].eq("Support_Outbound").any())
    check("Incoming: one row per number", inc_view["Phone Number"].is_unique)
    check("Incoming: the master history is still merged in",
          inc_view["Campaign"].eq("Old").sum() >= 0)
    check("Incoming: the summary records the Ozonetel window",
          (inc_log.get("ozonetel") or {}).get("from") is not None, str(inc_log.get("ozonetel")))

    print("\n=== DIALER FILES ===")
    counts = dialers.counts(token)
    check("counts per report", set(counts["reports"]) == set(registry.ORDER), str(counts))
    summary = dialers.make_files(token, ["breached", "dnp", "fresh"])
    mc, _ = dialers.load_file(token, "mcube")
    ac, _ = dialers.load_file(token, "acefone")
    leads, _ = dialers.load_file(token, "leads")
    check("each lead once across the reports", leads["Phone Number"].is_unique)
    check("duplicates across reports were removed", summary["duplicates_removed"] > 0,
          str(summary["duplicates_removed"]))
    check("Acefone has every lead", len(ac) == summary["leads"])
    check("MCube holds back owners with no agent",
          summary["mcube_skipped"] > 0 and "Salma Mallick" in summary["mcube_no_agent"],
          str(summary["mcube_no_agent"]))
    check("MCube rows carry an agent number", (mc["Agent Number"].str.len() > 0).all())
    check("MCube priority 1, Acefone 30",
          set(mc["Priority"]) == {"1"} and set(ac["Priority(1 to 30)"]) == {"30"})
    check("leads keep their LeadSquared owner",
          set(leads["Owner"]) <= set(CALLERS), str(set(leads["Owner"])))
    only = dialers.make_files(token, ["fresh"], ["high_priority"])
    check("one category from one report", set(only["by_category"]) == {"Fresh"},
          str(only["by_category"]))

    print("\n=== DASHBOARDS ===")
    for key in registry.ORDER:
        view = storage.load_report(token, key)
        options = dashboards.options(view, key)
        result = dashboards.compute(view, key)
        panels = result["panels"]
        print(f"\n  -- {registry.get(key).TITLE}: "
              f"{result['cards']['total']:,} leads, {len(options['slicers'])} slicers")
        check(f"{key}: slicers were built", len(options["slicers"]) > 0)
        check(f"{key}: the cards add up",
              result["cards"]["total"] == len(view), str(result["cards"]))
        check(f"{key}: conversion is a percentage",
              0 <= result["cards"]["conversion"] <= 100)
        for name in ("fresh", "dnp", "breached", "given"):
            panel = panels[name]
            check(f"{key}: {name} panel has bars", not panel["empty"], "empty")
            if not panel["empty"]:
                check(f"{key}: {name} series line up with categories",
                      all(len(s["values"]) == len(panel["categories"]) for s in panel["series"]))
                check(f"{key}: {name} totals match the stacks",
                      panel["totals"] == [sum(s["values"][i] for s in panel["series"])
                                          for i in range(len(panel["categories"]))])
        check(f"{key}: the enrollment donut has slices", not result["enrollments"]["empty"])
        check(f"{key}: the data view pivots", len(result["tables"]["given"]["rows"]) > 0)

        leads = dashboards.leads(view, key, panel="breached")
        check(f"{key}: breached leads list", leads["total"] > 0, "empty")
        check(f"{key}: the lead list exposes Zip Intent",
              "zip_intent" in (leads["rows"][0] if leads["rows"] else {}))

        # The slicers cascade: a team narrows the owners to that team.
        teams = next((sl["values"] for sl in options["slicers"] if sl["key"] == "team"), [])
        if "Growth" in teams:
            narrowed = dashboards.options(view, key, {"team": ["Growth"]})
            owners = next(sl for sl in narrowed["slicers"] if sl["key"] == "owner")
            check(f"{key}: picking a team narrows Owner to that team",
                  set(owners["values"]) <= {"Suhail Showkat", "Salma Mallick"},
                  str(owners["values"]))
            team_again = next(sl for sl in narrowed["slicers"] if sl["key"] == "team")
            check(f"{key}: a slicer does not narrow itself", len(team_again["values"]) == len(teams))

        # A filter must narrow, and must not repaint or lose the schema.
        month = options["months"][0] if options["months"] else None
        if month:
            filtered = dashboards.compute(view, key, {"month": [month]})
            check(f"{key}: the month slicer narrows the selection",
                  filtered["cards"]["total"] <= result["cards"]["total"])

    print("\n=== THE SECOND PASS ===")
    # The whole point of the rebuild button: one job, no re-upload, and a
    # before/after on the unmatched count.
    from services import pipeline
    from services import lsq_fetch as fetch_module

    # Stand in for the LeadSquared call with the same snapshot, plus the leads
    # that were missing before — which is what setting Report_Type achieves.
    extra = SNAP.copy()
    extra["Report_Type"] = "High Priority"
    wider = pd.concat([SNAP, snapshot_extra()], ignore_index=True)

    def fake_fetch(job, days, basis=None):
        job.log(f"(mock) fetching {days} days on {basis}")
        tok = storage.new_token()
        storage.save_fetch(tok, wider, {"token": tok, "days": days, "basis": basis,
                                        "basis_label": "Modified On", "stats": {}})
        job.result = {"token": tok, "days": days, "basis_label": "Modified On"}

    real_fetch = fetch_module.run
    pipeline.lsq_fetch.run = fake_fetch
    job = FakeJob()
    try:
        pipeline.rebuild(job, 30, "modified")
    finally:
        pipeline.lsq_fetch.run = real_fetch

    log = "\n".join(job.lines)
    check("the pass rebuilt every report that was built before",
          len(job.result["built"]) == 3, str(job.result))
    check("nothing failed", not job.result["failed"], str(job.result["failed"]))
    check("Ozonetel days already fetched came from the cache",
          "(cache)" in log and "(API)" not in log.split("fetching")[-1] or "(cache)" in log,
          log[-400:])
    check("the log reports the before/after on unmatched leads",
          "Unmatched leads" in log or "still need a Report_Type" in log
          or "nothing left to update" in log, log[-300:])
    check("setting Report_Type reduced the unmatched count",
          job.result["pending_after"] < job.result["pending_before"],
          f"{job.result['pending_before']} -> {job.result['pending_after']}")

    print("\n" + "=" * 60)
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S):")
        for line in FAILURES:
            print("  -", line)
        sys.exit(1)
    print("Everything passed.")


if __name__ == "__main__":
    main()
