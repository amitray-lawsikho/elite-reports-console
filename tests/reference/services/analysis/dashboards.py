# -*- coding: utf-8 -*-
"""
services/analysis/dashboards.py
===============================
The ANALYSIS tab: five panels and three cards, computed straight off the report
that was just built.

The panel definitions are lifted from the report pages themselves, so a chart
here counts what the equivalent Power BI visual counts:

  FRESH LEADS          stage is one of the fresh stages
  BREACHED DNP LEADS   stage is Call Not Connected / Call Not Picking Up, and
                       the counter matches the DNP rule chosen before the build
  BREACHED LEADS       follow-up status is one of the breached spellings
  LEADS GIVEN          everything in the current selection
  ACTUAL ENROLLMENTS   stage is Actually Enrolled
  TOTAL / ENROLLED / CONVERSION %   the three cards, over the selection

Every report produces the same internal ``_`` columns (see reports/base.py),
which is why one module can draw all three pages. What differs is only which
field the bars are split by — Chat/Email/Referral splits Fresh Leads and Leads
Given by Type, the other two split by stage — and that is declared in
``PAGES`` rather than branched on in the code.
"""

import numpy as np
import pandas as pd

import config
from services import breach

# Which field each page splits its bars by, per panel.
PAGES = {
    "chat_email_referral": {
        "owner_label": "Owner",
        "fresh_series": "_type",
        "given_series": "_type",
        "slicers": ["month", "type", "team", "vertical"],
    },
    "incoming": {
        "owner_label": "Owner",
        "fresh_series": "_stage",
        "given_series": None,
        "slicers": ["month", "team", "vertical"],
    },
    "high_priority": {
        "owner_label": "Caller Name",
        "fresh_series": "_stage",
        "given_series": "_stage",
        "slicers": ["month", "team", "vertical", "campaign"],
    },
}

SLICER_COLUMNS = {
    "month":    ("_month",    "Month of Lead"),
    "type":     ("_type",     "Type"),
    "team":     ("_team",     "Team"),
    "vertical": ("_vertical", "Vertical"),
    "campaign": ("_campaign", "Campaign"),
    "owner":    ("_owner",    "Owner"),
    "stage":    ("_stage",    "Contact Stage"),
}


def page_config(key):
    return PAGES.get(str(key or "").strip().lower(), PAGES["incoming"])


# ---------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------
def options(view, key, filters=None):
    """
    What each slicer can offer, given what the *other* slicers have picked.

    Picking a Team narrows Owner to that team's people (and Vertical, Stage,
    Month… to what exists among them), the way Leads Console's pickers work.
    A slicer never narrows itself, so its own ticks stay visible; a ticked
    value the other slicers have ruled out is kept, with a count of 0, so it
    can still be unticked.
    """
    page = page_config(key)
    filters = filters or {}
    out = {"owner_label": page["owner_label"], "slicers": []}

    for name in page["slicers"] + ["owner", "stage"]:
        column, label = SLICER_COLUMNS[name]
        if column not in view.columns:
            continue
        everything = {v for v in view[column].fillna("").astype(str) if v.strip()}
        if not everything:
            continue
        others = {k: v for k, v in filters.items() if k != name}
        scoped = select(view, others)[column].fillna("").astype(str)
        counts = scoped[scoped.str.strip() != ""].value_counts().to_dict()
        picked = [str(v) for v in (filters.get(name) or []) if str(v).strip()]
        values = sorted(set(counts) | set(picked))
        # Months read far better newest-first, and they sort alphabetically
        # into nonsense otherwise ("APRIL-2026" before "MARCH-2026").
        if name == "month":
            order = pd.to_datetime(pd.Series(values, dtype="object"), format="%B-%Y",
                                   errors="coerce")
            values = [v for _, v in sorted(zip(order, values),
                                           key=lambda p: (pd.isna(p[0]), p[0]), reverse=True)]
        out["slicers"].append({"key": name, "label": label, "values": values,
                               "counts": {v: int(counts.get(v, 0)) for v in values},
                               "total": len(everything)})

    out["default_team"] = config.get("DEFAULT_TEAM") or ""
    out["months"] = sorted(
        {v for v in view["_month"].fillna("").astype(str) if v.strip()},
        key=lambda v: pd.to_datetime(v, format="%B-%Y", errors="coerce"), reverse=True,
    ) if "_month" in view.columns else []
    return out


