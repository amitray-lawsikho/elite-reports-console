# -*- coding: utf-8 -*-
"""
config.py
=========
Single source of truth for every credential, sheet link and tunable in
Reports Console.

Values are read from the ``.env`` file sitting next to this module (falling
back to real environment variables, then to the defaults below).
``update(...)`` writes changes back to ``.env`` and refreshes the in-process
values, which is what the Settings tab calls — so a rotated API key, a new
month's High Priority sheet or a re-deployed Apps Script URL can be replaced
without touching a file or restarting the server.

Nothing in this file is a secret by accident: keys marked secret are masked
before they are sent to the browser, and only ever leave the machine in the
API call they belong to.
"""

import os
import threading

from dotenv import load_dotenv, set_key

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

_lock = threading.Lock()

# ---------------------------------------------------------------------
# Every setting the app understands:  key -> (default, is_secret)
# ---------------------------------------------------------------------
SPEC = {
    # -------------------------------------------------- LeadSquared
    "LSQ_HOST":                   ("api-in21.leadsquared.com", False),
    "LSQ_ACCESS_KEY":             ("", True),
    "LSQ_SECRET_KEY":             ("", True),
    # Leads.Get page size. LeadSquared's maximum is 1000.
    "LSQ_PAGE_SIZE":              ("1000", False),
    # LeadSquared returns ISO dates in UTC; with this on they are shifted to
    # IST before any breach maths or download.
    "LSQ_DATES_ARE_UTC":          ("true", False),
    # The fetch that feeds every report. Days is editable per run on the page.
    "DEFAULT_FETCH_DAYS":         ("30", False),
    # Which date the fetch filters on: assigned | modified | created | last_called
    "DEFAULT_FETCH_BASIS":        ("modified", False),
    # How long a fetch and a built report are kept before they must be re-run.
    "KEEP_HOURS":                 ("12", False),
    # Date format in report downloads (Python strftime).
    "DOWNLOAD_DATE_FORMAT":       ("%d/%m/%Y %H:%M:%S", False),

    # -------------------------------------------------- Roster
    # Published Google Sheet (CSV): Caller Name, Team Name, Vertical, Email id
    "ROSTER_URL": (
        "https://docs.google.com/spreadsheets/d/e/"
        "2PACX-1vRT73ztvPNZSvIu5WLxo-3WQ76JMAnt4P9dITd4EAbjSvuDytfgvdfri1WPXotCjm_Etnb80_Q7S-wf"
        "/pub?gid=0&single=true&output=csv",
        False,
    ),

    # -------------------------------------------------- Shared sources
    # Stage-change log — supplies Comment LSQ and a fallback email.
    "STAGE_LOG_URL": (
        "https://docs.google.com/spreadsheets/d/"
        "1Pep2utYPzlnaPCKRVPfQSNdFyMlRpljektmt7DYvHjM/export?format=csv&gid=1411983190",
        False,
    ),
    # Revenue / enrollment tracker used by Chat-Email-Referral and Incoming.
    "REV_SHEET_URL": (
        "https://docs.google.com/spreadsheets/d/"
        "1fFdwIWzS_JOcDLQ8ZP0BlNUm__OTW2vT99JB9hDukJA/export?format=csv&gid=337716200",
        False,
    ),

    # -------------------------------------------------- Chat / Email / Referral
    "CER_COMBINED_URL": (
        "https://docs.google.com/spreadsheets/d/"
        "1hB3x_3Ww4_XXXaEQC_xPAxhld3dtYfb_zLNYNZgIc3Y/export?format=csv&gid=723301669",
        False,
    ),
    "CER_PUSH_URL": (
        "https://script.google.com/macros/s/"
        "AKfycbw7SFbPltUazDrEWoB9qiAvZVdhSg6I3SsRLvE3ZiJGi5C6Xq5RPgEkuKUisM-VaMvBeg/exec",
        False,
    ),

    # -------------------------------------------------- Incoming
    # Historic Ozonetel calls already recorded, merged with the uploaded CSV.
    "INCOMING_MASTER_URL": (
        "https://docs.google.com/spreadsheets/d/"
        "1hB3x_3Ww4_XXXaEQC_xPAxhld3dtYfb_zLNYNZgIc3Y/export?format=csv&gid=1765275690",
        False,
    ),
    "INCOMING_PUSH_URL": (
        "https://script.google.com/macros/s/"
        "AKfycbyYqOjuDGgbsQkFjKyj4EmHz7zxx5mYPclOrkRpAw_ls6DMEyi-bkKJp0zDnSBba_ntZA/exec",
        False,
    ),

    # -------------------------------------------------- High Priority
    # The lead sheets. HP_PREVIOUS_MONTH_URL is rolled over every month —
    # last month's sheet becomes the previous one, this month's the current.
    "HP_CURRENT_MONTH_URL": (
        "https://docs.google.com/spreadsheets/d/e/"
        "2PACX-1vRcc_PLg4grrFReYEc5Qo6A_iAWcj_b4H27AZy0Rjld4PmB6SCeDP6nb8vhTb9Ha6_K6D7ngK82FDh5"
        "/pub?gid=0&single=true&output=csv",
        False,
    ),
    "HP_PREVIOUS_MONTH_URL": (
        "https://docs.google.com/spreadsheets/d/e/"
        "2PACX-1vTx_UoJJG8r1haKOrlfYMivp5QYvPHQ53Eh1ApdHprZn8uLgcndqg58haIkG8KiQ_jSgwqcA8f2Y_S-"
        "/pub?gid=0&single=true&output=csv",
        False,
    ),
    # The HP enrollment tracker is published as two tabs; both are read and
    # concatenated. Leave the second blank if there is only one.
    "HP_REV_URL_1": (
        "https://docs.google.com/spreadsheets/d/e/"
        "2PACX-1vR9ImdIoP2hqQ0kaYZR88il5IhzBL4tA9_i_dawmf_e2Y_oeWR2rv4MVJyZMHpRpSdM4zGncZkjmVSW"
        "/pub?gid=1275960172&single=true&output=csv",
        False,
    ),
    "HP_REV_URL_2": (
        "https://docs.google.com/spreadsheets/d/e/"
        "2PACX-1vR9ImdIoP2hqQ0kaYZR88il5IhzBL4tA9_i_dawmf_e2Y_oeWR2rv4MVJyZMHpRpSdM4zGncZkjmVSW"
        "/pub?gid=196799956&single=true&output=csv",
        False,
    ),
    "HP_PUSH_URL": (
        "https://script.google.com/macros/s/"
        "AKfycbwokWICjaaHXdbcjDdU03quNdynhgqjGqekRyBGnidImYW9AHkQYA2pZ3RJcDxwZs0kmA/exec",
        False,
    ),

    # -------------------------------------------------- Ozonetel
    # The Incoming report fetches its calls from the Ozonetel CDR API instead
    # of an uploaded export: every day from the master sheet's newest Call
    # Date up to today. Same key and username as the other Ozonetel app.
    "OZONETEL_API_KEY":           ("", True),
    "OZONETEL_USERNAME":          ("", False),
    "OZONETEL_API_URL":           ("https://in1-ccaas-api.ozonetel.com/ca_reports/fetchCDRDetails", False),
    # Which calls are "sales incoming": the Skill, comma separated.
    "OZONETEL_SKILLS":            ("sales,Arbitrage_Sales", False),
    # Ozonetel allows 2 requests a minute.
    "OZONETEL_SLEEP_SECONDS":     ("32", False),
    "OZONETEL_PAGE_SIZE":         ("500", False),
    # Today's calls are re-fetched when the cached copy is older than this.
    "OZONETEL_TODAY_REFRESH_MINUTES": ("30", False),

    # -------------------------------------------------- Zoho SalesIQ
    # The Sales IQ Chats tab — the same values the Apps Script read from its
    # Script Properties.
    "ZOHO_CLIENT_ID":             ("", True),
    "ZOHO_CLIENT_SECRET":         ("", True),
    "ZOHO_REFRESH_TOKEN":         ("", True),
    "ZOHO_DC":                    ("in", False),
    "SALESIQ_SCREEN_NAME":        ("addictivelearning", False),

    # -------------------------------------------------- Dialers
    # Same keys as Leads Console — paste them from its Settings.
    "MCUBE_API_KEY":              ("", True),     # campaign upload (push)
    "MCUBE_AUTHORIZATION":        ("", True),     # app token: campaign list
    "MCUBE_GETAGENTS_TOKEN":      ("", True),     # agent directory -> Agent Number
    "MCUBE_EMPLOYEES_AUTHORIZATION": ("", True),  # fuller agent directory
    "MCUBE_AGENT_SOURCE":         ("both", False),
    "MCUBE_PUSH_BATCH_SIZE":      ("200", False),
    "MCUBE_RETRY_ATTEMPTS":       ("3", False),
    "MCUBE_RETRY_TIME":           ("180", False),
    "MCUBE_SEND_REFID":           ("false", False),
    "MCUBE_PRIORITY":             ("1", False),
    "ACEFONE_TOKEN":              ("", True),
    "ACEFONE_SKILL_LIST_ID":      ("", False),
    "ACEFONE_PUSH_BATCH_SIZE":    ("500", False),
    "ACEFONE_PRIORITY":           ("30", False),

    # -------------------------------------------------- Breach rules
    # Asked for before every build and remembered here. The same rule as
    # Leads Console: follow-up date first, then last call; never called with
    # no follow-up is breached.
    "RULE_DAYS_FOLLOW_UP":        ("2", False),
    "RULE_DAYS_COUNSELLED":       ("2", False),
    "RULE_DAYS_CALL_BACK":        ("2", False),
    # Less-dialled DNP: Call Not Connected / Call Not Picking Up whose
    # counter matches. counter = phone | assigned; op = lt | gt | eq;
    # value = 4, or for eq a list/range such as 2-5 or 1,3.
    "DNP_COUNTER":                ("phone", False),
    "DNP_OPERATOR":               ("lt", False),
    "DNP_VALUE":                  ("4", False),
    # The Team the Analysis pages open on (blank = every team).
    "DEFAULT_TEAM":               ("Elite", False),
    # Call counter wording. Counts of 1..N are written out exactly
    # ("3 times dialled"); anything above N collapses to
    # "Dialled more than N times". A counter that is not a number at all
    # (the sheets' "Dialled From Personal") is passed through untouched.
    "DIAL_LABEL_MAX":             ("6", False),
    # Rows per request when pushing to an Apps Script endpoint. 0 = one shot.
    "PUSH_CHUNK_ROWS":            ("0", False),
    "PUSH_TIMEOUT_SECONDS":       ("300", False),

    # -------------------------------------------------- App
    "PORT":                       ("5200", False),
    "APP_USER":                   ("", False),
    "APP_PASS":                   ("", True),
    "MAX_FILE_AGE_HOURS":         ("12", False),
}

