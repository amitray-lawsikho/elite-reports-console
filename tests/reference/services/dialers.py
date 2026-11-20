# -*- coding: utf-8 -*-
"""
services/dialers.py
===================
MCube and Acefone files — and pushes — for the leads the reports flag.

WHAT GOES IN
------------
Tick any mix of:

  Breached          the follow-up status is a breached spelling
  Less-dialled DNP  Call Not Connected / Call Not Picking Up whose counter
                    matches the DNP rule chosen before the build
  Fresh             New Lead, Re-enquired Lead, Opportunity Created,
                    Untouched Lead

across any of the built reports. All of it becomes **one** list with each lead
once (by its ten-digit phone): a lead that is breached in Incoming and fresh
in High Priority is dialled once, under the first category it matched —
Breached, then DNP, then Fresh.

WHO DIALS IT
------------
The lead's current owner — the LeadSquared owner from the snapshot, or the
report's owner where the snapshot has none. Nothing is reassigned and nothing
changes in LeadSquared.

  * MCube needs the owner's Agent Number, looked up by name in MCube's agent
    directory (getagents, plus get-employees for anyone it misses), falling
    back to the roster email matched to the agent's email. An owner with no
    MCube agent is held out of the MCube file and listed; they stay in
    Acefone's.
  * Acefone takes the owner as Skill Name; on push it is matched to a skill
    id in the configured skill list. A lead whose owner has no skill still
    goes in, unrouted, and the log says how many.

Priority is 1 for MCube (dials first) and 30 for Acefone (dials first), as in
Leads Console.
"""

import os

import pandas as pd

import config
from apis.acefone import leads as acefone_leads
from apis.acefone import skills as acefone_skills
from apis.http import ApiError
from apis.mcube import agents as mcube_agents
from apis.mcube import campaign as mcube_campaign
from apis.mcube import employees as mcube_employees
from services import breach, jobs, roster
from services import runs as storage
from services.reports import registry

CATEGORIES = {
    "breached": "Breached",
    "dnp": "Less-dialled DNP",
    "fresh": "Fresh",
}
ORDER = ["breached", "dnp", "fresh"]

MCUBE_COLUMNS = ["Number", "Name", "Source", "Agent Number", "Ref Id", "Priority"]
ACEFONE_COLUMNS = [
    "Phone Number", "Name", "Email Id", "Address", "Company Name",
    "Alternate Phone Number", "Time Group Id", "Priority(1 to 30)",
    "Skill Name", "External Reference ID",
]

MCUBE_FILE = "dialer_mcube.csv"
ACEFONE_FILE = "dialer_acefone.csv"
SKIPPED_FILE = "dialer_mcube_skipped.csv"
LEADS_FILE = "dialer_leads.csv"


# ---------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------
def masks(view):
    return {
        "breached": breach.breached_mask(view),
        "dnp": breach.dnp_mask(view),
        "fresh": breach.fresh_mask(view),
    }


def counts(token):
    """Per report and in total (after de-duplication): how many leads each category holds."""
    out = {"reports": {}, "rules": None}
    for key in registry.ORDER:
        summary = storage.report_summary(token, key)
        if not summary:
            continue
        view = storage.load_report(token, key)
        m = masks(view)
        has_phone = view["_phone"].astype(str).str.len() == 10 if "_phone" in view else False
        out["reports"][key] = {
            "title": summary["title"],
            **{cat: int((m[cat] & has_phone).sum()) for cat in ORDER},
        }
        out["rules"] = summary.get("rules")
    return out