def select(view, filters=None):
    """Apply the slicers. An empty list for a slicer means 'all of them'."""
    filters = filters or {}
    mask = pd.Series(True, index=view.index)

    for name, (column, _) in SLICER_COLUMNS.items():
        wanted = [str(v) for v in (filters.get(name) or []) if str(v).strip()]
        if wanted and column in view.columns:
            mask &= view[column].fillna("").astype(str).isin(wanted)

    # Stages the operator has chosen to leave out entirely — the Power BI pages
    # do this to drop Invalid / Irrelevant / Support Query rows.
    excluded = [str(v) for v in (filters.get("exclude_stages") or []) if str(v).strip()]
    if excluded and "_stage" in view.columns:
        mask &= ~view["_stage"].fillna("").astype(str).isin(excluded)

    excluded_owners = [str(v) for v in (filters.get("exclude_owners") or []) if str(v).strip()]
    if excluded_owners and "_owner" in view.columns:
        mask &= ~view["_owner"].fillna("").astype(str).isin(excluded_owners)

    return view[mask]


# ---------------------------------------------------------------------
# One panel
# ---------------------------------------------------------------------
def _panel(title, subtitle, rows, series_column, owner_column="_owner", limit=25):
    """
    A stacked bar panel: one bar per owner, split by ``series_column``.

    Owners are ordered by total descending — the way every one of these charts
    is actually read — and the long tail is cut at ``limit`` so a chart with
    sixty callers does not become unreadable.
    """
    if not len(rows):
        return {"title": title, "subtitle": subtitle, "categories": [], "series": [],
                "totals": [], "total": 0, "empty": True}

    owners = rows[owner_column].fillna("(No owner)").astype(str)

    if series_column and series_column in rows.columns:
        split = rows[series_column].fillna("").astype(str).replace("", "—")
        table = pd.crosstab(owners, split)
    else:
        table = pd.DataFrame({"Leads": owners.value_counts()})
        table.index.name = owner_column

    table = table.loc[table.sum(axis=1).sort_values(ascending=False).index]
    if limit and len(table) > limit:
        table = table.head(limit)

    # Biggest series first so the largest block sits at the base of each bar.
    table = table[table.sum(axis=0).sort_values(ascending=False).index]

    return {
        "title": title,
        "subtitle": subtitle,
        "categories": [str(i) for i in table.index],
        "series": [{"name": str(c), "values": [int(v) for v in table[c]]} for c in table.columns],
        "totals": [int(v) for v in table.sum(axis=1)],
        "total": int(table.to_numpy().sum()),
        "empty": False,
    }


def owner_slots(view, owner_column="_owner", slots=8):
    """
    A fixed colour slot per caller, decided once from the whole report.

    Hashing the name instead would be stable too, but two callers on a five
    person team collide surprisingly often and land the same colour side by
    side in the donut. Assigning slots in sorted order over every caller in
    the report gives each of the first eight a distinct one, and — because the
    list is the whole report, not the current selection — a filter still never
    repaints anybody.
    """
    names = sorted({str(v) for v in view[owner_column].fillna("").astype(str) if v.strip()})
    return {name: index % slots for index, name in enumerate(names)}


def _share(title, rows, owner_column="_owner", limit=12):
    """The enrollment donut: one slice per owner."""
    if not len(rows):
        return {"title": title, "slices": [], "total": 0, "empty": True}
    counts = rows[owner_column].fillna("(No owner)").astype(str).value_counts()
    if limit and len(counts) > limit:
        tail = int(counts[limit:].sum())
        counts = counts.head(limit)
        if tail:
            counts["Others"] = tail
    return {
        "title": title,
        "slices": [{"name": str(k), "value": int(v)} for k, v in counts.items()],
        "total": int(counts.sum()),
        "empty": False,
    }


