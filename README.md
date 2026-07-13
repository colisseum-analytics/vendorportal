# Neighborhood Directory

A multi-neighborhood vendor directory. Anyone can browse; each neighborhood
has its own admins who can add, edit, and remove vendors. New neighborhoods
can sign up and start their own directory at any time — no code changes or
file uploads needed.

- **Public**: browse, search, and filter vendors — no login required.
- **Admins**: email/password login (Google/Apple/Microsoft can be turned on
  later with no code changes) to manage vendors and invite co-admins.
- **Hosting**: everything ships from a GitHub repo. Once it's connected to
  Vercel, every `git push` deploys automatically — you never touch a
  hosting file manager again.

## One-time setup (about 20 minutes)

### 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com), sign up free, and create a
   new project. No credit card required.
2. In the project, open **SQL Editor → New query**, paste the entire
   contents of `supabase/schema.sql`, and run it. This creates the tables,
   security rules, and helper functions.
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

### 4. Try it

Visit your Vercel URL, click **Start a directory**, create an account,
name your neighborhood, and you're the first admin. Add a vendor and try
**Settings** to confirm everything's wired up. Set up the invite email
flow (below) whenever you're ready to bring in co-admins.

## How other neighborhoods join later

No action needed from you. Anyone can visit the homepage, click **Start a
directory**, sign up, and name their own neighborhood — they become its
first admin automatically. Each neighborhood's vendors, categories, and
admins are completely separate (enforced at the database level, not just
in the app), so neighborhoods never see or affect each other's data.

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

## A few things worth knowing

- **The admin password model is real, not a stand-in.** Unlike a
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
