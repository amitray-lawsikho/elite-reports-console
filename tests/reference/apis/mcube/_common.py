# -*- coding: utf-8 -*-
"""Headers and shared helpers for the MCube endpoints."""

import base64
import json

import config
from apis.http import ApiError, RateLimiter, request

# MCube's web app is the only documented consumer of these endpoints, so the
# calls mirror the browser's headers.
BROWSER_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "origin": "https://app.mcube.com",
    "referer": "https://app.mcube.com/",
    "user-agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
    ),
}

JSON_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
}

# MCube is noticeably slower than Acefone and is not documented as rate
# limited; 4 rps keeps large batch jobs polite without dragging them out.
limiter = RateLimiter(4)


def post(url, payload, headers=None, *, label=None, timeout=60):
    """POST a JSON body to MCube. TLS verification is off to match the
    original tooling, which could not validate MCube's certificate chain."""
    return request(
        "POST",
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers or BROWSER_HEADERS,
        limiter=limiter,
        timeout=timeout,
        verify=False,
        label=label,
    )


def decode_jwt_payload(token):
    """Decode the payload segment of a JWT without verifying its signature."""
    parts = str(token).split(".")
    if len(parts) < 2:
        raise ApiError("MCube token is not a valid JWT.")
    padded = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(padded))
    except (ValueError, TypeError) as exc:
        raise ApiError("Could not decode the MCube token payload.") from exc


def secret_key():
    """
    The ``key`` the delete endpoint expects.

    MCube embeds it in the app JWT at ``data.calltype[0].secertkey``
    (their spelling), so it is derived from MCUBE_AUTHORIZATION rather than
    configured separately — which also means a stale token breaks deletes.
    """
    token = config.require("MCUBE_AUTHORIZATION", "MCube app token (MCUBE_AUTHORIZATION)")
    payload = decode_jwt_payload(token)
    calltype = (payload.get("data") or {}).get("calltype")
    if isinstance(calltype, list) and calltype:
        key = calltype[0].get("secertkey")
        if key:
            return key
    raise ApiError(
        "The MCube token does not contain a secret key. "
        "Refresh MCUBE_AUTHORIZATION from the MCube web app and try again."
    )