def select(token, categories, reports=None, owners=None):
    """
    The combined, de-duplicated leads for the ticked categories and reports,
    optionally only those owned by ``owners`` (roster Caller Names, or the
    LeadSquared owner name for someone not on the roster).
    """
    categories = [c for c in ORDER if c in set(categories or [])]
    if not categories:
        raise ValueError("Tick at least one of Breached, Less-dialled DNP or Fresh.")
    keys = [k for k in registry.ORDER if not reports or k in set(reports)]

    parts = []
    for key in keys:
        if not storage.report_summary(token, key):
            continue
        view = storage.load_report(token, key)
        m = masks(view)
        category = pd.Series("", index=view.index, dtype="object")
        for cat in reversed(categories):       # first in ORDER wins
            category[m[cat]] = CATEGORIES[cat]
        rows = view[category != ""]
        if not len(rows):
            continue
        parts.append(pd.DataFrame({
            "phone": rows["_phone"].astype(str).values,
            "category": category[category != ""].values,
            "rank": category[category != ""].map(
                {CATEGORIES[c]: i for i, c in enumerate(ORDER)}).values,
            "report": registry.get(key).TITLE,
            "report_owner": rows["_owner"].astype(str).values,
            "stage": rows["_stage"].astype(str).values,
            "follow_up": rows["_follow_up"].astype(str).values,
            "reason": rows["_reason"].astype(str).values if "_reason" in rows else "",
            "last_called": pd.to_datetime(rows["_last_called"], errors="coerce").dt.strftime(
                "%d/%m/%Y %H:%M").fillna("").values if "_last_called" in rows else "",
            "next_follow_up": pd.to_datetime(rows["_follow_up_dt"], errors="coerce").dt.strftime(
                "%d/%m/%Y %H:%M").fillna("").values if "_follow_up_dt" in rows else "",
            "phone_calls": rows["_dial_count"].values,
            "assigned_calls": (rows["_assigned_count"].values
                               if "_assigned_count" in rows else 0),
            "prospect_id": (rows["Prospect ID"].astype(str).values
                            if "Prospect ID" in rows else ""),
        }))
    if not parts:
        raise ValueError("No lead matches those boxes in the reports that are built.")

    leads = pd.concat(parts, ignore_index=True)
    no_phone = int((leads["phone"].str.len() != 10).sum())
    leads = leads[leads["phone"].str.len() == 10]
    before = len(leads)
    leads = leads.sort_values("rank", kind="stable").drop_duplicates("phone")
    duplicates = before - len(leads)

    # Name, email, Prospect ID and the current owner from the snapshot.
    snap = storage.load_frame(token)
    snap = snap[snap["Phone"] != ""].drop_duplicates("Phone", keep="last").set_index("Phone")
    phone = leads["phone"]
    leads["name"] = phone.map(snap["Lead Name"]).fillna("")
    leads["email"] = phone.map(snap["Email"]).fillna("")
    pid = phone.map(snap["Prospect ID"]).fillna("")
    leads["prospect_id"] = pid.where(pid != "", leads["prospect_id"])
    owner = phone.map(snap["Owner"]).fillna("")
    fallback = leads["report_owner"].where(
        ~leads["report_owner"].isin(["#NA", "#N/A", "(No owner)"]), "")
    leads["owner"] = owner.where(owner != "", fallback)
    leads["owner_email"] = phone.map(snap["Owner Email"]).fillna("")
    leads["caller"] = caller_names(list(leads["owner"]))
    before_owner = len(leads)
    if owners:
        wanted = {_norm(o) for o in owners}
        leads = leads[leads["caller"].map(_norm).isin(wanted)]
        if not len(leads):
            raise ValueError("None of the picked callers has a lead in that selection.")

    stats = {
        "leads": int(len(leads)),
        "duplicates_removed": int(duplicates),
        "no_phone": no_phone,
        "by_category": leads["category"].value_counts().to_dict(),
        "by_report": leads["report"].value_counts().to_dict(),
        "no_owner": int((leads["owner"] == "").sum()),
        "owners_picked": len(owners or []),
        "left_out_by_owner": int(before_owner - len(leads)),
    }
    return leads.drop(columns=["rank"]).reset_index(drop=True), stats


