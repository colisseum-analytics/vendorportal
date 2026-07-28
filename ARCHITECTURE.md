# Architecture

A guide for anyone joining this project — how it's built, why it's built
that way, and where things live. Pairs with [README.md](README.md)
(setup/deploy instructions) and
[supabase/migrations/README.md](supabase/migrations/README.md) (schema
change workflow).

## Stack

- **Frontend**: React 18 + Vite, plain CSS (no framework), React Router
  for client-side routing.
- **Backend**: Supabase — Postgres (with Row Level Security as the real
  authorization layer, not just UI-level hiding), Auth (email/password,
  extensible to OAuth), Storage (neighborhood logos).
- **Hosting**: static build on Vercel, auto-deploys on push to `main`.
  No custom backend server — the browser talks to Supabase directly
  using the public anon key; RLS is what makes that safe.
- **No service-role / Edge Function dependency for anything currently
  shipped.** One Edge Function (`supabase/functions/invite-admin`)
  exists in the repo for emailing co-admin invites via Resend, but it
  has never been deployed — see "Known gaps" below. Everything else,
  including things that sound like they'd need elevated privileges
  (deleting a user, banning a user, editing someone's email), is done
  via `SECURITY DEFINER` Postgres functions instead (see "The
  SECURITY DEFINER pattern" below).

## Data model

```
neighborhoods
  id, slug, name, tagline, categories (jsonb array),
  logo_url, active, created_at, updated_at

vendors
  id, neighborhood_id -> neighborhoods,
  name, category, specialty, status ('Active'|'Inactive'),
  is_resident, description, address, phone, website, created_at

neighborhood_admins       (join table: who administers what)
  neighborhood_id -> neighborhoods, user_id -> auth.users

platform_admins           (site-wide role, separate from neighborhood_admins)
  user_id -> auth.users

admin_invites              (pending co-admin invites by email)
  neighborhood_id -> neighborhoods, email

neighborhood_requests       (pending "start a directory" requests)
  name, slug, tagline, categories, contact_name, contact_email,
  status ('pending'|'approved'|'rejected'), review_note,
  reviewed_at, reviewed_by -> auth.users

contact_messages            (public "contact admins" inbox, per neighborhood)
  neighborhood_id -> neighborhoods, vendor_id -> vendors (nullable),
  name, email, message, resolved
```

User accounts themselves are Supabase's built-in `auth.users` — there's
no app-level `users` table. Anything about a user (their roles, which
neighborhoods they admin) is derived by joining against
`neighborhood_admins` / `platform_admins`, or read from `auth.users`
directly inside `SECURITY DEFINER` functions (see below).

## Role model

Three levels, enforced in the database via RLS, not just hidden in the UI:

1. **Public** (including signed-out visitors) — read active neighborhoods
   and their vendors; submit a directory request; submit a contact
   message.
2. **Neighborhood admin** — membership row in `neighborhood_admins`.
   Can manage vendors, settings, logo, and co-admins for *that*
   neighborhood only. Becoming one happens two ways, both via the same
   mechanism (see "The invite/promotion trigger" below): an existing
   admin invites an email, or a platform admin approves a directory
   request.
3. **Platform admin** — row in `platform_admins`. Site-wide: approve/
   reject directory requests, activate/deactivate/rename/delete any
   neighborhood, manage every user account (see `PlatformAdmin.jsx`).
   **No self-serve signup path on purpose** — bootstrap the first one
   by hand:
   ```sql
   insert into platform_admins (user_id)
   select id from auth.users where email = 'their-email@example.com';
   ```

### The SECURITY DEFINER pattern

Two recurring problems, one recurring solution:

**Problem 1 — RLS self-reference.** A policy on `neighborhood_admins`
that checks "is the caller an admin of this neighborhood" by querying
`neighborhood_admins` from *within* a policy on `neighborhood_admins`
causes Postgres to error with `infinite recursion detected in policy`
(this actually happened — see
`supabase/migrations/20260714183000_fix_admin_recursion.sql`). Same
problem shows up for `platform_admins`.

**Problem 2 — no service role in the browser.** Things like deleting a
user's account, banning them, or reading `auth.users.email` for every
registered user look like they need Supabase's Admin API (which
requires the service-role key — never safe to ship to a browser). But
Postgres doesn't actually require that: a function owned by a
sufficiently-privileged role can read/write `auth.users` directly.

Both are solved the same way: a `language sql` or `language plpgsql`
function marked `security definer` runs with the *owner's* privileges
(bypassing RLS) rather than the caller's. Every one of these functions
starts by re-checking permission itself in code (`if not
is_platform_admin() then raise exception ...`), since bypassing RLS
means the database won't do that check for you anymore. Look at
`is_neighborhood_admin()`, `is_platform_admin()`, `list_all_users()`,
`delete_user_account()`, and `set_user_banned()` in the migrations for
the exact shape.

### The invite/promotion trigger

One mechanism handles both "an admin invites a co-admin by email" and
"a platform admin approves a directory request": both paths just insert
a row into `admin_invites` (neighborhood_id, email). A trigger on
`auth.users` (`handle_new_user_invites`, fired `after insert`) checks
on every signup whether the new email has a pending invite, and if so
inserts the corresponding `neighborhood_admins` row immediately —
no separate "accept invite" step for the user.

## Key flows

**Starting a new neighborhood** (`CreateNeighborhood.jsx` → `/new`):
submitted with no account (just name/slug/categories/contact email) as
a row in `neighborhood_requests`. A platform admin reviews it in
`PlatformAdmin.jsx`; approving calls `approve_neighborhood_request()`,
which creates the real `neighborhoods` row *and* an `admin_invites` row
for the contact email in one transaction. The requester signs up
separately whenever they're ready — the trigger above promotes them the
moment they do.

**CSV vendor import** (`ImportVendorsModal.jsx`, used from
`AdminDashboard.jsx`): client-side only — parses with
`src/utils/csv.js` (a small hand-rolled RFC4180 parser, no dependency),
validates each row against the neighborhood's category list and the
Active/Inactive status enum, previews errors before committing, then
bulk-inserts the valid rows. `src/utils/vendorCsvTemplate.js` generates
the downloadable template so the columns admins fill in always match
what the importer expects.

**Contact messages**: public form (`ContactAdminModal.jsx`) inserts
into `contact_messages` with no auth required (RLS allows anonymous
insert); only that neighborhood's admins or a platform admin can read/
resolve/delete. `AdminDashboard.jsx` shows a per-neighborhood inbox,
`PlatformAdmin.jsx` shows every neighborhood's messages in one place.

**Password reset**: two paths, both built on Supabase's *built-in*
auth email (not the custom Resend setup — this works with zero extra
configuration). Self-service via `ForgotPassword.jsx` →
`supabase.auth.resetPasswordForEmail()` → emailed link → `ResetPassword.jsx`
picks up the recovery session and calls `supabase.auth.updateUser()`.
Admin-triggered: same `resetPasswordForEmail()` call, fired from
`PlatformAdmin.jsx`'s "Send password reset" button for any user.
Password complexity (10+ chars, upper/lower/number/special) is enforced
client-side in `src/utils/passwordPolicy.js`, shared by `Signup.jsx`
and `ResetPassword.jsx`.

**Account disable**: `set_user_banned()` writes
`auth.users.banned_until` directly. Supabase's own auth server checks
that column on every login attempt, so this takes effect immediately —
no Edge Function, no Admin API call.

## Frontend structure

```
src/
  pages/            One component per route (see App.jsx for the list).
                     PlatformAdmin.jsx and AdminDashboard.jsx are the
                     two big ones — most feature surface area lives there.
  components/       Shared UI: VendorCard (grid+list rendering, the
                     copy-to-share button), VendorFormModal, 
                     ImportVendorsModal, ContactAdminModal, ThemeToggle,
                     ViewToggle.
  context/           AuthContext (session/user), ThemeContext (light/
                     dark + system preference, persisted to localStorage).
  hooks/              useNeighborhoodAccess (loads a neighborhood by slug
                     + checks caller's admin status — shared by every
                     admin-only page), useVendorView (grid/list
                     preference, persisted).
  utils/              csv.js, vendorCsvTemplate.js, categoryColor.js
                     (deterministic color per category, used for the
                     dot on vendor cards and filter chips), 
                     passwordPolicy.js, relativeTime.js.
  supabaseClient.js   Single supabase-js client instance, reads
                     VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
```

No global state library — auth and theme are the only cross-cutting
concerns, both handled with plain React context. Everything else is
fetched per-page with `supabase-js` directly in `useEffect`.

### List view vs grid view

Worth knowing if you touch `VendorCard.jsx` or the `.list-view` CSS:
list view lays out each card as its own CSS Grid (not flexbox) with
every field pinned to an explicit `grid-column` *and* `grid-row: 1`.
Both are necessary — with only `grid-column` set, Postgres... er,
*CSS Grid's* sparse auto-placement cursor advances monotonically
through columns in DOM order and won't backfill an earlier column once
passed, which silently split fields across two implicit rows depending
on DOM order. If you add a new field to the row, give it an explicit
`grid-column` *and* `grid-row: 1`, not just the column.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

The dev server and the deployed Vercel site point at the **same**
Supabase project unless you deliberately create a second one — there is
no separate "local" database. Schema changes need to be applied to that
one shared project regardless of whether you've deployed the frontend
change yet (see `supabase/migrations/README.md`).

## Deployment

Push to `main` → Vercel rebuilds and redeploys automatically (see
[README.md](README.md) for the one-time Vercel/env-var setup).
`vercel.json` has a catch-all rewrite to `index.html` — without it,
direct navigation to any client-side route (`/login`, `/n/:slug`, etc.)
404s, since Vercel doesn't know those paths exist server-side. If you
ever see 404s on deep links after a fresh Vercel project setup, check
that file is still there.

Database changes are **not** part of the Vercel deploy — they're a
separate manual (or `supabase db push`) step against the shared
Supabase project. See `supabase/migrations/README.md`.

## Known gaps

- **`supabase/functions/invite-admin` has never been deployed.**
  Inviting a co-admin by email currently records the invite (so
  promotion-on-signup still works) but doesn't send an email — the
  admin has to tell the invitee some other way. Deploying it requires
  the Supabase CLI, a Resend account, and a few `supabase secrets set`
  calls — see the README's "How admins invite co-admins" section.
- **No automated tests.** Verification this whole build has relied on
  has been manual (browser automation + hand-testing against the live
  Supabase project). Worth prioritizing before the codebase grows much
  further past its current size.
- **OAuth (Google/Apple/Microsoft) login is wired up but empty.** The
  `OAUTH_PROVIDERS` array in `Login.jsx`/`Signup.jsx` is intentionally
  `[]` — see the README for how to turn a provider on.
