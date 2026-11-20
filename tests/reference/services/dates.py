# -*- coding: utf-8 -*-
"""
services/analytics/dates.py
===========================
Date standardisation for LeadSquared fields.

LeadSquared hands dates back in more than one shape, and — the part that
matters — not always in the same day/month order:

  * system and DateTime fields come as ISO text in **UTC**,
    ``2026-09-10 08:30:00`` — CreatedOn, ``mx_`` DateTime fields;
  * text fields written by dialers, workflows or imports can be
    month-first (``09-11-2026 13:14`` = 11 Sep) or day-first
    (``11-09-2026 19:44`` = 11 Sep), and those are Indian time already;
  * month names (``11-Sep-2026 07:44 PM``) and Excel serials (45910.6).

``09-11-2026`` cannot be read on its own, so the order is decided **per
column, from the column's own data**:

  1. a value whose first number is over 12 (``25-09-2026``) can only be
     day-first; one whose second number is over 12 (``09-25-2026``) can only
     be month-first. Those values are always read their one possible way, and
     they vote for the column's order;
  2. ambiguous values (both numbers 12 or under) follow the vote;
  3. for fields that can only be in the past (Last Called Date), an ambiguous
     value that would land in the future is read the other way round when
     that puts it in the past — a call cannot have happened in November when
     today is September;
  4. with no evidence at all, the column falls back to its own default.

No ``format="mixed"`` is used, so the result is the same on every pandas
version. Everything comes out as a naive IST ``datetime64``. ISO values are
shifted from UTC to IST when ``LSQ_DATES_ARE_UTC`` is on (the default).
"""

import re

import numpy as np
import pandas as pd

IST = "Asia/Kolkata"

_BLANKS = {"", "nan", "nat", "none", "null", "0001-01-01 00:00:00", "01/01/0001"}

# 2026-09-11 07:44:00 / 2026-09-11T07:44:00.000Z / 2026-09-11
_ISO = re.compile(
    r"^(?P<y>\d{4})-(?P<a>\d{1,2})-(?P<b>\d{1,2})"
    r"(?:[ T](?P<H>\d{1,2}):(?P<M>\d{2})(?::(?P<S>\d{2}))?(?:\.\d+)?)?"
    r"\s*(?P<tz>Z|UTC|GMT|[+-]00:?00)?$", re.I)

# 2026/09/11 13:14 — year first with slashes/dots: always Y/M/D, local time
_YMD = re.compile(
    r"^(?P<y>\d{4})[/.](?P<a>\d{1,2})[/.](?P<b>\d{1,2})"
    r"(?:[ T,]+(?P<H>\d{1,2}):(?P<M>\d{2})(?::(?P<S>\d{2}))?(?:\.\d+)?\s*(?P<ap>[AaPp]\.?[Mm]\.?)?)?"
    r"\s*(?:IST)?$", re.I)

# 09-11-2026 13:14 / 9/11/26 1:14 PM / 11.09.2026 19:44:05 — order unknown
_NUM = re.compile(
    r"^(?P<a>\d{1,2})[/\-.](?P<b>\d{1,2})[/\-.](?P<y>\d{2}|\d{4})"
    r"(?:[ T,]+(?P<H>\d{1,2}):(?P<M>\d{2})(?::(?P<S>\d{2}))?(?:\.\d+)?\s*(?P<ap>[AaPp]\.?[Mm]\.?)?)?"
    r"\s*(?:IST)?$", re.I)

_SERIAL = re.compile(r"^\d{5}(\.\d+)?$")


def _clean(series):
    text = pd.Series(series).astype("object")
    text = text.where(text.notna(), "").map(lambda v: re.sub(r"\s+", " ", str(v)).strip())
    return text.where(~text.str.lower().isin(_BLANKS), "")