def owner_summary(token, categories, reports=None):
    """
    Every caller who owns a lead in the selection, with the count, their team
    and vertical from the roster — plus roster callers with nothing, so the
    picker shows the whole team. Drives the caller picker.
    """
    try:
        leads, _ = select(token, categories or ORDER, reports)
        counts = leads.groupby("caller").size().to_dict()
    except ValueError:
        counts = {}
    try:
        index = roster.index()
    except Exception:
        index = {}
    rows, seen = [], set()
    for entry in index.values():
        seen.add(_norm(entry["caller"]))
        rows.append({"caller": entry["caller"], "team": entry["team"],
                     "vertical": entry["vertical"], "leads": int(counts.get(entry["caller"], 0)),
                     "on_roster": True})
    for caller, n in counts.items():
        if _norm(caller) not in seen:
            rows.append({"caller": caller or "(no owner)", "team": "Not on roster",
                         "vertical": "", "leads": int(n), "on_roster": False})
    rows.sort(key=lambda r: (r["team"] == "Not on roster", r["team"].lower(), -r["leads"],
                             r["caller"].lower()))
    return {"callers": rows, "teams": sorted({r["team"] for r in rows},
                                              key=lambda t: (t == "Not on roster", t.lower())),
            "roster_loaded": bool(index)}


# ---------------------------------------------------------------------
# MCube agent numbers
# ---------------------------------------------------------------------
def _norm(name):
    return roster.normalise_name(name)


def load_agents(log=None):
    """MCube agent directory: getagents first, get-employees fills gaps."""
    agents, errors = [], []
    source = str(config.get("MCUBE_AGENT_SOURCE") or "both").lower()
    if source in ("both", "getagents") and config.get("MCUBE_GETAGENTS_TOKEN"):
        try:
            agents = mcube_agents.fetch_agents()
        except Exception as exc:
            errors.append(f"getagents: {exc}")
    if source in ("both", "employees") and config.get("MCUBE_EMPLOYEES_AUTHORIZATION"):
        try:
            seen = {_norm(a["agent_name"]) for a in agents}
            for row in mcube_employees.fetch_employees():
                if _norm(row["agent_name"]) not in seen:
                    agents.append(row)
                    seen.add(_norm(row["agent_name"]))
        except Exception as exc:
            errors.append(f"get-employees: {exc}")
    if log and errors:
        log("MCube agent directory: " + "; ".join(errors))
    if not agents and errors:
        raise RuntimeError("Could not read MCube's agent directory — " + "; ".join(errors))
    return agents


def agent_numbers(owners, owner_emails, agents):
    by_name, by_email = {}, {}
    for agent in agents:
        phone = str(agent.get("emp_phone") or "").strip()
        if not phone:
            continue
        by_name.setdefault(_norm(agent.get("agent_name")), phone)
        email = str(agent.get("email") or "").strip().lower()
        if email:
            by_email.setdefault(email, phone)
    try:
        roster_index = roster.index()
    except Exception:
        roster_index = {}
    out = []
    for owner, lsq_email in zip(owners, owner_emails):
        key = _norm(owner)
        number = by_name.get(key, "")
        if not number:
            roster_email = (roster_index.get(key) or {}).get("email", "")
            for email in (roster_email, lsq_email):
                email = str(email or "").strip().lower()
                if email and email in by_email:
                    number = by_email[email]
                    break
        out.append(number)
    return out


def caller_names(owners):
    """The roster's own spelling of each owner, so Acefone skills match."""
    try:
        index = roster.index()
    except Exception:
        index = {}
    return [(index.get(_norm(o)) or {}).get("caller", o) for o in owners]