def _matrix(rows, owner_column="_owner", series_column="_stage"):
    """The DATA VIEW pivot: owners down, stages across, counts in the cells."""
    if not len(rows):
        return {"columns": [], "rows": []}
    owners = rows[owner_column].fillna("(No owner)").astype(str)
    split = rows[series_column].fillna("").astype(str).replace("", "—")
    table = pd.crosstab(owners, split)
    table = table.loc[table.sum(axis=1).sort_values(ascending=False).index]
    table = table[table.sum(axis=0).sort_values(ascending=False).index]
    return {
        "columns": [str(c) for c in table.columns],
        "rows": [
            {"name": str(index), "values": [int(v) for v in row], "total": int(row.sum())}
            for index, row in table.iterrows()
        ],
        "totals": [int(v) for v in table.sum(axis=0)],
        "total": int(table.to_numpy().sum()),
    }


# ---------------------------------------------------------------------
# The page
# ---------------------------------------------------------------------
def breached_caption(days=None, today=None):
    """
    The Breached panel's subtitle. When every stage uses the same number of
    days it says it plainly — "Not dialled in the past 2 days (since
    22 Sep 2026)"; otherwise it lists each stage's days.
    """
    from services import dates as datelib
    days = days or config.breach_days()
    values = set(days.values())
    if len(values) == 1:
        n = int(values.pop())
        since = (today or datelib.today_ist()) - pd.Timedelta(days=n)
        return (f"Not dialled in the past {n} day{'s' if n != 1 else ''} "
                f"(since {since:%d %b %Y}) or follow-up overdue")
    return "Not dialled within " + ", ".join(f"{k} {v}d" for k, v in days.items())


def compute(view, key, filters=None):
    page = page_config(key)
    rows = select(view, filters)

    dnp_caption = breach.dnp_caption()

    fresh = rows[breach.fresh_mask(rows)]
    dnp = rows[breach.dnp_mask(rows)]
    breached = rows[breach.breached_mask(rows)]
    enrolled = rows[rows["_stage"] == breach.ENROLLED_STAGE]

    total = int(len(rows))
    enrolled_count = int(len(enrolled))

    # The breached strip that sits under the chart title in Power BI: how many
    # breaches came from each stage.
    breach_mix = (breached["_stage"].value_counts().to_dict() if len(breached) else {})

    return {
        "owner_slots": owner_slots(view),
        "cards": {
            "total": total,
            "enrolled": enrolled_count,
            "conversion": round(enrolled_count * 100.0 / total, 1) if total else 0.0,
            "breached": int(len(breached)),
            "fresh": int(len(fresh)),
            "dnp": int(len(dnp)),
            "owners": int(rows["_owner"].nunique()) if total else 0,
        },
        "breach_mix": {str(k): int(v) for k, v in breach_mix.items()},
        "dnp_caption": dnp_caption,
        "breach_days": config.breach_days(),
        "panels": {
            "fresh": _panel("Fresh leads", "Not yet worked",
                            fresh, page["fresh_series"]),
            "dnp": _panel("Breached DNP leads", dnp_caption,
                          dnp, "_stage"),
            "breached": _panel("Breached leads", breached_caption(),
                               breached, "_stage"),
            "given": _panel("Leads given", "Everything in this selection",
                            rows, page["given_series"]),
        },
        "enrollments": _share("Actual enrollments", enrolled),
        "tables": {
            "fresh": _matrix(fresh),
            "dnp": _matrix(dnp),
            "breached": _matrix(breached, series_column="_follow_up"),
            "given": _matrix(rows),
        },
    }


