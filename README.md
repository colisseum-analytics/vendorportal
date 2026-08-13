# Neighborhood Directory

A multi-neighborhood vendor directory. Anyone can browse; each neighborhood
has its own admins who can add, edit, and remove vendors. New neighborhoods
can request a directory at any time — no code changes or file uploads
needed, just a quick review by a platform admin.

**New to this codebase?** See [ARCHITECTURE.md](ARCHITECTURE.md) for the
data model, permission model, and how the pieces fit together — this file
is just setup/deploy steps.

- **Public**: browse, search, and filter vendors — no login required.
- **Neighborhood admins**: email OTP (6-digit code) login (Google/Apple/Microsoft
  can be turned on later with no code changes) to manage vendors, settings, and
  co-admins for their own neighborhood.
- **Platform admins**: oversee every neighborhood — approve/reject new
  directory requests, activate/deactivate/delete neighborhoods, manage user
  accounts. See "The platform admin role" below.
- **Hosting**: everything ships from a GitHub repo. Once it's connected to
  Vercel, every `git push` deploys automatically — you never touch a
  hosting file manager again.

## One-time setup (about 20 minutes)

### 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com), sign up free, and create a
   new project. No credit card required.
2. In the project, open **SQL Editor → New query**, paste the entire
   contents of `supabase/schema.sql`, and run it. This creates the tables,
   security rules, and helper functions. (This is a snapshot of every file
   in `supabase/migrations/` run in order — see
   [supabase/migrations/README.md](supabase/migrations/README.md) if
   you're catching up an existing project instead of starting fresh, or
   want to use the Supabase CLI's migration workflow going forward.)
3. Go to **Settings → API** and copy your **Project URL** and **anon
   public** key — you'll need both next.
4. Optional but recommended for a real launch: **Authentication → Settings**
   → decide whether to require email confirmation (on by default) and set
   your **Site URL** once you have a deployed domain, so confirmation
   emails link back to the right place.

### 2. Put the code on GitHub

1. Create a new (empty) repository on GitHub.
2. Push this project to it:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

### 3. Deploy (Vercel)

1. Go to [vercel.com](https://vercel.com), sign up free with your GitHub
   account.
2. **Add New Project → Import** your repository. Vercel auto-detects Vite;
   leave the build settings as-is.
3. Before deploying, add two **Environment Variables**:
   - `VITE_SUPABASE_URL` — from step 1.3
   - `VITE_SUPABASE_ANON_KEY` — from step 1.3
4. Click **Deploy**. You'll get a live URL in about a minute.

From here on, any time you (or a contributor) push a commit to `main`,
Vercel rebuilds and redeploys automatically. There is no manual file
upload step, ever again.

### 4. Make yourself the first platform admin

Starting a directory now goes through a review step (see below), so you
need at least one platform admin before anyone — including you — can get
approved. Sign up for a regular account on your deployed site first, then
in the Supabase SQL Editor:

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```

### 5. Try it

Visit your Vercel URL, click **Start a directory**, and submit the form
(no account needed for this part). Log in as your platform admin at
`/platform-admin`, approve the request you just submitted, then sign up
with the contact email you used — that account becomes the neighborhood's
first admin automatically. Add a vendor and try **Settings** to confirm
everything's wired up. Set up the invite email flow (below) whenever
you're ready to bring in co-admins.

## How other neighborhoods join later

Anyone can visit the homepage, click **Start a directory**, and submit
the request form — no account needed. A platform admin reviews it at
`/platform-admin`; approving it creates the neighborhood and lets the
requester sign up (with the email they gave) to become its first admin
automatically. Each neighborhood's vendors, categories, and admins are
completely separate (enforced at the database level, not just in the
app), so neighborhoods never see or affect each other's data.

## The platform admin role

Platform admins oversee the whole platform, not any one neighborhood:
reviewing directory requests, activating/deactivating/renaming/deleting
any neighborhood, and managing every user account (sending sign-in codes,
disabling accounts, editing emails). There's intentionally no self-serve
way to become one — grant it to an existing account by email:

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'their-email@example.com';
```

Once you have one platform admin, they can grant the role to others
directly from `/platform-admin` (no SQL needed after the first one).

## How admins invite co-admins

From the admin dashboard, an existing admin enters a neighbor's email
under **Invite a co-admin**, which sends a real email.

- If that person already has an account, they're promoted to admin
  immediately and emailed a link straight to the dashboard.
- If not, they're emailed a link to create an account — the moment they
  sign up with that exact email address, they're automatically promoted
  (no approval step, nothing else for them to click).

This runs through a small server-side piece (a Supabase Edge Function)
because sending email and checking whether an account already exists both
need credentials that must never reach the browser. One-time setup:

1. Create a free account at [resend.com](https://resend.com) and grab an
   API key (**API Keys** in their dashboard). Their free tier is generous
   enough for a neighborhood directory's invite volume.
2. Install the Supabase CLI if you don't have it, then from this
   project's root:
   ```
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF   # find this in your Supabase project URL
   supabase functions deploy invite-admin
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set SITE_URL=https://your-deployed-site.vercel.app
   ```
   `SITE_URL` is what the invite email links back to — use your real
   Vercel URL (or custom domain) once you have one.
3. Optional: by default, invite emails are sent from
   `onboarding@resend.dev`, which works immediately but looks generic.
   To send from your own domain, verify it in Resend (**Domains**), then
   run `supabase secrets set EMAIL_FROM="Neighborhood Directory <admin@yourdomain.com>"`.

That's it — no code changes needed for either step. If you skip this
setup, invites still work (the person is still recorded and promoted on
signup) — they just won't get an email telling them, so you'd need to let
them know some other way in the meantime.

## Setting up "Import from document" (community info)

On the Community Info admin page, admins can upload a PDF, Word doc, or
text file (a welcome packet, HOA handbook, FAQ doc) and have it parsed
into HOA-contact/service/emergency/FAQ entries they review and edit before
anything's added — see `src/components/ImportInfoItemsModal.jsx`. This
also runs through a Supabase Edge Function, since calling an LLM needs an
API key that must never reach the browser:

1. Create an API key at [console.anthropic.com](https://console.anthropic.com).
2. From this project's root (after the `supabase login` / `supabase link`
   steps above):
   ```
   supabase functions deploy extract-info-items
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

If you skip this setup, the "Import from document" button still appears
but returns a clear error telling the admin it isn't configured yet —
adding items one at a time via **+ Add entry** always works regardless.
Scanned/image-only PDFs (no text layer) aren't supported.

## Adding Google / Apple / Microsoft login later

1. In the Supabase Dashboard, go to **Authentication → Providers**, and
   enable the provider(s) you want. Each one walks you through creating
   OAuth credentials with that provider (Google Cloud Console, Apple
   Developer, or Azure AD) and pasting them in.
2. In the code, open `src/pages/Login.jsx` and `src/pages/Signup.jsx` and
   add an entry to the `OAUTH_PROVIDERS` list at the top of each file,
   e.g. `{ id: 'google', label: 'Continue with Google' }`. The buttons and
   the sign-in logic are already built — this list is the only thing
   that's empty until you're ready.
3. Commit and push. That's the whole change.

## Local development

```
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Local dev and your deployed site point at the **same** Supabase project
by default — there's no separate local database. Schema changes need to
be applied to that one shared project regardless of whether you've
deployed the frontend change yet; see
[supabase/migrations/README.md](supabase/migrations/README.md).

## A few things worth knowing

- **The admin access model is real, not a stand-in.** Unlike a
  single-file prototype, admin access is enforced by the database itself
  (Postgres row-level security), not just by hiding buttons in the UI —
  so it holds up even if someone pokes at the API directly.
- **Supabase's free tier pauses a project after 7 days with no traffic.**
  Fine for an actively-used pilot; if it might sit quiet for a week, add a
  free scheduled ping (a GitHub Actions workflow hitting your Supabase URL
  on a cron is the common approach) so it never sleeps. Check
  [supabase.com/pricing](https://supabase.com/pricing) for current limits
  before you plan around specific numbers — they do change.
- **Vercel and Supabase's free tiers cost $0** and are both fine for
  several actively-used neighborhoods. If this grows a lot (many
  neighborhoods, heavy traffic), you'd eventually look at Supabase's Pro
  tier (~$25/mo) mainly for backups and to remove the pause — nothing
  about the app's code changes when you do.
- **Categories are per-neighborhood**, set when a neighborhood is created
  and editable any time by an admin from **Settings** on their admin
  dashboard (name, tagline, and categories — the web address/slug is
  intentionally not editable there, to avoid breaking links people
  already have to it).
- **"Disable account" (platform admin) is a real login ban**, not just a
  UI restriction — it writes directly to Supabase's own `auth.users`
  table, which the auth server checks on every login. See
  [ARCHITECTURE.md](ARCHITECTURE.md) for how that (and a few other things
  that look like they'd need a service-role key) work without one.
