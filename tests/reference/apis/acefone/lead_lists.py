# -*- coding: utf-8 -*-
"""Acefone broadcast lead lists — /v1/broadcast/list(s)."""

from .client import call

LISTS_PATH = "/v1/broadcast/lists"
LIST_PATH = "/v1/broadcast/list"


def fetch_all(auth=None):
    """Every broadcast lead list, normalised to ``[{"id", "name", "raw"}]``."""
    res = call("GET", LISTS_PATH, auth=auth)
    rows = res.get("data", res) if isinstance(res, dict) else res
    if not isinstance(rows, list):
        return []

    lists = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        lid = row.get("id") or row.get("list_id")
        if lid in (None, ""):
            continue
        # field_map names the columns this list actually uses, in field_0..n
        # order. The bulk-delete API takes a "field" argument, and which
        # spelling it wants — "field_0" or the header name — is the difference
        # between a delete working and a 422, so both are kept available.
        field_map = row.get("field_map")
        if not isinstance(field_map, list):
            field_map = []

        lists.append({
            "id": str(lid).strip(),
            "name": str(row.get("name") or row.get("list_name") or f"List {lid}").strip(),
            "field_map": [str(f) for f in field_map],
            "raw": row,
        })
    lists.sort(key=lambda item: item["name"].lower())
    return lists


def create(payload, auth=None):
    return call("POST", LIST_PATH, auth=auth, json=payload)


def update(list_id, payload, auth=None):
    return call("PUT", f"{LIST_PATH}/{list_id}", auth=auth, json=payload)


def delete(list_id, auth=None):
    return call("DELETE", f"{LIST_PATH}/{list_id}", auth=auth)