SECRET_KEYS = {k for k, (_, secret) in SPEC.items() if secret}

# Settings that must be a URL if they are set at all — checked on save so a
# half-pasted link is caught here rather than mid-report.
URL_KEYS = {k for k in SPEC if "_URL" in k}


def reload_env():
    """Re-read .env from disk, letting the file win over stale process values."""
    load_dotenv(ENV_PATH, override=True)


reload_env()


# ---------------------------------------------------------------------
# Readers
# ---------------------------------------------------------------------
def get(key, default=None):
    """Current value of a setting as a stripped string."""
    spec_default = SPEC.get(key, ("", False))[0]
    raw = os.getenv(key)
    if raw is None or str(raw).strip() == "":
        return spec_default if default is None else default
    return str(raw).strip()


def get_int(key, fallback=0):
    try:
        return int(str(get(key)).strip())
    except (TypeError, ValueError):
        return fallback


def get_bool(key, fallback=False):
    val = str(get(key)).strip().lower()
    if val in ("1", "true", "yes", "on"):
        return True
    if val in ("0", "false", "no", "off"):
        return False
    return fallback


def require(key, label=None):
    """Return a setting, raising a readable error when it has not been set."""
    val = get(key)
    if not val:
        raise RuntimeError(
            f"{label or key} is not configured. "
            f'Open the "Setup and links" page and paste it (or set {key} in .env).'
        )
    return val