# ---------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------
def make_files(token, categories, reports=None, owners=None, log=print):
    leads, stats = select(token, categories, reports, owners)
    owners = list(leads["caller"])
    mcube_priority = config.get_int("MCUBE_PRIORITY", 1)
    acefone_priority = min(30, max(1, config.get_int("ACEFONE_PRIORITY", 30)))

    agents, agent_error = [], ""
    if config.get("MCUBE_GETAGENTS_TOKEN") or config.get("MCUBE_EMPLOYEES_AUTHORIZATION"):
        try:
            agents = load_agents(log)
        except Exception as exc:
            agent_error = str(exc)
    else:
        agent_error = "No MCube agents token in Settings, so no Agent Number can be filled."
    numbers = agent_numbers(owners, list(leads["owner_email"]), agents) if agents else [""] * len(leads)

    mcube = pd.DataFrame({
        "Number": leads["phone"].values,
        "Name": leads["name"].values,
        "Source": owners,
        "Agent Number": numbers,
        "Ref Id": leads["prospect_id"].values,
        "Priority": mcube_priority,
    }, columns=MCUBE_COLUMNS)
    has_agent = mcube["Agent Number"].astype(str).str.strip() != ""
    mcube_ok, mcube_skipped = mcube[has_agent], mcube[~has_agent]

    acefone = pd.DataFrame({
        "Phone Number": leads["phone"].values,
        "Name": leads["name"].values,
        "Email Id": leads["email"].values,
        "Address": "",
        "Company Name": owners,
        "Alternate Phone Number": "",
        "Time Group Id": "",
        "Priority(1 to 30)": acefone_priority,
        "Skill Name": owners,
        "External Reference ID": leads["prospect_id"].values,
    }, columns=ACEFONE_COLUMNS)

    detail = leads.assign(caller=owners, agent_number=numbers)[[
        "phone", "name", "caller", "agent_number", "category", "report", "stage",
        "follow_up", "last_called", "next_follow_up", "reason", "phone_calls", "assigned_calls",
        "email", "prospect_id"]]
    detail.columns = ["Phone Number", "Name", "Owner", "MCube Agent Number", "Category",
                      "Report", "Contact Stage", "Follow Up Status", "Last Called",
                      "Next Follow Up", "Why", "Phone Call Counter",
                      "Assigned On Call Counter", "Email", "Prospect ID"]

    for frame, name in ((mcube_ok, MCUBE_FILE), (acefone, ACEFONE_FILE),
                        (mcube_skipped, SKIPPED_FILE), (detail, LEADS_FILE)):
        frame.to_csv(storage.export_path(token, name), index=False, encoding="utf-8-sig")

    per_owner = (pd.DataFrame({"owner": owners, "agent": numbers, "cat": leads["category"].values})
                 .assign(owner=lambda d: d["owner"].replace("", "(no owner)"))
                 .groupby("owner").agg(leads=("cat", "size"), agent=("agent", "first"))
                 .reset_index().sort_values("leads", ascending=False))
    summary = dict(stats, **{
        "categories": [c for c in ORDER if c in set(categories)],
        "reports": reports or [],
        "owners": owners_filter_label(stats),
        "mcube_rows": int(len(mcube_ok)),
        "mcube_skipped": int(len(mcube_skipped)),
        "mcube_no_agent": sorted({o for o in mcube_skipped["Source"] if str(o).strip()}),
        "acefone_rows": int(len(acefone)),
        "agent_error": agent_error,
        "mcube_priority": mcube_priority,
        "acefone_priority": acefone_priority,
        "per_owner": [{"owner": r.owner, "leads": int(r.leads), "agent": r.agent or ""}
                      for r in per_owner.itertuples(index=False)],
    })
    storage.save_report(token, "dialer", detail, summary)
    return summary


def owners_filter_label(stats):
    n = stats.get("owners_picked") or 0
    return f"{n} caller(s)" if n else "all callers"


UPLOAD_FILES = {"mcube": "upload_mcube.csv", "acefone": "upload_acefone.csv"}


def load_file(token, which):
    name = {"mcube": MCUBE_FILE, "acefone": ACEFONE_FILE,
            "skipped": SKIPPED_FILE, "leads": LEADS_FILE,
            "mcube_upload": UPLOAD_FILES["mcube"],
            "acefone_upload": UPLOAD_FILES["acefone"]}[which]
    path = storage.export_path(token, name)
    return pd.read_csv(path, dtype=str, keep_default_na=False), path


