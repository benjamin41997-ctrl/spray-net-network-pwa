# Contact suggestions

The preferred shared workflow is now [Team sync](team-sync.md). After Supabase setup, signed-in members save suggestions directly to the shared review queue. Formspree is not required. The instructions below describe the retained device-only handoff and optional legacy form connector.

## Available now

Share the app's `#suggest` URL with family and team. A business or person name is required; other information is optional. Saving creates a dated private record on that contributor's browser. Download the suggestion and send its JSON file to Ben through a private channel. Ben imports it under **Review tools → Import suggestions**. This is a working manual handoff, not central collection.

Review entries over time, check potential duplicates, research official sources, and write findings/source links. Mark **Ready for directory review** when evidence is adequate. Add the researched business through the existing CRM/public export process; then mark **Added to network** and link its published business ID. Status changes themselves never create public companies. Suggestions can contain unverified/private details and must never be copied wholesale into public site data or GitHub issues.

Download backups periodically. Local records use IndexedDB `spray-net-contact-suggestions`, separate from outreach, mailing and social records. They are available to anyone using that browser profile and are not protected by an app login. Imports add new IDs only; existing records/research win. Downloaded files include review notes. The contributor-supplied name is not authenticated.

## Shared inbox setup still required

The app includes an optional Formspree transport. There is no configured account or destination yet, and the deployed endpoint stays blank until the owner supplies one.

1. Create a form in your own [Formspree account](https://formspree.io/register), named **Partner Network Suggestions**. Choose the email inbox that should receive it and complete any verification the service requires.
2. Give Codex the public form endpoint `https://formspree.io/f/…`. No account password or private API token is needed. Set it in `site/data/suggestions-config.json`, preserving version 1, then build/test/publish. The build accepts only this service's exact HTTPS submission URL pattern.
3. Run a real submission from the published site and verify the same `suggestion_id` in the owner's Formspree inbox/email. Browser tests mock the service; they do not establish that the live destination or its spam controls work. If the service requests additional verification, complete that setup before relying on collection. Do not disable spam protections merely to force a test through.
4. In each notification, the `suggestion` field contains a portable JSON package. Copy that complete field into **Review tools → Or paste a suggestion package** and import. Alternatively, contributors can still send their downloaded files. Formspree's optional JSON exports are also supported. This transfer to the local review queue is manual; the app never embeds an inbox-read credential or exposes other people's suggestions to public visitors.

The connector sends only contributor fields and the stable ID; it excludes internal review notes, completion status and directory links. A saved copy exists before sending. Only an explicit successful acknowledgment marks **Accepted by the form service**. Failures, timeouts and closed tabs leave delivery unconfirmed. Retrying requires a click/confirmation and retains the same ID so repeated copies can be recognized. No background delivery/retry runs. Acceptance is not proof of email delivery or human review.

As checked September 28, 2026, the [free plan](https://formspree.io/plans/) lists **50 submissions per month and a 30-day submission archive**. It is not a permanent research archive. Retain notification emails and import/export backups for long-term history. [Bulk CSV/JSON export](https://help.formspree.io/articles/form-and-project-settings/exporting-submissions) requires a paid plan; the copy/paste and contributor-file workflows do not depend on bulk export. Live inbox API access is not part of this release.

## Verification

`tests/suggestions.spec.js` checks validation, atomic import rejection, duplicate-ID preservation, offline persistence, completion links, navigation/draft protection, storage failures and mocked provider acknowledgment/failure. Mobile/desktop/tablet projects exercise the primary handoff/review paths. No real contact or notification is submitted by the tests.