# ---------------------------------------------------------------------
# Writer
# ---------------------------------------------------------------------
def update(values: dict) -> list:
    """
    Persist a {key: value} mapping to .env and to the live process.

    Unknown keys are ignored. A value of ``None`` means "leave untouched",
    which lets the Settings form post masked secrets back without wiping them.
    Returns the list of keys actually written.
    """
    written = []
    with _lock:
        if not os.path.exists(ENV_PATH):
            open(ENV_PATH, "a", encoding="utf-8").close()

        for key, value in (values or {}).items():
            if key not in SPEC or value is None:
                continue
            value = str(value).strip()
            # A masked secret coming back unchanged from the form is a no-op.
            if key in SECRET_KEYS and value and set(value) == {"*"}:
                continue
            if key in URL_KEYS and value and not value.lower().startswith(("http://", "https://")):
                raise ValueError(f"{key} must be a full https:// link — got {value[:60]!r}")
            # '%' in the date format must stay literal; quoting keeps it so.
            quote = "always" if key == "DOWNLOAD_DATE_FORMAT" else "never"
            set_key(ENV_PATH, key, value, quote_mode=quote)
            os.environ[key] = value
            written.append(key)

    reload_env()
    return written


def snapshot(mask_secrets=True) -> dict:
    """All settings, with secrets replaced by a fixed-width mask for the UI."""
    out = {}
    for key in SPEC:
        val = get(key)
        if mask_secrets and key in SECRET_KEYS and val:
            out[key] = "*" * 12
        else:
            out[key] = val
    return out


