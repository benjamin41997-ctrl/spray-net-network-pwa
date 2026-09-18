# Spray-Net Partner Network PWA

A mobile, tablet and desktop directory and private outreach tracker for Spray-Net South Charlotte. GitHub Pages serves the app and a reviewed directory snapshot; the desktop does not need to stay on. No hosted Python server, account, analytics, paid service or API key is required for browsing.

Repository: https://github.com/benjamin41997-ctrl/spray-net-network-pwa

App: https://benjamin41997-ctrl.github.io/spray-net-network-pwa/

## Use

Search companies, people, locations and services; filter by category, city, visit suitability and available contacts. Use **Drop-in stops** with a city when you have time between quotes. This shows reviewed public visitor locations; the shortcut clears Priority 30 while retaining the city and other filters. Priority 30 remains a separate referral list. Profiles include source dates, research gaps, vendor routing, and links for calling or emailing. The app never sends messages automatically.

Visit badges distinguish drop-in stops, call-first businesses, appointment-only offices, home-based businesses, no visitor office, closed locations and unverified records. A registration address or business category never implies visitor access. Reviewed profiles show visit restrictions, source links and the check date; only reviewed public visitor addresses get directions. Published hours are not an “open now” service and do not guarantee that a networking contact is available. Weekend appointment restrictions remain visible on drop-in cards. Unreviewed businesses are excluded from Drop-in stops.

Android: open the site in Chrome and choose Install app / Add to Home screen. iOS/iPadOS: Safari → Share → Add to Home Screen. Keep the app open online until it says **Ready offline**. External websites and communications still need connectivity. Use **Update now** when a new release is available; About also provides **Check for updates**.

## Publishing scope

This site and its JSON are publicly accessible, matching the portfolio's Pages setup. `noindex` discourages indexing and is not access control. Only public business directory fields are exported. Raw database files, private CRM notes, relationship history, credentials, residential/registration addresses and unresearched Google placeholders are excluded. Reviewed public visitor addresses are explicitly allowlisted in visit policies. The public priority list contains suggested partnership fit and vendor routing; unsent CRM messages remain local. No Google Places API content or key is distributed.

The company/contact IDs are stable and the snapshot has a schema version. Automatic cross-device sync is not configured. Private activity records live in IndexedDB under `spray-net-partner-outreach`, separate from the public directory and service-worker cache. The site has no API for uploading history and no analytics. Browser storage is not encrypted by this app and is accessible to anyone using the same browser profile. GitHub Pages projects under the same account share a web origin; this is browser-local privacy, not authenticated account isolation.

## Networking tracker

Use **Tracker** for all activity history, or **Networking history → Log completed activity** on a business profile. Record the recipient, completed date, channel, material/email subject, notes, outcome and optional follow-up. Types include visits, calls, sent emails, delivered one-pagers, direct mail, texts, social messages and events. One-pagers require a delivery method and material name; direct mail requires a material name. Opening `mailto:` or phone links never counts as sent/contacted, and CRM outreach drafts are not imported as completed activities.

Directory cards show the latest touch, number of completed activities and due follow-ups. Combine city/visit filters with **No activity logged**, **Follow-ups due**, **Contacted in last 30 days**, or **Not contacted in 30+ days**; **Oldest contact first** sorts unlogged businesses first, then older touches. No activity logged means no history on this browser, not proof you have never contacted the company. Activity history can be searched by business, recipient, material or notes and filtered by type. Repeating a material name for the same business raises a reminder, without preventing legitimate repeat deliveries.

Edit saved entries, complete/reopen follow-ups, or remove an entry. Removal preserves a tombstone with Undo and **Show removed entries → Restore**. Company/person names are snapshotted on entries so changes to the public directory do not erase the original record. Concurrent stale edits in different tabs are rejected rather than silently overwriting another change. The app requests persistent storage after saving where browsers support it; you must still keep backups.

**Export backup** downloads private JSON. Save it in your private OneDrive or another safe location. **Import tracker backup → Merge backup** restores or transfers history across devices, keeping new/newer versions by stable activity ID and retaining unrelated history. Export/import is manual, not automatic synchronization. Clock differences between devices affect which version is newest. **Export spreadsheet CSV** is for review and does not support re-import. Clearing browser/site data or uninstalling in some browsers can erase local activity. App deployments update public assets without clearing IndexedDB. The private desktop CRM activity table is not synchronized with this tracker.

Future OneDrive sync needs a registered Microsoft SPA application and authenticated access to a private app folder. No client secret belongs in a static PWA. This release does not advertise a working sign-in or sync button before that integration is configured and tested.

## Update research

The source of truth is the sibling `spray-net-networking` application. Run from that project:

```powershell
& .\.venv\Scripts\python.exe -m tools.export_pwa
```

The exporter allowlists public fields and requires matching public source evidence for contact details. Review the changed `site/data/directory.json`, then in this repository run:

Visit research is persisted in the CRM's `sources` table as dated `visit_policy` evidence, rather than overwriting office identity or inferring visitor access from addresses. Review a batch shaped like `exports/visit-policies-20260918.json` and import it with `python -m tools.import_visit_policies <batch>` before exporting. The importer validates company IDs/names, public fields and sources and makes a database backup. The newest accepted policy wins; repeated imports of an unchanged policy are skipped. The build independently validates visit metadata before publication.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
git add site/data/directory.json
git commit -m "Refresh published partner directory"
git push
```

Changes pushed to `main` are built, tested and deployed by `.github/workflows/deploy.yml`, using the same Pages Actions pattern as the portfolio. The offline cache version is computed from all site assets including the data, so data updates also produce a new installable release. No scheduled research or automatic pushes are configured.

## Local development

Node.js 24. `pnpm install --frozen-lockfile`, then `pnpm exec playwright install chromium webkit`, `pnpm build`, `pnpm test`. `pnpm preview` serves a production build on http://127.0.0.1:4174/spray-net-network-pwa/ . The repository-prefixed preview tests relative asset paths exactly as Pages uses them. Real device installation should also be checked on Android/iPad after deployment.

Branding assets and licensed Lato fonts are reused from the portfolio. The offline cache is isolated from the portfolio's cache. Test browsers cover Android Chromium, desktop Chromium and iPad WebKit; offline network simulation is verified in Chromium because WebKit emulation does not reliably model service-worker offline navigation.
