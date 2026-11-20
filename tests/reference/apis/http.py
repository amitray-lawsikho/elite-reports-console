# -*- coding: utf-8 -*-
"""
apis/http.py
============
Shared HTTP plumbing for both providers.

Gives every API module the same behaviour:
  * one persistent ``requests.Session`` per thread (never shared across
    threads, whose connection pools are not safe to interleave),
  * a thread-safe token bucket so we stay under each provider's rate limit,
  * exponential-backoff retries for 429/5xx and network blips,
  * a single place where "empty body" is turned into a usable result.
"""

import threading
import time

import requests
import requests.adapters
import urllib3

# MCube's endpoints sit behind a certificate chain that the original tooling
# could not validate, so those calls are made with verify=False. Silence the
# resulting per-request warning rather than let it flood the log.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}
DEFAULT_TIMEOUT = 30

_thread_local = threading.local()


def _session() -> requests.Session:
    if not hasattr(_thread_local, "session"):
        s = requests.Session()
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=1, pool_maxsize=1, max_retries=0
        )
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        _thread_local.session = s
    return _thread_local.session


class RateLimiter:
    """Token bucket allowing ``max_rps`` requests per second across threads."""

    def __init__(self, max_rps: float):
        self._lock = threading.Lock()
        self._max = float(max_rps)
        self._tokens = float(max_rps)
        self._last = time.monotonic()

    def acquire(self):
        while True:
            with self._lock:
                now = time.monotonic()
                self._tokens = min(self._max, self._tokens + (now - self._last) * self._max)
                self._last = now
                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return
                wait = (1.0 - self._tokens) / self._max
            time.sleep(wait)


class ApiError(RuntimeError):
    """A provider returned an error we cannot retry past."""

    def __init__(self, message, status=None, body=None):
        super().__init__(message)
        self.status = status
        self.body = body


def request(method, url, *, limiter=None, retries=3, timeout=DEFAULT_TIMEOUT,
            expect_json=True, label=None, **kwargs):
    """
    Perform an HTTP request with rate limiting and retries.

    Returns the decoded JSON body (``{"success": True}`` when the response is
    empty) or, with ``expect_json=False``, the raw text.
    Raises :class:`ApiError` on a non-retryable failure or exhausted retries.
    """
    kwargs.setdefault("timeout", timeout)
    name = label or f"{method} {url}"
    session = _session()
    last_exc = None

    for attempt in range(1, retries + 1):
        if limiter is not None:
            limiter.acquire()
        try:
            response = session.request(method, url, **kwargs)
        except requests.RequestException as exc:
            last_exc = exc
            if attempt == retries:
                raise ApiError(f"{name}: connection failed — {exc}") from exc
            time.sleep(2 ** (attempt - 1))
            continue

        if response.status_code < 400:
            if not expect_json:
                return response.text
            if not response.content:
                return {"success": True}
            try:
                return response.json()
            except ValueError as exc:
                raise ApiError(
                    f"{name}: response was not JSON — {response.text[:300]}",
                    status=response.status_code,
                    body=response.text,
                ) from exc

        if response.status_code in RETRYABLE_STATUS and attempt < retries:
            time.sleep(2 ** (attempt - 1))
            continue

        raise ApiError(
            f"{name}: HTTP {response.status_code} — {response.text[:500]}",
            status=response.status_code,
            body=response.text,
        )

    raise ApiError(f"{name}: all {retries} attempts failed — {last_exc}")
