# -*- coding: utf-8 -*-
"""
Shared request helper for the LeadSquared v2 API.

Authentication is by ``accessKey`` and ``secretKey`` in the query string —
the same pair for every endpoint. The documented ceiling is 25 calls per 5
seconds, so the limiter is set to 5/second and shared across every LSQ call
the console makes.
"""

import config
from apis.http import RateLimiter, request

# LeadSquared: 25 requests per 5 seconds.
limiter = RateLimiter(5)


def host():
    """
    The account's API host, as a bare hostname.

    LeadSquared's own settings page presents this as
    "https://api-in21.leadsquared.com/v2/", so that is what people paste.
    Accepting only a bare hostname would turn a reasonable paste into a DNS
    failure, so every form is reduced here instead.
    """
    raw = config.require("LSQ_HOST", "LeadSquared API host (LSQ_HOST)")
    text = str(raw).strip().strip('"').strip("'")
    for prefix in ("https://", "http://"):
        if text.lower().startswith(prefix):
            text = text[len(prefix):]
    return text.split("/")[0].strip().strip(".")


def credentials():
    access = config.require("LSQ_ACCESS_KEY", "LeadSquared access key (LSQ_ACCESS_KEY)")
    secret = config.require("LSQ_SECRET_KEY", "LeadSquared secret key (LSQ_SECRET_KEY)")
    return access, secret


def call(method, path, payload=None, timeout=60, **params):
    """One authenticated LeadSquared call."""
    access, secret = credentials()
    query = {"accessKey": access, "secretKey": secret}
    query.update({k: v for k, v in params.items() if v is not None})

    kwargs = {"params": query, "headers": {"Accept": "application/json"}}
    if payload is not None:
        kwargs["json"] = payload
        kwargs["headers"]["Content-Type"] = "application/json"

    return request(
        method,
        f"https://{host()}{path}",
        limiter=limiter,
        timeout=timeout,
        label=f"LeadSquared {method} {path}",
        **kwargs,
    )
