# -*- coding: utf-8 -*-
"""MCube campaign directory — POST /Restmcube-api/autodialer-list."""

import config
from apis.http import ApiError

from ._common import post

AUTODIALER_URL = "https://config.mcube.com/Restmcube-api/autodialer-list"


def fetch_campaigns(token=None):
    """
    Return every autodialer campaign on the account as
    ``[{"id", "name", "raw"}]``, newest MCube field names tolerated.

    The console needs the numeric id (the campaign API keys off it), while the
    UI shows the name, so both are normalised here.
    """
    auth = token or config.require(
        "MCUBE_AUTHORIZATION", "MCube app token (MCUBE_AUTHORIZATION)"
    )
    data = post(
        AUTODIALER_URL, {"Authorization": auth}, label="MCube autodialer-list"
    )
    if not isinstance(data, dict):
        raise ApiError("MCube autodialer-list returned an unexpected response.")

    rows = data.get("auto_dialer")
    if not isinstance(rows, list):
        raise ApiError(
            "MCube autodialer-list did not return campaigns — "
            f"{data.get('message') or data.get('error') or data}"
        )

    campaigns = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        cid = row.get("id") or row.get("campaign_id") or row.get("autodailer_id")
        if cid in (None, ""):
            continue
        campaigns.append({
            "id": str(cid).strip(),
            "name": _campaign_name(row, cid),
            "raw": row,
        })

    campaigns.sort(key=lambda c: c["name"].lower())
    return campaigns


# Field names MCube has been seen to use, most specific first.
_NAME_KEYS = (
    "name", "campaign_name", "list_name", "autodialer_name", "autodailer_name",
    "title", "campaign", "description", "label", "dialer_name",
)


def _campaign_name(row, cid):
    """
    Find the campaign's display name.

    MCube has not documented this response, and the key has varied between
    accounts, so rather than falling back to "Campaign 6" on the first miss we
    check the known names and then any field that simply looks like a label:
    a non-numeric string that is not an id, flag or timestamp.
    """
    for key in _NAME_KEYS:
        value = str(row.get(key) or "").strip()
        if value and not value.isdigit():
            return value

    skip = ("id", "date", "time", "status", "count", "flag", "type",
            "number", "phone", "url", "key", "token")
    for key, value in row.items():
        lowered = str(key).lower()
        if any(word in lowered for word in skip):
            continue
        text = str(value or "").strip()
        # A plausible label: short, has a letter, is not an identifier.
        if text and not text.isdigit() and any(c.isalpha() for c in text) and len(text) <= 80:
            return text

    return f"Campaign {cid}"
