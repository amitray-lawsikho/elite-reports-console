# Elite Reports Console (online)

The Reports Console (three lead reports — Chat/Email/Referral, Incoming, High Priority — their Analysis dashboards and the
MCube / Acefone dialer files for flagged leads) hosted like the Leads Console (Amit, 20 Nov 2026). The Sales IQ Chats tab was
dropped: Chat & Email Analysis covers it. The original Python app is kept in `tests/reference` (minus Sales IQ) as the rules.

## How it runs
- Cloudflare Worker `elite-reports-console` (`wrangler.jsonc`, https://elite-reports-console.amitray.workers.dev): static pages
  from `web/` + `POST /x/op` (`src/worker.js`). Deploys on push to main (Cloudflare Workers Builds). Secret: SUPABASE_SERVICE_KEY
  (Calling Analytics project). `keep_vars` stays on.
- Everything else runs in the browser: `src/client/*` ports the Python services (`lsq_fetch`, `ozonetel`, `reports/*`, `breach`,
  `dialers`, `analysis`, `sheets`, `roster`); `routes.js` answers the old Flask `/api/...` routes so the original pages
  (`ui/templates`, `ui/static/js/common.js`, `charts.js`) run unchanged. `tools/render_pages.py` renders them into `web/`.
- Sign-in only through the Sales Intelligence Portal (`go.html?d=reports`; no sign-in page of its own). Access list `erc_users`
  (Calling project) is filled only by the portal (`portal.access`, dashboard `reports`); admins there are console admins.
- Supabase "Calling Analytics" (`ybkldfcilvibryoxcuvq`): `erc_users`, `erc_settings` (shared: LSQ host, every sheet and push
  link), `erc_user_settings` (each person's own keys and preferences). RLS on, no policies: Worker only.
- Fetches, built reports, dialer files and the Ozonetel day cache live only in the user's browser (IndexedDB, KEEP_HOURS);
  nothing with a phone number is stored online (Amit, 20 Nov 2026).
- Look: Crimson & graphite (Amit, 20 Nov 2026), set in `ui/static/css/erc.css` over the original `style.css`; Manrope / Inter.
- Ozonetel's CDR API wants a GET with a JSON body: the Worker writes that request by hand over a TLS socket (`getWithBody`).
- Free plans only: no server, no scheduled jobs, no GitHub Actions minutes.

## Rules
- Keys are per person (LeadSquared, Ozonetel, MCube, Acefone; Amit, 20 Nov 2026): every call uses the signed-in person's own,
  never shown to anyone (masked even to them). A key the person already saved in the Leads Console is used until they save one
  here — only their own. Sheet / push links are shared and only console admins change them.
- The Worker runs named operations only; sheets are read / pushed by setting name, never a URL from the browser; Ozonetel's
  address must be an ozonetel.com one.
- Dial priority scales (Amit, 28 Nov 2026, the diallers changed): MCube 2–40, 2 dials first (was 1–40; every value +1, 40 still
  last); Acefone 1–29, 29 dials first (was 1–30; every value −1). Defaults MCube 2 / Acefone 29; overrides validated to those ranges.
  The Acefone file column keeps its name "Priority(1 to 30)". Tests shift the Python reference's priorities by the same amounts.
- Logic changes: keep parity with `tests/reference` (the original Python) unless Amit approves a change; refresh the recording
  with `python3 tests/reference_run.py` and add a test with each change.
- Known differences from the Python, on purpose: date-only LeadSquared follow-ups are not shifted by 5:30 (the Leads Console fix);
  sheet values keep their text (pandas turned some numbers into "12.0"); rows tied on a date keep a fixed order.
- Run `npm run build` and `npm test` before every push; `node tools/ui_smoke.mjs` for UI changes. Commit the built `web/`.
