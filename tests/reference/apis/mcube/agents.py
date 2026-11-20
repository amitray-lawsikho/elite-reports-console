# -*- coding: utf-8 -*-
"""
MCube agent directory — POST /whatsapp-mcube/getagents

This is the console's source of truth for each caller's dialer number.
The response shape is::

    {"success": "Fetched Successfully",
     "agentlist": [{"agent_id", "agent_name", "extension",
                    "email", "emp_phone", "login_status", "break_status"}, ...]}

``agent_name`` is matched against the roster's "Caller Name" and ``emp_phone``
becomes the "Mcube DID" / Agent Number used in the MCUBE upload file.
"""

import config
from apis.http import ApiError

from ._common import JSON_HEADERS, post

AGENTS_URL = "https://config.mcube.com/whatsapp-mcube/getagents"


def fetch_agents(token=None):
    """Return the raw agent list from MCube."""
    auth = token or config.require(
        "MCUBE_GETAGENTS_TOKEN", "MCube agents token (MCUBE_GETAGENTS_TOKEN)"
    )
    data = post(
        AGENTS_URL,
        {"AuthToken": auth},
        headers=JSON_HEADERS,
        label="MCube getagents",
    )
    if not isinstance(data, dict):
        raise ApiError("MCube getagents returned an unexpected response.")

    agent_list = data.get("agentlist")
    if not isinstance(agent_list, list):
        raise ApiError(
            "MCube getagents did not return an agent list — "
            f"{data.get('message') or data.get('success') or data}"
        )

    agents = []
    for row in agent_list:
        if not isinstance(row, dict):
            continue
        agents.append({
            "agent_id":     str(row.get("agent_id") or "").strip(),
            "agent_name":   str(row.get("agent_name") or "").strip(),
            "extension":    str(row.get("extension") or "").strip(),
            "email":        str(row.get("email") or "").strip(),
            "emp_phone":    str(row.get("emp_phone") or "").strip(),
            "login_status": str(row.get("login_status") or "").strip(),
            "break_status": str(row.get("break_status") or "").strip(),
        })
    return agents
