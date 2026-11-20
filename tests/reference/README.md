# Reports Console

One roof for the three lead reports and the dashboards built on them.

It replaces the four Colab cells. The logic is the one your team already
relies on — the same joins, the same output columns, the same Google Sheets —
with three differences:

* **Zip Intent and Zip Intent Justification** are now the last two columns of
  every report, read from `mx_Zip_Intent` and `mx_Zip_Intent_Justification`.
* **LeadSquared is fetched once**, not three times. All three reports are built
  from that one snapshot, so a rebuild after an LSQ update costs one fetch
  rather than three.
* **The dashboards are in the console.** The same five panels and three cards
  as the Power BI pages, drawn straight from the report you just built, so you
  can see the numbers before you push anything. Pushing to the Sheets is
  unchanged, so Power BI keeps working exactly as it does now.

---

## Am I running the right app?

Leads Console serves on **5100** and the old push console on **5000**. This one
runs on **5200**, steps to the next free port if that is taken, names the other
console when it finds it squatting, and opens your browser itself once it is
genuinely listening.

### Starting it on Windows

Run **`setup.bat`** once. It creates a virtual environment beside the app and
installs the packages into it, so the console never depends on which Python
happens to be first on your PATH.

Then double-click **`Reports Console.vbs`** — no command window, opens your
browser itself, and stops when you close the last tab.

That launcher does not guess at an interpreter. It asks the Python that
`Start-Console-Visible.bat` uses where it lives, takes the `pythonw.exe` beside
it, and **proves that interpreter can import flask, dotenv, pandas, requests
and openpyxl before launching anything**. If none qualifies, it falls back to
running `python.exe` with the window hidden. If the console still fails to
start, it shows the reason in a dialog and offers to open `server.log` — rather
than doing nothing at all, which is the usual way a windowless launcher fails.

It also waits for the server to answer its own health check before opening the
browser, so it can never land you on a dead address.

If it misbehaves:

| Run this | What it does |
|---|---|
| `Start-Console-Visible.bat` | the same app with the window kept open, so you can read the error |
| `Fix-Packages.bat` | installs the packages into the exact interpreter being used |
| `Diagnose.bat` | a full checklist — Python, packages, port, files, and the tail of `server.log` |
| `setup.bat` | starts over with a clean virtual environment |

On macOS or Linux, `./start-console.sh`. Do not open a browser yourself; the
app opens the right address once it is genuinely listening.

---

## The Reports page — four steps on one panel

```
 1. Fetch      LeadSquared (last N days) + Ozonetel sales incoming calls
               for every day from the master sheet's newest Call Date to today
 2. Build      all three reports, straight away — to find what does not match
 3. Update LSQ download the unmatched leads' CSV, import against mx_Report_Type
 4. Rebuild    asks for the breached days and the DNP rule (defaults 2 / 2 / 2
               days, Phone Call Counter < 4), fetches again and rebuilds; the
               log ends with "Unmatched leads went 312 -> 7"
```

After step 4, **The reports**: each report's Excel / CSV, preview, push to its
Google Sheet, dashboard, and a per-report rebuild.

Then **Dialer files**: tick Breached, Less-dialled DNP and/or Fresh, which
reports, and whose leads — teams and callers from the roster, with each
caller's count (nothing ticked = everyone). They become one list — each lead
once, with its current owner — as an MCube file and an Acefone file.

The **MCube** and **Acefone** panels push them, as in Leads Console: pick the
campaign / lead list, optionally upload a file of your own instead, set retry
attempts, retry time and a priority override (MCube) or a priority override
and the skill list, with a reviewable caller → skill mapping (Acefone).

One status line and one log serve every step. A job keeps its whole log on the
server, so leaving the page and coming back picks it straight back up; a job
that finished while you were away is replayed into the log only, and the
status line says Done, Failed or Stopped — it no longer sits on the fetch's
last "page N…" line.

### Ozonetel

The Incoming report no longer needs an upload. The master sheet holds every
call up to the last report pushed, so its newest Call Date is where to start;
that day and every day to today are fetched from the Ozonetel CDR API (one
request per day, two a minute). Only Skill `sales` (LawSikho_Incoming) and
`Arbitrage_Sales` (Arbitrage_Incoming) count. Rows are de-duplicated on UCID
— Ozonetel repeats a CallID across legs. Finished days are cached in
`ozonetel_cache/` and never fetched twice; today is re-fetched after 30
minutes. Ozonetel keeps only 15 days: an older gap is clamped and the log says
which days could not be fetched. After that the report runs exactly as
before: one row per number, the latest call (and its Status) wins.

## Sales IQ Chats

The Google Sheet's `runSync`, moved into the console — the chats are kept in
`salesiq.db` (SQLite) beside the app instead of a sheet.

1. **Fetch from SalesIQ.** Zoho OAuth from the refresh token, then every chat
   updated since the last fetch (less 5 minutes). The first fetch starts on
   the 1st of the current month; "Fetch again from" refetches from any date.
   Missed and ended chats only, as before. A chat is stored once by
   `chat_id` — fetched again, it is updated, never duplicated, and its
   transcript is only refetched if the chat changed. Every fetch is kept in
   **Fetch history**, which is how the next one knows where to start.
2. **Map to LeadSquared.** LeadSquared on Modified On for the last N days (N
   is suggested from the oldest chat in the filter), matched on the ten-digit
   phone, then email. Each chat carries the lead's Email, Enquired Course,
   Campaign Name, Contact Stage, Created On, Funnel name, Last Called Date,
   Owner, counters, Report_Type, Zip Intent, Owner Email, Prospect ID, Phone
   and Lead Name. This never touches the Reports page's snapshot.