def _compose(parts, year, month, day):
    """Build timestamps from extracted pieces; impossible dates become NaT."""
    hour = pd.to_numeric(parts["H"], errors="coerce").fillna(0) if "H" in parts else 0
    minute = pd.to_numeric(parts["M"], errors="coerce").fillna(0) if "M" in parts else 0
    second = pd.to_numeric(parts["S"], errors="coerce").fillna(0) if "S" in parts else 0
    if "ap" in parts:
        ap = parts["ap"].fillna("").str.lower().str.replace(".", "", regex=False)
        hour = hour.where(ap == "", (hour % 12) + np.where(ap == "pm", 12, 0))
    frame = pd.DataFrame({"year": year, "month": month, "day": day,
                          "hour": hour, "minute": minute, "second": second})
    # Row-by-row so one impossible date (31-02) does not take the rest down.
    ok = (frame["month"].between(1, 12)) & (frame["day"].between(1, 31)) & \
         (frame["hour"].between(0, 23)) & (frame["minute"].between(0, 59))
    out = pd.Series(pd.NaT, index=frame.index, dtype="datetime64[ns]")
    if ok.any():
        out.loc[ok] = pd.to_datetime(frame[ok].astype(int), errors="coerce").astype("datetime64[ns]")
    return out


def now_ist():
    return pd.Timestamp.now(tz=IST).tz_localize(None)


def today_ist():
    """Today's date in India, as a midnight Timestamp."""
    return now_ist().normalize()