def breach_days() -> dict:
    """Stage -> breached days, as the build dialog shows them."""
    return {
        "Follow Up For Closure": get_int("RULE_DAYS_FOLLOW_UP", 2),
        "Counselled lead":       get_int("RULE_DAYS_COUNSELLED", 2),
        "Call Back Later":       get_int("RULE_DAYS_CALL_BACK", 2),
    }


# Stage -> the setting that holds its days, for the build dialog.
BREACH_DAY_KEYS = {
    "Follow Up For Closure": "RULE_DAYS_FOLLOW_UP",
    "Counselled lead":       "RULE_DAYS_COUNSELLED",
    "Call Back Later":       "RULE_DAYS_CALL_BACK",
}


def dnp_rule() -> dict:
    counter = str(get("DNP_COUNTER") or "phone").strip().lower()
    op = str(get("DNP_OPERATOR") or "lt").strip().lower()
    return {
        "counter": counter if counter in ("phone", "assigned") else "phone",
        "op": op if op in ("lt", "gt", "eq") else "lt",
        "value": str(get("DNP_VALUE") or "4").strip() or "4",
    }


def status() -> dict:
    """Which pieces are configured — drives the readiness badges in the UI."""
    return {
        "lsq":      bool(get("LSQ_ACCESS_KEY") and get("LSQ_SECRET_KEY")),
        "roster":   bool(get("ROSTER_URL")),
        "cer":      bool(get("CER_COMBINED_URL") and get("REV_SHEET_URL")),
        "incoming": bool(get("INCOMING_MASTER_URL")),
        "ozonetel": bool(get("OZONETEL_API_KEY") and get("OZONETEL_USERNAME")),
        "mcube":    bool(get("MCUBE_API_KEY") and get("MCUBE_AUTHORIZATION")),
        "mcube_agents": bool(get("MCUBE_GETAGENTS_TOKEN") or get("MCUBE_EMPLOYEES_AUTHORIZATION")),
        "acefone":  bool(get("ACEFONE_TOKEN")),
        "salesiq":  bool(get("ZOHO_CLIENT_ID") and get("ZOHO_CLIENT_SECRET")
                         and get("ZOHO_REFRESH_TOKEN")),
        "high":     bool(get("HP_CURRENT_MONTH_URL")),
        "push_cer":      bool(get("CER_PUSH_URL")),
        "push_incoming": bool(get("INCOMING_PUSH_URL")),
        "push_high":     bool(get("HP_PUSH_URL")),
    }