Filters: Month, Last N days, Source, Chat type, matched / not matched, search.
**Merge repeat visitors** (on by default) shows one row per Source + Name +
Email + Phone with every transcript joined — the database still keeps each
chat. **Download CSV** and **Delete** (before a date, or exactly the filtered
chats) act on what is shown.

Zoho keys (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`) are on
Setup and links. Gemini classification is not carried over.

## The three reports

| Report | Lead list comes from | Needs an upload | Matched on |
|---|---|---|---|
| Chat, Email & Referral | the enquiry sheet your team keeps | no | phone number |
| Incoming Leads | Ozonetel API, merged with the master history | no | phone number |
| High Priority Leads | this month's and last month's lead sheets | no | Prospect ID |

Each one joins the snapshot for stage, owner, last call, the two call counters
and the two Zip fields; the enrollment tracker for conversions; the roster for
Team and Verticals; and the stage-change log for the caller's comment.

### High Priority — the monthly rollover

The two lead-sheet links are plain Settings fields because they change every
month. At the start of a month:

1. open **Settings → High Priority lead sheets**,
2. copy what is in **Current month** into **Previous month**,
3. paste the new month's link into **Current month**.

Nothing else moves. Both sheets are read and merged, de-duplicated on Prospect
ID with the most recent Timestamp winning, so an overlap between the two costs
nothing and a lead that appears in both is counted once.

---

## Breach rules

One engine for all three reports, the dashboards and the dialer files — the
same rule as Leads Console. N is asked for before every build (and
remembered):

| Stage | Default N |
|---|---|
| Follow Up For Closure | 2 days |
| Counselled lead | 2 days |
| Call Back Later | 2 days |

Last call is `Last Called Date DT`, falling back to `Last Called Date`; the
follow-up is the later of `Follow up date and time` and `Next follow up date`,
shown in every report as **Next Follow Up Date** beside the last call.

1. Follow-up still ahead, or less than N days old -> not breached.
2. Follow-up N or more days old -> breached, unless called in the last N days.
3. No follow-up -> breached when the last call is more than N days old.
4. Never called and no follow-up -> breached.

**Less-dialled DNP** is Call Not Connected / Call Not Picking Up whose Phone
Call Counter or Assigned On Call Counter is less than / more than / equal to a
number — Phone Call Counter less than 4 by default, chosen in the same dialog.

**Fresh** is New Lead, Re-enquired Lead, Opportunity Created and Untouched Lead.

## Where the keys and links go

Nowhere in the code. **Every API key and every sheet link is on Setup and
links** — LeadSquared, Ozonetel, MCube, Acefone, the roster, each report's
sheets and push links — each with Save & test against the live source, the way
Leads Console's Setup page works. **Settings** holds only behaviour: fetch
defaults, breach rules, Ozonetel pacing, dialer priorities and retries. All of it is written
to `.env` beside the app, and saving takes effect immediately — no restart.

| Setting | What it is |
|---|---|
| `LSQ_ACCESS_KEY` / `LSQ_SECRET_KEY` | LeadSquared → Settings → API and Webhooks |
| `ROSTER_URL` | the roster sheet: Caller Name, Team Name, Vertical, Email id |
| `HP_CURRENT_MONTH_URL` / `HP_PREVIOUS_MONTH_URL` | the High Priority lead sheets, rolled over monthly |
| `CER_COMBINED_URL` | the Chat/Email/Referral enquiry sheet |
| `INCOMING_MASTER_URL` | the historic Ozonetel calls — its newest date is where the Ozonetel fetch starts |
| `OZONETEL_API_KEY` / `OZONETEL_USERNAME` | the Ozonetel CDR API — same as the other Ozonetel app |
| `MCUBE_*`, `ACEFONE_*` | the dialers — same keys as Leads Console |
| `REV_SHEET_URL`, `HP_REV_URL_1`, `HP_REV_URL_2` | the enrollment trackers |
| `STAGE_LOG_URL` | the stage-change log, for caller comments |
| `*_PUSH_URL` | each report's Apps Script web app |

A link that is not actually published to the web returns Google's sign-in page
rather than CSV; the console notices and says so, instead of failing later with
a baffling "column not found".

---

## The Analysis tab

One page per report:

* **Fresh leads** — stages nobody has worked yet
* **Breached DNP leads** — not connected or not picking up, matching the DNP rule
* **Breached leads** — past the follow-up window for their stage
* **Leads given** — everything in the current selection
* **Actual enrollments** — the donut, by caller
* **Total leads / Enrolled / Conversion %** — the three cards

Slicers (Month of Lead, Type, Team, Vertical, Campaign, Owner, Contact Stage)
cascade the way Leads Console's pickers do: tick a Team and Owner lists only
that team's people, with a count beside each value. A slicer never narrows
itself. The page opens on the newest month. Tick **Data view** for the pivot tables. Click any bar to list that
caller's leads underneath, with their Zip Intent and the justification.

Colours are fixed per stage and per caller, decided once from the whole report —
so filtering the chart down never repaints the survivors. The palette is
validated for colour-vision deficiency in both themes, and every bar segment
carries its own number, so nothing rests on colour alone.

---

## Running the checks

```
python3 tests/mock_run.py      # all three reports and every panel, no network
python3 -m tests.test_routes   # every page and every API endpoint
python3 -m tests.serve_mock    # the console on :5299 with fake data, to click through
```

`mock_run.py` is the one worth keeping green: it pushes a synthetic snapshot
and synthetic sheets through the whole pipeline and asserts the things that fail
quietly — that the Zip columns arrive filled, that the breach labels match the
dashboards' spellings, that unmatched leads reach the update CSV under the right
key, and that no `NaN` reaches a sheet.
