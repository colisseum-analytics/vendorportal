# Migrations

Each file here is one incremental change, in the order it was actually
applied to the database — this is the versioned history that
`supabase/schema.sql` (a single consolidated "run this once on a brand
new project" script) doesn't give you on its own.

## Applying these

**Fresh Supabase project:** either paste the full `supabase/schema.sql`
into the SQL Editor once, *or* run every file in this folder in order
(same end result — `schema.sql` is just a squashed snapshot of them).

**Existing project, catching up:** run whichever files come after the
last one you know was applied. If you're not sure what's already been
applied, open Supabase's SQL Editor and check for the objects a given
migration creates (e.g. `select * from platform_admins limit 1;` — if
that doesn't error, `20260714190000_platform_admin_and_neighborhood_fields.sql`
is already in).

**With the Supabase CLI**, once the project is linked
(`supabase link --project-ref YOUR-PROJECT-REF`), `supabase db push`
applies whatever hasn't been applied yet and tracks it for you — no
manual bookkeeping. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for
the full local-dev / linking setup.

## Adding a new migration

1. `supabase migration new <short_description>` (or just create a new
   `supabase/migrations/<timestamp>_<description>.sql` by hand if you
   don't have the CLI set up yet).
2. Write the SQL. Prefer `create table if not exists`,
   `add column if not exists`, and `create or replace function` so a
   migration is safe to re-run if it partially failed partway through.
3. Also update `supabase/schema.sql` to match, so a fresh install in
   one paste stays accurate — it should always equal "every migration
   file run in order."
4. Run it against your project (via `supabase db push`, or by hand in
   the SQL Editor) and confirm it worked before committing.

## Bootstrapping the first platform admin

There's no self-serve signup path for the platform-admin role (by
design — see ARCHITECTURE.md). After someone has a regular account,
grant it directly:

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'their-email@example.com';
```
