# Elite Reports Console

The LawSikho / Skill Arbitrage Reports Console — the three lead reports, their dashboards and the dialer files — now a website
opened from the **Sales Intelligence Portal** instead of a program on one laptop. Same pages, same rules, same sheets.

**Site:** https://elite-reports-console.amitray.workers.dev (open it from the portal) · Designed and developed by Amit Ray (amitray@lawsikho.in)

## What it does

| Page | What happens there |
|---|---|
| **Reports** | 1 Fetch LeadSquared (your own keys) + the Ozonetel sales incoming calls since the Incoming master sheet's newest day · 2 Build Chat/Email/Referral, Incoming and High Priority · 3 Download the LeadSquared Report_Type update CSV · 4 Fetch and rebuild ("unmatched leads went 312 -> 7"). Then download (Excel / CSV), preview and push each report to its Google Sheet, and make MCube / Acefone files for Breached, Less-dialled DNP and Fresh leads and push them. |
| **Analysis** | One page per report: Fresh, Breached DNP, Breached, Leads given, Actual enrollments, slicers, data view and the Excel download. |
| **Setup and links** | Your own LeadSquared, Ozonetel, MCube and Acefone keys (only you; nobody else sees them). The shared sheet and push links (console admins change them). |
| **Settings** | Your own fetch defaults, breach rules, DNP rule, priorities, retries and batch sizes. |

Sales IQ Chats is not here: Chat & Email Analysis covers it.

## How it runs (free, nothing to install)

```
Browser (each user)                         Cloudflare Worker "elite-reports-console"      Supabase "Calling Analytics"
  pages + all the report logic   ──/x/op──▶  checks the sign-in and erc_users       ──▶  erc_users (filled by the portal),
  fetches, reports, dialer files            holds each person's keys, calls one          erc_settings (shared links),
  stay in this browser (12 h)               named LeadSquared / Ozonetel / MCube /       erc_user_settings (own keys, preferences)
                                            Acefone / sheet endpoint
```

- **Who can open it:** people given "Elite Reports Console" in the Sales Intelligence Portal → People and access.
- **Long jobs run in your tab** (fetch, Ozonetel's two requests a minute, pushes) — keep it open until the log says Done.
- **Nothing with a phone number is stored online:** the fetch, the reports and the Ozonetel cache live in your browser for 12 hours.

## Development

```
npm install            # esbuild + the libraries the tests use
npm run build          # renders ui/templates -> web/*.html and bundles src/client -> web/static/js/erc.js
npm test               # parity with the original Python (tests/reference, recording in tests/fixtures) + the Worker's rules
node tools/ui_smoke.mjs  # every page and flow in a real browser with a fake Worker
python3 tests/reference_run.py   # re-record the Python's answers after changing a rule in either
```
