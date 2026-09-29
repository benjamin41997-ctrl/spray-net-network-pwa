# Shared team workspace

GitHub Pages hosts the app; Supabase stores private team records. The public project URL and publishable key are in `site/team-config.js`. No database password, service-role key or management token belongs in this repository.

## Owner setup

1. In the project's **SQL Editor**, run [`supabase/team-sync.sql`](../supabase/team-sync.sql). It creates member-only tables, atomic save/read functions, revision checks, retry receipts and a private audit log. Replace `replace-with-your-login@example.com` with your chosen owner login before running. Initially only that verified email can be enrolled. Re-running the script preserves records and does not reactivate revoked members.
2. In **Authentication → URL Configuration**, set the Site URL to `https://benjamin41997-ctrl.github.io/spray-net-network-pwa/` and allow that exact redirect URL. Invite/recovery links must return there, not localhost. Do not use broad wildcard redirects.
3. Create your app login under **Authentication → Users** using your approved email. The dashboard's **Create user** option with a password and confirmed email can provision it without relying on email delivery. Set the password yourself; do not paste it into Codex. The Supabase dashboard login and the app login are separate accounts. If you use an invitation instead, open it, then use **Team sync → Set / change your account password**.
4. Open the app, choose **Team sign in**, and sign in. A successful first sync is required before editing shared records. Missing schema, nonmember access and network failures are shown rather than silently switching to local data.
5. On the original device/browser holding your follow records, sign in, open **Preview device-only records**, choose what to share, and upload. No manual file transfer is required. Existing team IDs win; original device-only records remain intact. All selected notes are shared with approved team members, so review the categories before confirming.

Supabase's default email sender is restricted to project-organization addresses and is not a production email delivery service. Configure your own SMTP before sending invitations/reset emails to family or content managers, or provision confirmed password accounts through the owner dashboard and provide credentials privately. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp). This app does not send invitations or create users itself.

## Adding / revoking teammates

The owner manages access in the dashboard; there is no self-service signup or membership editor in the app. Run this in SQL Editor with the actual person's email/name **before** creating their auth account:

```sql
insert into network_private.approved_emails(email,name)
values ('teammate@example.com','Teammate Name');
```

For an already-created verified auth account, enroll it explicitly:

```sql
insert into public.network_members(user_id,name)
select u.id,a.name from auth.users u
join network_private.approved_emails a on a.email=lower(u.email)
where a.email='teammate@example.com' and u.email_confirmed_at is not null
on conflict do nothing;
```

To revoke access, set that user's `network_members.active` to false and remove the email from `network_private.approved_emails`. Do not delete the auth user simply to revoke access; audit records reference its ID. All approved members currently have equal read/edit access to the single team workspace. These are app memberships, not invitations to administer the Supabase project.

Previously downloaded offline data cannot be remotely erased from someone's device. Online membership denial blocks subsequent app reads/writes. Use private browser profiles and trusted team devices. Signing out retains the isolated offline cache and unsent changes for that account but stops access through the app until sign-in. Browser storage is not encrypted by this app. Public GitHub Pages projects on the same origin are not isolated security boundaries.

## Behavior and limits

- Team mode syncs social progress, outreach activities/firsthand findings (including tombstones), suggested contacts/reviews, and mailing settings/history. Directory research remains a reviewed public publication process. A suggestion status never publishes a company.
- In team mode suggestions go directly to the shared queue after synchronization; Formspree is unnecessary. Device-only mode remains a separate local workspace and offers the original backup/handoff tools.
- Use the same social profile label for the actual social account used to follow. The label is not the person operating the app. Team data records the authenticated editor separately. A new device defaults to the latest saved social label when it has no preference.
- Edits first commit to a durable IndexedDB outbox, then sync immediately when online, on reconnect/foreground, and every 20 seconds while visible. Background/closed tabs are not guaranteed to run. “Saved on this device” is not “uploaded.” Team sync displays pending count, errors and last successful sync.
- A first online sync is required. Previously loaded records can be read and edited offline. Private data is stored only in account/project-scoped IndexedDB, never in the service-worker asset cache. All team data currently pulls as a snapshot; this is appropriate for the small team and is not a large-database incremental sync design.
- The server commits a pending batch atomically. Server revisions prevent silent stale overwrites; a mutation UUID makes retry after a lost response safe. Unconfirmed sends freeze further edits until resolved, avoiding accidental duplicate mutations.
- A conflicting batch is held intact. Download the recovery JSON, then explicitly keep server versions or replace with all pending local versions. This choice applies to the whole batch. Mailing settings are one record, so simultaneous mailing changes can conflict. Recovery JSON is a diagnostic backup; the app does not automatically restore it. Original per-feature backups remain supported.
- Server actor/time/revision stamps appear in Recent team saves. The full historical audit is in `network_private.audit`, readable only through project-owner database access. User IDs can be resolved in Authentication → Users. Current membership and audit retention are managed by the owner.
- Automatic sync does not itself provide a database backup or override Supabase plan quotas/inactivity pausing. Retain private exports and monitor project storage, including audit history.

## Validation

`node tests/team-sql.mjs` runs the actual SQL in an isolated PostgreSQL-compatible test database with simulated Supabase auth roles. It checks anonymous/nonmember denial, enrollment, revocation, actor stamping, atomic rollback and idempotent retries. Browser tests simulate two distinct accounts/devices, offline/reconnect, uncertain delivery, conflict resolution and explicit local-data migration. They never send real team data or messages.

Live activation still requires the owner-run SQL, a provisioned app login, and a successful signed-in save/read check from two devices. A publishable key cannot perform project administration. Do not claim live sync is verified until those checks have happened.
