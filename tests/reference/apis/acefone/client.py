# -*- coding: utf-8 -*-
"""Shared request helper for the Acefone REST API."""

import config
from apis.http import RateLimiter, request

BASE_URL = "https://api.acefone.in"

# Acefone documents a 5 requests/second ceiling.
limiter = RateLimiter(5)


def token():
    return config.require("ACEFONE_TOKEN", "Acefone API token (ACEFONE_TOKEN)")


def call(method, path, *, auth=None, timeout=30, **kwargs):
    """Authenticated, rate-limited call against the Acefone API."""
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {auth or token()}",
    }
    if "json" in kwargs:
        headers["Content-Type"] = "application/json"

    return request(
        method,
        f"{BASE_URL}{path}",
        headers=headers,
        limiter=limiter,
        timeout=timeout,
        label=f"Acefone {method} {path}",
        **kwargs,
    )