def save_upload(token, target, stream_file):
    """A hand-picked CSV that replaces the made file for one push."""
    path = storage.export_path(token, UPLOAD_FILES[target])
    stream_file.save(path)
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    needed = ["Number", "Agent Number"] if target == "mcube" else ["Phone Number"]
    missing = [c for c in needed if c not in frame.columns]
    if missing:
        os.remove(path)
        raise ValueError(f"That file is missing {', '.join(missing)} — it should look like the "
                         f"{'MCube' if target == 'mcube' else 'Acefone'} file made here.")
    return {"rows": int(len(frame)), "name": getattr(stream_file, "filename", "")}


def _source_frame(token, target, source):
    return load_file(token, f"{target}_upload" if source == "upload" else target)[0]


# ---------------------------------------------------------------------
# Push
# ---------------------------------------------------------------------
def push_mcube(job, token, campaign_id, campaign_name, retry_attempts=None, retry_time=None,
               priority=None, source="made"):
    frame = _source_frame(token, "mcube", source)
    job.log(f"Pushing to MCube campaign '{campaign_name}' (id {campaign_id}) — "
            f"{'the uploaded file' if source == 'upload' else 'the dialer file made here'}.")
    prepared, skipped = [], 0
    for row in frame.to_dict("records"):
        lead = mcube_campaign.build_lead(
            number=row.get("Number"), name=row.get("Name", ""), source=row.get("Source", ""),
            agent_number=row.get("Agent Number", ""),
            priority=priority if priority not in (None, "") else row.get("Priority", 1),
            ref_id=row.get("Ref Id", ""),
            retry_attempt=retry_attempts, retry_time=retry_time)
        if lead is not None and lead.get("eid"):
            prepared.append(lead)
        else:
            skipped += 1
    if skipped:
        job.log(f"{skipped} row(s) skipped — no phone number or no MCube agent number.")
    if not prepared:
        raise ValueError("Nothing to push: no lead has an MCube Agent Number.")

    job.log(f"{len(prepared):,} lead(s), priority "
            f"{'overridden to ' + str(prepared[0]['priority']) if priority not in (None, '') else str(sorted({l['priority'] for l in prepared}))}"
            f", retry {prepared[0]['retry_attempt']} attempt(s) {prepared[0]['retry_time']} minute(s) apart.")
    batch_size = config.get_int("MCUBE_PUSH_BATCH_SIZE", 200)
    job.set_total(len(prepared))
    batches = list(jobs.chunked(prepared, batch_size))
    for index, batch in enumerate(batches, start=1):
        if job.check_stop():
            break
        try:
            result = mcube_campaign.summarise(mcube_campaign.upload_leads(campaign_id, batch))
            if result.get("ok", True):
                job.advance(succeeded=len(batch))
                job.log(f"Batch {index}/{len(batches)}: {len(batch)} lead(s) — "
                        f"{result.get('message') or 'accepted'}")
            else:
                job.advance(failed=len(batch), errors=[result.get("message") or "rejected"])
                job.log(f"Batch {index}/{len(batches)} rejected: {result.get('message')}")
        except (ApiError, ValueError) as exc:
            job.advance(failed=len(batch), errors=[str(exc)])
            job.log(f"Batch {index}/{len(batches)} failed: {exc}")
    _close(job, f"MCube '{campaign_name}'")


def skill_index(skill_list_id=None):
    list_id = skill_list_id or config.require(
        "ACEFONE_SKILL_LIST_ID", "Acefone skill list (pick one on the Acefone panel)")
    index = {}
    for skill in acefone_skills.fetch_skills(list_id):
        index.setdefault(_norm(skill.get("name")), {"id": skill["id"], "name": skill["name"]})
    return index