def leads(view, key, filters=None, panel="breached", search="", limit=500):
    """The rows behind a panel, for the table under the charts."""
    rows = select(view, filters)
    if panel == "fresh":
        rows = rows[breach.fresh_mask(rows)]
    elif panel == "dnp":
        rows = rows[breach.dnp_mask(rows)]
    elif panel == "breached":
        rows = rows[breach.breached_mask(rows)]
    elif panel == "enrolled":
        rows = rows[rows["_stage"] == breach.ENROLLED_STAGE]

    owner_filter = (filters or {}).get("panel_owner")
    if owner_filter:
        rows = rows[rows["_owner"].astype(str) == str(owner_filter)]

    query = str(search or "").strip().lower()
    if query:
        haystack = pd.Series("", index=rows.index)
        for column in rows.columns:
            if column.startswith("_") and column not in ("_owner", "_stage", "_campaign"):
                continue
            haystack = haystack + " " + rows[column].astype(str).str.lower()
        rows = rows[haystack.str.contains(query, regex=False, na=False)]

    total = int(len(rows))
    rows = rows.head(int(limit))

    # Only the columns a person scanning this table needs, found by whichever
    # name this report happens to use for them.
    def pick(*names):
        for name in names:
            if name in rows.columns:
                return rows[name].astype(str)
        return pd.Series("", index=rows.index)

    out = pd.DataFrame({
        "owner": rows["_owner"].astype(str),
        "lead": pick("Name", "Lead Name", "First Name"),
        "phone": pick("Lead_Phone_Number", "Phone Number", "Phone no"),
        "stage": rows["_stage"].astype(str),
        "follow_up": rows["_follow_up"].astype(str),
        "last_called": pick("Last Called date", "Last Called Date"),
        "next_follow_up": pick("Next Follow Up Date"),
        "calls": rows["_dial_count"].astype(int).astype(str),
        "why": (rows["_reason"].astype(str) if "_reason" in rows.columns
                else pd.Series("", index=rows.index)),
        "zip_intent": pick("Zip Intent"),
        "zip_justification": pick("Zip Intent Justification"),
    })
    return {"rows": out.to_dict("records"), "total": total, "shown": int(len(out))}


# ---------------------------------------------------------------------
# Download — the data view and the leads behind it
# ---------------------------------------------------------------------
PANEL_ORDER = [("fresh", "Fresh leads"), ("dnp", "Breached DNP"),
               ("breached", "Breached leads"), ("given", "Total distribution")]


def _matrix_frame(matrix, owner_label):
    columns = [owner_label] + matrix["columns"] + ["Total"]
    rows = [[r["name"]] + r["values"] + [r["total"]] for r in matrix["rows"]]
    rows.append(["Total"] + matrix["totals"] + [matrix["total"]])
    return pd.DataFrame(rows, columns=columns)


def export(view, key, module_columns, filters=None, path=None):
    """
    One workbook for the current selection:

      Leads            every lead in it — the report's own columns, then the
                       category it falls in, why it is (or is not) breached,
                       team and vertical
      Fresh / Breached DNP / Breached / Total
                       the Data view tables, owner by stage, with totals
    """
    page = page_config(key)
    rows = select(view, filters)
    result = compute(view, key, filters)

    category = pd.Series("", index=rows.index, dtype="object")
    category[breach.fresh_mask(rows)] = "Fresh"
    category[breach.dnp_mask(rows)] = "Breached DNP"
    category[breach.breached_mask(rows)] = "Breached"
    category[rows["_stage"] == breach.ENROLLED_STAGE] = "Enrolled"

    leads = pd.DataFrame(index=rows.index)
    for column in module_columns:
        if column in rows.columns:
            leads[column] = rows[column]
    leads["Category"] = category
    leads["Why (breach reason)"] = rows["_reason"] if "_reason" in rows.columns else ""
    leads["Team"] = rows["_team"]
    leads["Vertical"] = rows["_vertical"]
    leads = leads.fillna("")

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        leads.to_excel(writer, sheet_name="Leads", index=False)
        for name, title in PANEL_ORDER:
            table = result["tables"].get(name)
            if table and table["rows"]:
                _matrix_frame(table, page["owner_label"]).to_excel(
                    writer, sheet_name=title[:31], index=False)
        for sheet in writer.book.worksheets:
            for column in sheet.columns:
                width = max(len(str(c.value or "")) for c in list(column)[:200])
                sheet.column_dimensions[column[0].column_letter].width = min(48, max(10, width + 2))
            sheet.freeze_panes = "B2" if sheet.title != "Leads" else "A2"
    return int(len(leads))
