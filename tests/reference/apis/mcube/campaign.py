# -*- coding: utf-8 -*-
"""
MCube campaign upload — POST /Restmcube-api/campaign

Payload contract::

    {"campaign_id": 1,
     "listData": [{"number": 9740920241, "name": "sample",
                   "source": "sample@gmail.com", "retry_time": "1",
                   "retry_attempt": "1", "priority": 1, "eid": "8880222777"}]}

``eid`` is the agent's dialer number (emp_phone from getagents), which is how
a lead gets bound to a specific caller.
"""

import config
from apis.http import ApiError

from ._common import JSON_HEADERS, post

CAMPAIGN_URL = "https://config.mcube.com/Restmcube-api/campaign"


def retry_defaults():
    """``(attempts, minutes)`` — the configured dialling behaviour."""
    attempts = config.get_int("MCUBE_RETRY_ATTEMPTS", 3)
    minutes = config.get_int("MCUBE_RETRY_TIME", 180)
    return max(1, attempts), max(1, minutes)


def upload_leads(campaign_id, list_data, token=None):
    """Push a batch of prepared lead dicts into an MCube campaign."""
    if not isinstance(list_data, list) or not list_data:
        raise ValueError("list_data must be a non-empty list of leads.")

    key = token or config.require("MCUBE_API_KEY", "MCube API key (MCUBE_API_KEY)")
    headers = dict(JSON_HEADERS)
    headers["Authorization"] = f"Bearer {key}"

    try:
        campaign_id_int = int(str(campaign_id).strip())
    except (TypeError, ValueError):
        raise ValueError(f"campaign_id must be numeric, got {campaign_id!r}")

    return post(
        CAMPAIGN_URL,
        {"campaign_id": campaign_id_int, "listData": list_data},
        headers=headers,
        label="MCube campaign upload",
    )


def build_lead(number, name="", source="", agent_number="", priority=1,
               retry_time=None, retry_attempt=None, ref_id=""):
    """
    Turn one distributed row into the shape the campaign API accepts.

    ``retry_time`` (minutes between attempts) and ``retry_attempt`` (how many
    times to try) fall back to the configured defaults rather than to MCube's
    own, which are one attempt, one minute apart. Leaving them unset here was
    silently pushing every lead with that behaviour.

    Returns ``None`` when the number is unusable, so callers can count and
    report skipped rows instead of failing the whole batch.
    """
    digits = "".join(ch for ch in str(number or "") if ch.isdigit())
    if not digits:
        return None

    try:
        priority_val = int(str(priority).strip())
        if priority_val < 1:
            priority_val = 1
    except (TypeError, ValueError):
        priority_val = 1

    lead = {
        "number": int(digits),
        "name": str(name or "").strip(),
        "source": str(source or "").strip(),
        "retry_time": str(retry_time if retry_time not in (None, "") else retry_defaults()[1]),
        "retry_attempt": str(retry_attempt if retry_attempt not in (None, "") else retry_defaults()[0]),
        "priority": priority_val,
    }

    eid = str(agent_number or "").strip()
    if eid:
        lead["eid"] = eid

    # Undocumented passthrough — off unless MCUBE_SEND_REFID is turned on.
    if config.get_bool("MCUBE_SEND_REFID") and str(ref_id or "").strip():
        lead["refid"] = str(ref_id).strip()

    return lead


def summarise(response):
    """Best-effort success/failure counts from MCube's varied response shapes."""
    if not isinstance(response, dict):
        return {"ok": True, "message": str(response)}

    success = response.get("success")
    failed = response.get("failed")
    out = {
        "ok": response.get("status") is not False,
        "message": response.get("msg") or response.get("message") or "",
        "raw": response,
    }
    if isinstance(success, list):
        out["succeeded"] = len(success)
    if isinstance(failed, list):
        out["failed"] = len(failed)
        if failed:
            out["ok"] = out["ok"] and len(failed) == 0
    return out
