# -*- coding: utf-8 -*-
"""
LeadSquared lead retrieval — used by Leads Analysis.

(``leads.py`` beside this is the owner-change bulk update; this module only
ever reads.)

  POST /v2/LeadManagement.svc/Leads.Get        — leads by search criteria, paged
  GET  /v2/LeadManagement.svc/LeadsMetaData.Get — every field on the account

Leads Analysis asks for leads whose chosen date field — ModifiedOn,
CreatedOn, mx_Assigned_On or mx_Last_Called_Date_DT — is after a cutoff,
1000 at a time, the way the Colab notebook did it with ModifiedOn.

A lead with no value in that field is not returned at all: LeadSquared's
``>`` comparison has nothing to compare. That is why the page says so under
Assigned On and Last Called On. Two things are added:

  * the field list is checked against LeadsMetaData first, so a field that
    does not exist on this account (a renamed Zip field, say) is reported and
    left blank instead of failing the whole fetch;
  * a rate-limit or throttling reply is retried with a growing wait, but any
    other error stops with LeadSquared's own message rather than looping
    forever the way a bare ``isinstance(data, dict)`` check would.
"""

import time

from apis.http import ApiError

from .client import call

LEADS_GET_PATH = "/v2/LeadManagement.svc/Leads.Get"
METADATA_PATH = "/v2/LeadManagement.svc/LeadsMetaData.Get"

MAX_PAGE_SIZE = 1000
_THROTTLE_WORDS = ("rate", "limit", "too many", "throttl", "exceeded")


def available_fields():
    """Set of schema names on this account, or None if the call fails."""
    try:
        data = call("GET", METADATA_PATH)
    except ApiError:
        return None
    rows = data if isinstance(data, list) else (data or {}).get("Fields") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return None
    names = set()
    for row in rows:
        if isinstance(row, dict):
            name = row.get("SchemaName") or row.get("schemaName")
            if name:
                names.add(str(name).strip())
    return names or None


def _is_throttle(message):
    text = str(message or "").lower()
    return any(word in text for word in _THROTTLE_WORDS)


def fetch_page(cutoff_utc, fields, page, page_size=MAX_PAGE_SIZE, max_waits=8, log=None,
               lookup_name="ModifiedOn"):
    """
    One page of leads whose ``lookup_name`` date is after ``cutoff_utc``
    ("YYYY-MM-DD HH:MM:SS").

    Returns a list of lead dicts; an empty list means there are no more.
    """
    payload = {
        "Parameter": {
            "LookupName": lookup_name,
            "LookupValue": cutoff_utc,
            "SqlOperator": ">",
        },
        "Columns": {"Include_CSV": ",".join(fields)},
        "Paging": {"PageIndex": int(page), "PageSize": int(min(page_size, MAX_PAGE_SIZE))},
    }

    waits = 0
    while True:
        try:
            data = call("POST", LEADS_GET_PATH, payload=payload, timeout=120)
        except ApiError as exc:
            if (exc.status == 429 or _is_throttle(exc)) and waits < max_waits:
                waits += 1
                if log:
                    log(f"LeadSquared asked us to slow down — waiting {waits * 5}s.")
                time.sleep(waits * 5)
                continue
            raise

        if isinstance(data, list):
            return data

        # A dict here is LeadSquared reporting a problem inside a 200.
        message = ""
        if isinstance(data, dict):
            message = data.get("ExceptionMessage") or data.get("Message") or str(data)
        if _is_throttle(message) and waits < max_waits:
            waits += 1
            if log:
                log(f"LeadSquared asked us to slow down — waiting {waits * 5}s.")
            time.sleep(waits * 5)
            continue
        if isinstance(data, dict) and data.get("success") is True and len(data) == 1:
            return []   # empty body
        raise ApiError(f"LeadSquared Leads.Get failed on page {page}: {str(message)[:400]}")
