# -*- coding: utf-8 -*-
"""
LeadSquared users — GET /v2/UserManagement.svc/Users.Get

The owner change needs a user's internal ``ID`` (a GUID), but everything
upstream — the roster sheet, the distribution, ``LSQ_Upload.csv`` — works in
email addresses. This is the bridge: one call returns every user, and the
console maps ``EmailAddress`` to ``ID`` from it.

``StatusCode`` is ``0`` for an active user and ``1`` for an inactive one.
Assigning leads to a deactivated user is almost always a mistake, so that
distinction is preserved rather than flattened away.
"""

from apis.http import ApiError

from .client import call

USERS_PATH = "/v2/UserManagement.svc/Users.Get"


def fetch_all():
    """Every user on the account, normalised."""
    data = call("GET", USERS_PATH)

    rows = data if isinstance(data, list) else None
    if rows is None and isinstance(data, dict):
        rows = data.get("Users") or data.get("List") or data.get("Result")
    if not isinstance(rows, list):
        raise ApiError(
            "LeadSquared did not return a user list — "
            f"{str(data)[:200]}"
        )

    users = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        user_id = row.get("ID") or row.get("Id") or row.get("UserId")
        email = str(row.get("EmailAddress") or "").strip()
        if not user_id or not email:
            continue

        try:
            status = int(row.get("StatusCode", 0))
        except (TypeError, ValueError):
            status = 0

        first = str(row.get("FirstName") or "").strip()
        last = str(row.get("LastName") or "").strip()
        users.append({
            "id": str(user_id).strip(),
            "email": email,
            "name": (first + " " + last).strip() or email,
            "role": row.get("Role") or "",
            "active": status == 0,
        })
    return users


def email_index(users=None):
    """
    ``lowercased email -> user``.

    An active user always wins over an inactive one with the same address, so
    a re-created account does not lose to the old record.
    """
    index = {}
    for user in (users if users is not None else fetch_all()):
        key = user["email"].lower()
        existing = index.get(key)
        if existing is None or (user["active"] and not existing["active"]):
            index[key] = user
    return index