def standardise(series, iso_is_utc=True, past_only=False, default_dayfirst=True,
                report=None, now=None):
    """
    Parse a column of LeadSquared date values into naive IST timestamps.

    ``past_only`` marks fields that cannot be in the future (Last Called
    Date). ``report``, when a dict, is filled with what was decided — the
    order used, counts, and a few raw -> parsed samples for the Date check.
    """
    now = now if now is not None else now_ist()
    text = _clean(series)
    out = pd.Series(pd.NaT, index=text.index, dtype="datetime64[ns]")
    info = {"nonblank": int((text != "").sum()), "iso": 0, "day_first": 0, "month_first": 0,
            "ambiguous": 0, "flipped_future": 0, "order": "", "other": 0,
            "unparsed": 0, "future": 0, "samples": []}

    # ---- ISO (LeadSquared's own format) ---------------------------------
    iso = text.str.extract(_ISO)
    is_iso = iso["y"].notna()
    if is_iso.any():
        p = iso[is_iso]
        stamps = _compose(p, pd.to_numeric(p["y"]), pd.to_numeric(p["a"]), pd.to_numeric(p["b"]))
        explicit_utc = p["tz"].notna()
        if iso_is_utc:
            stamps = stamps + pd.Timedelta(hours=5, minutes=30)
        else:
            stamps = stamps.where(~explicit_utc, stamps + pd.Timedelta(hours=5, minutes=30))
        out.loc[is_iso] = stamps
        info["iso"] = int(is_iso.sum())

    # ---- Year-first with slashes: unambiguous, local -------------------
    ymd = text.str.extract(_YMD)
    is_ymd = ymd["y"].notna() & ~is_iso
    if is_ymd.any():
        p = ymd[is_ymd]
        out.loc[is_ymd] = _compose(p, pd.to_numeric(p["y"]), pd.to_numeric(p["a"]), pd.to_numeric(p["b"]))

    # ---- dd/mm or mm/dd: decide the order from the column ----------------
    num = text.str.extract(_NUM)
    is_num = num["a"].notna() & ~is_iso & ~is_ymd
    if is_num.any():
        p = num[is_num]
        a = pd.to_numeric(p["a"])
        b = pd.to_numeric(p["b"])
        y = pd.to_numeric(p["y"])
        y = y.where(y >= 100, y + 2000)

        as_dmy = _compose(p, y, b, a)   # a = day,   b = month
        as_mdy = _compose(p, y, a, b)   # a = month, b = day

        # Only real dates vote: "31-02-2026" proves nothing about the order.
        only_day_first = (a > 12) & (b <= 12) & as_dmy.notna()
        only_month_first = (b > 12) & (a <= 12) & as_mdy.notna()
        ambiguous = (a <= 12) & (b <= 12)
        info["ambiguous"] = int(ambiguous.sum())

        votes_dmy, votes_mdy = int(only_day_first.sum()), int(only_month_first.sum())
        if votes_dmy > votes_mdy:
            dayfirst, why = True, f"day-first ({votes_dmy} values can only be day-first, {votes_mdy} only month-first)"
        elif votes_mdy > votes_dmy:
            dayfirst, why = False, f"month-first ({votes_mdy} values can only be month-first, {votes_dmy} only day-first)"
        elif past_only and ambiguous.any():
            # No clear vote: pick whichever reading puts fewer calls in the future.
            fut_dmy = int((as_dmy[ambiguous] > now).sum())
            fut_mdy = int((as_mdy[ambiguous] > now).sum())
            dayfirst = fut_dmy < fut_mdy if fut_dmy != fut_mdy else default_dayfirst
            why = ("day-first" if dayfirst else "month-first") + \
                  " (no value was unambiguous; chosen because the other order puts calls in the future)"
        else:
            dayfirst = default_dayfirst
            why = ("day-first" if dayfirst else "month-first") + " (no value was unambiguous; default)"

        chosen = as_dmy.where(only_day_first | (ambiguous & dayfirst), as_mdy)
        chosen = chosen.where(~only_month_first, as_mdy)

        if past_only:
            other = as_mdy if dayfirst else as_dmy
            flip = ambiguous & (chosen > now) & (other <= now)
            chosen = chosen.where(~flip, other)
            info["flipped_future"] = int(flip.sum())

        out.loc[is_num] = chosen
        info["day_first"] = votes_dmy
        info["month_first"] = votes_mdy
        info["order"] = why

    # ---- Excel serials ---------------------------------------------------
    is_serial = text.str.match(_SERIAL) & out.isna()
    if is_serial.any():
        days = pd.to_numeric(text[is_serial], errors="coerce")
        days = days.where((days > 20000) & (days < 80000))
        out.loc[is_serial] = pd.to_datetime("1899-12-30") + pd.to_timedelta(days, unit="D")

    # ---- Anything else (month names etc.): one at a time, day-first -------
    rest = (text != "") & out.isna() & ~is_serial
    if rest.any():
        from dateutil import parser as du
        parsed = {}
        for idx, value in text[rest].items():
            cleaned = re.sub(r"\b(IST|GMT\+0?5:?30)\b", "", value, flags=re.I).strip()
            try:
                stamp = du.parse(cleaned, dayfirst=True, fuzzy=False)
                if stamp.tzinfo is not None:
                    stamp = pd.Timestamp(stamp).tz_convert(IST).tz_localize(None)
                parsed[idx] = pd.Timestamp(stamp)
            except (ValueError, OverflowError, TypeError):
                continue
        if parsed:
            out.loc[list(parsed)] = pd.Series(parsed).astype("datetime64[ns]")
        info["other"] = len(parsed)

    info["unparsed"] = int(((text != "") & out.isna()).sum())
    if past_only:
        info["future"] = int((out > now + pd.Timedelta(hours=1)).sum())
    if not info["order"]:
        info["order"] = "ISO (UTC → IST)" if info["iso"] and iso_is_utc else ("ISO" if info["iso"] else "—")
    elif info["iso"]:
        info["order"] += f"; {info['iso']} ISO values (UTC → IST)" if iso_is_utc else f"; {info['iso']} ISO values"

    if report is not None:
        # Samples: ambiguous ones first, since those are the ones worth checking.
        pick = []
        if is_num.any():
            amb_idx = num[is_num][(pd.to_numeric(num[is_num]["a"]) <= 12) &
                                  (pd.to_numeric(num[is_num]["b"]) <= 12)].index[:4]
            pick.extend(amb_idx)
        pick.extend([i for i in text[text != ""].index[:6] if i not in pick])
        info["samples"] = [
            {"raw": text[i], "ist": "" if pd.isna(out[i]) else f"{out[i]:%d %b %Y %H:%M}"}
            for i in pick[:6]
        ]
        report.update(info)
    return out


def days_since(stamps, today=None):
    """Whole calendar days from each timestamp to today (negative = future)."""
    today = today if today is not None else today_ist()
    delta = (today - pd.Series(stamps).dt.normalize()).dt.days
    return delta.astype("float")  # NaN where the date is missing


def fmt(stamps, pattern):
    """Format timestamps for the CSV; blanks stay blank."""
    s = pd.Series(stamps)
    return s.dt.strftime(pattern).where(s.notna(), "")
