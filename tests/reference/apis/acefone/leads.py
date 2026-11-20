# -*- coding: utf-8 -*-
"""
Acefone leads inside a broadcast list.

  fetch_in_list(list_id)          GET    /v1/broadcast/leads/{list_id}
  bulk_create(list_id, data)      POST   /v1/broadcast/leads/{list_id}
  delete_by_field(list_id, ...)   DELETE /v1/broadcast/leads/{list_id}
  delete_single(lead_id)          DELETE /v1/broadcast/lead/{lead_id}

Field layout used across the console (matches the columns the Acefone CSV
upload expects):

    field_0  Phone Number   field_3  Address
    field_1  Name           field_4  Company Name  (the assigned caller)
    field_2  Email Id       field_5  External Reference ID (LSQ Prospect ID)
"""

from .client import call

LEADS_PATH = "/v1/broadcast/leads"
LEAD_PATH = "/v1/broadcast/lead"

# Acefone keeps two different call-state fields on a lead, and only one of
# them answers "does this lead still need calling?".
#
#   dial_status         the outcome of the broadcast attempt itself
#   dialer_dial_status  the disposition, which is what the dialer screen shows
#
# The second is the one that matters here. 0 is a lead nobody has dialled and
# -1 one that was dialled but never dispositioned; every other negative is a
# reason the call never reached anyone, and any positive value is a real
# disposition an agent chose. Acefone leaves a connected lead sitting in the
# list rather than removing it — unlike MCube — so counting rows is not the
# same as counting work left to do.
DIALER_STATUS_LABELS = {
    0:  "New",
    -1: "Undisposed",
    -2: "Account DND",
    -3: "Public DND",
    -4: "Emergency",
    -5: "Call Drop",
    -6: "Channel Limit",
    -7: "Blocked",
}

DIAL_STATUS_LABELS = {
    1: "New",
    2: "Message Played",
    3: "DTMF Pressed",
    4: "No Answer",
    5: "DND",
    6: "Busy",
    7: "Congestion",
    8: "Failed",
    9: "Account DND",
}

# What "still in the queue" means: never dialled, or dialled and left without
# a disposition.
PENDING_STATUSES = (0, -1)

FIELD_LABELS = {
    "field_0": "Phone Number",
    "field_1": "Name",
    "field_2": "Email Id",
    "field_3": "Address",
    "field_4": "Company Name",
    "field_5": "External Reference ID",
}


def _as_int(value):
    """The status as an int, or ``None`` when Acefone did not send one."""
    if value is None or value == "":
        return None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def status_label(value):
    """A readable disposition. Positive values are an agent's own choice."""
    number = _as_int(value)
    if number is None:
        return ""
    if number in DIALER_STATUS_LABELS:
        return DIALER_STATUS_LABELS[number]
    return f"Dispositioned ({number})"


def is_pending(lead):
    """
    Is this lead still waiting to be called?

    ``None`` means Acefone sent no disposition for it, which is not the same
    as "no". Callers treat an unknown as countable rather than quietly
    dropping leads that might be real work.
    """
    number = _as_int(lead.get("dialer_dial_status"))
    if number is None:
        return None
    return number in PENDING_STATUSES


def fetch_in_list(list_id, auth=None):
    """All leads in a broadcast list, flattened for the console's table."""
    res = call("GET", f"{LEADS_PATH}/{list_id}", auth=auth, timeout=60)
    rows = res.get("data", res) if isinstance(res, dict) else res
    if not isinstance(rows, list):
        return []

    leads = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        skill = row.get("dialer_skill")
        if isinstance(skill, dict):
            skill_name = skill.get("name")
            skill_id = skill.get("id") or row.get("skill_id") or row.get("dialer_skill_id")
        else:
            skill_name = row.get("dialer_skill_name")
            skill_id = row.get("dialer_skill_id") or row.get("skill_id")

        lead = {
            "id": row.get("id") or row.get("lead_id"),
            "lead_id": row.get("lead_id") or row.get("id"),
            "list_id": row.get("list_id"),
            "list_name": row.get("list_name"),
            "skill_id": "" if skill_id is None else str(skill_id),
            "skill_name": skill_name or "",
            "priority": row.get("priority"),
            "call_count": row.get("call_count"),
            "retry_count": row.get("retry_count"),
            "dial_status": row.get("dial_status"),
            "dial_status_label": DIAL_STATUS_LABELS.get(
                _as_int(row.get("dial_status")), ""),
            "dialer_dial_status": row.get("dialer_dial_status"),
            "status_label": status_label(row.get("dialer_dial_status")),
            "lead_picked": row.get("lead_picked"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
        for key in FIELD_LABELS:
            lead[key] = row.get(key) or ""
        leads.append(lead)
    return leads


def bulk_create(list_id, data, skill_id=None, priority=None, auth=None):
    """Bulk-import prepared lead objects into a list."""
    if not isinstance(data, list) or not data:
        raise ValueError("data must be a non-empty list of lead objects.")

    payload = {"data": data}
    if skill_id not in (None, ""):
        payload["skill_id"] = str(skill_id).strip()
    if priority not in (None, ""):
        try:
            payload["priority"] = int(priority)
        except (TypeError, ValueError):
            payload["priority"] = priority

    return call("POST", f"{LEADS_PATH}/{list_id}", auth=auth, json=payload, timeout=120)


def delete_by_field(list_id, field, values, auth=None):
    """
    Bulk-delete every lead in a list whose ``field`` matches one of ``values``.

    Per Acefone's documentation this is ``DELETE /v1/broadcast/leads/{id}``
    with ``{"field": ..., "data": [...]}``. What the docs do not pin down is
    which spelling ``field`` expects — the internal ``field_0`` or the column's
    header name — so callers try more than one and fall back to per-lead
    deletes if none is accepted.
    """
    clean = []
    seen = set()
    for value in values or []:
        s = str(value).strip()
        if s and s not in seen:
            seen.add(s)
            clean.append(s)
    if not clean:
        raise ValueError("No values to delete.")

    return call(
        "DELETE", f"{LEADS_PATH}/{list_id}", auth=auth,
        json={"field": str(field).strip(), "data": clean}, timeout=120,
    )


def delete_single(lead_id, auth=None):
    """Delete one lead by its own id."""
    return call("DELETE", f"{LEAD_PATH}/{lead_id}", auth=auth)


def build_lead(phone, name="", email="", address="", company="", ref_id="",
               priority=None, skill_id=None):
    """
    Build one lead object for bulk import.

    Returns ``None`` when there is no usable phone number so the caller can
    count skipped rows rather than have the whole batch rejected.
    """
    phone = str(phone or "").strip()
    if not phone:
        return None

    lead = {
        "field_0": phone,
        "field_1": str(name or "").strip(),
        "field_2": str(email or "").strip(),
        "field_3": str(address or "").strip(),
        "field_4": str(company or "").strip(),
        "field_5": str(ref_id or "").strip(),
    }
    if priority not in (None, ""):
        try:
            lead["priority"] = int(str(priority).strip())
        except (TypeError, ValueError):
            pass
    if skill_id not in (None, ""):
        lead["skill_id"] = str(skill_id).strip()
    return lead