def skill_mapping(token, skill_list_id=None, overrides=None, source="made"):
    """Caller -> skill for the file about to be pushed: auto-matched by name,
    with any override winning — the Leads Console review table."""
    frame = _source_frame(token, "acefone", source)
    callers = sorted({str(c).strip() for c in frame.get("Skill Name", pd.Series(dtype=str))
                      if str(c).strip()})
    index = skill_index(skill_list_id)
    by_id = {e["id"]: e["name"] for e in index.values()}
    overrides = {str(k): str(v).strip() for k, v in (overrides or {}).items() if str(v).strip()}
    counts = frame["Skill Name"].value_counts().to_dict() if "Skill Name" in frame else {}
    rows = []
    for caller in callers:
        auto = index.get(_norm(caller))
        if caller in overrides:
            rows.append({"caller": caller, "skill_id": overrides[caller],
                         "skill_name": by_id.get(overrides[caller], "(set by hand)"),
                         "source": "override", "leads": int(counts.get(caller, 0))})
        elif auto:
            rows.append({"caller": caller, "skill_id": auto["id"], "skill_name": auto["name"],
                         "source": "auto", "leads": int(counts.get(caller, 0))})
        else:
            rows.append({"caller": caller, "skill_id": "", "skill_name": "", "source": "none",
                         "leads": int(counts.get(caller, 0))})
    return {"mapping": rows,
            "skills": sorted(index.values(), key=lambda e: e["name"].lower()),
            "unmatched": [r["caller"] for r in rows if not r["skill_id"]]}


def push_acefone(job, token, list_id, list_name, priority=None, skill_map=None,
                 skill_list_id=None, source="made"):
    frame = _source_frame(token, "acefone", source)
    job.log(f"Pushing to Acefone list '{list_name}' (id {list_id}) — "
            f"{'the uploaded file' if source == 'upload' else 'the dialer file made here'}.")
    skills = {}
    try:
        for row in skill_mapping(token, skill_list_id, skill_map, source)["mapping"]:
            if row["skill_id"]:
                skills[row["caller"]] = row["skill_id"]
    except Exception as exc:
        job.log(f"WARNING: could not read Acefone skills ({exc}) — leads will arrive unrouted.")

    prepared, unrouted = [], set()
    for row in frame.to_dict("records"):
        caller = str(row.get("Skill Name") or row.get("Company Name") or "").strip()
        skill = skills.get(caller, "")
        if not skill:
            unrouted.add(caller or "(no owner)")
        lead = acefone_leads.build_lead(
            phone=row.get("Phone Number"), name=row.get("Name", ""), email=row.get("Email Id", ""),
            company=row.get("Company Name", ""), ref_id=row.get("External Reference ID", ""),
            priority=priority if priority not in (None, "") else row.get("Priority(1 to 30)"),
            skill_id=skill or None)
        if lead is not None:
            prepared.append(lead)
    if not prepared:
        raise ValueError("Nothing to push: no lead has a phone number.")
    if unrouted:
        job.log(f"No Acefone skill for: {', '.join(sorted(unrouted))} — their leads arrive "
                "unrouted.")
    if priority not in (None, ""):
        job.log(f"Priority overridden to {priority} for every lead.")

    batch_size = config.get_int("ACEFONE_PUSH_BATCH_SIZE", 500)
    job.set_total(len(prepared))
    batches = list(jobs.chunked(prepared, batch_size))
    for index, batch in enumerate(batches, start=1):
        if job.check_stop():
            break
        try:
            acefone_leads.bulk_create(list_id, batch)
            job.advance(succeeded=len(batch))
            job.log(f"Batch {index}/{len(batches)}: {len(batch)} lead(s) imported.")
        except (ApiError, ValueError) as exc:
            job.advance(failed=len(batch), errors=[str(exc)])
            job.log(f"Batch {index}/{len(batches)} failed: {exc}")
    _close(job, f"Acefone '{list_name}'")


def _close(job, where):
    job.result = {"pushed": job.succeeded, "failed": job.failed}
    if job.stopped:
        return
    if job.failed:
        job.status = "partial" if job.succeeded else "failed"
        job.log(f"Finished with {job.succeeded:,} pushed and {job.failed:,} failed.")
    else:
        job.log(f"Done — pushed {job.succeeded:,} lead(s) to {where}.")
