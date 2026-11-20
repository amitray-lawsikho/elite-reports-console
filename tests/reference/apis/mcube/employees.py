# -*- coding: utf-8 -*-
"""
MCube employee directory — POST /Restmcube-api/get-employees

A second, fuller source for the same thing ``getagents`` returns. MCube's
``getagents`` endpoint only lists the agents attached to the WhatsApp/agent
app, which turned out to be a subset of the people actually on the account;
``get-employees`` is what the MCube admin screen itself calls, so it sees
everyone.

The response is a large object — employees, groups, SIP credentials, role
definitions, user records and a fresh JWT. The console reads exactly one key
from it, ``employees`` (falling back to ``agents``), and throws the rest away.
Nothing else is stored, logged or shown: ``sip_info`` and ``user_info`` carry
secrets that have no business being in this app.

Each employee row uses the same field names as ``getagents``
(``agent_id``, ``agent_name``, ``email``, ``emp_phone``, ``extension``), so it
normalises to an identical record. ``login_status`` has no direct twin; it is
derived from ``is_logged_in``/``oncall``.
"""

import config
from apis.http import ApiError

from ._common import BROWSER_HEADERS, post

EMPLOYEES_URL = "https://config.mcube.com/Restmcube-api/get-employees"

# get-employees wants a JSON body; everything else mirrors the admin screen.
EMPLOYEES_HEADERS = dict(BROWSER_HEADERS, **{
    "content-type": "application/json",
})


def _login_status(row):
    """``getagents`` reports a single login string; rebuild it from the flags."""
    if str(row.get("oncall") or "").strip() == "1":
        return "oncall"
    flag = str(row.get("is_logged_in") or "").strip()
    if flag == "1":
        return "1"
    if flag in ("0", ""):
        return "0" if flag else ""
    return flag


def normalise(row):
    """One employee row in the same shape ``agents.fetch_agents`` returns."""
    return {
        "agent_id":     str(row.get("agent_id") or "").strip(),
        "agent_name":   str(row.get("agent_name") or "").strip(),
        "extension":    str(row.get("extension") or row.get("softphoneext") or "").strip(),
        "email":        str(row.get("email") or "").strip(),
        "emp_phone":    str(row.get("emp_phone") or "").strip(),
        "login_status": _login_status(row),
        "break_status": str(row.get("break_status") or "").strip(),
    }


def fetch_employees(token=None):
    """Return the employee directory, normalised to the getagents record shape."""
    auth = token or config.require(
        "MCUBE_EMPLOYEES_AUTHORIZATION",
        "MCube employees key (MCUBE_EMPLOYEES_AUTHORIZATION)",
    )
    data = post(
        EMPLOYEES_URL,
        {"Authorization": auth},
        headers=EMPLOYEES_HEADERS,
        label="MCube get-employees",
    )
    if not isinstance(data, dict):
        raise ApiError("MCube get-employees returned an unexpected response.")

    rows = data.get("employees")
    if not isinstance(rows, list) or not rows:
        # Some accounts return the same people under "agents" instead.
        rows = data.get("agents")
    if not isinstance(rows, list):
        raise ApiError(
            "MCube get-employees did not return an employee list — "
            f"{data.get('message') or data.get('status') or 'no employees key'}"
        )

    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        record = normalise(row)
        if record["agent_name"]:
            out.append(record)
    return out
