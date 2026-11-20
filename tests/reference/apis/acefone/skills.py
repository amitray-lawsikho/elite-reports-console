# -*- coding: utf-8 -*-
"""
Acefone dialer skills — /v1/dialer/skill_lists and /v1/dialer/skills/{id}.

The bulk-create API only accepts a numeric ``skill_id``, but distribution
works in caller names. These helpers pull the skill catalogue so a caller
name can be resolved to an id automatically instead of being looked up by
hand.
"""

from .client import call

SKILL_LISTS_PATH = "/v1/dialer/skill_lists"
SKILLS_PATH = "/v1/dialer/skills"

PAGE_LIMIT = 100


def fetch_skill_lists(auth=None):
    """All dialer skill lists, as ``[{"id", "name", "raw"}]``."""
    res = call("GET", SKILL_LISTS_PATH, auth=auth)
    rows = res.get("data", []) if isinstance(res, dict) else res
    if not isinstance(rows, list):
        return []

    lists = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        sid = row.get("id")
        if sid in (None, ""):
            continue
        lists.append({
            "id": str(sid).strip(),
            "name": str(row.get("name") or f"Skill list {sid}").strip(),
            "raw": row,
        })
    lists.sort(key=lambda item: item["name"].lower())
    return lists


def fetch_skills(skill_list_id, auth=None, include_deleted=False):
    """
    Every skill inside a skill list, walked with cursor pagination.

    Deleted skills are filtered out by default — matching a caller to a
    deleted skill would push leads into a route that no longer dials.
    """
    collected = []
    cursor = None

    while True:
        params = {"limit": PAGE_LIMIT}
        if cursor is not None:
            params["last_seen_id"] = cursor

        res = call("GET", f"{SKILLS_PATH}/{skill_list_id}", auth=auth,
                   params=params, timeout=60)
        if not isinstance(res, dict):
            break

        page = res.get("data") or []
        if not page:
            break
        collected.extend(page)

        new_cursor = page[-1].get("id")
        if new_cursor == cursor or not res.get("hasMore"):
            break
        cursor = new_cursor

    skills = []
    for row in collected:
        if not isinstance(row, dict):
            continue
        sid = row.get("id")
        if sid in (None, ""):
            continue
        if row.get("deleted_at") and not include_deleted:
            continue
        skills.append({
            "id": str(sid).strip(),
            "name": str(row.get("name") or "").strip(),
            "deleted_at": row.get("deleted_at"),
        })
    return skills
