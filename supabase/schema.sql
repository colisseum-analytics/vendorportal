-- ============================================================
-- Neighborhood Directory — Supabase schema
-- Run this once in your project's SQL Editor (Supabase Dashboard
-- → SQL Editor → New query → paste all of this → Run).
-- Safe to re-run on a fresh project; will error if objects already
-- exist, which just means it already ran.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table neighborhoods (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  categories jsonb not null default '["Food & Drink","Home & Repair","Health & Wellness","Shops & Services","Kids & Pets","Professional"]'::jsonb,
  created_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  name text not null,
  category text not null,
  status text not null default 'Open',
  description text,
  address text,
  phone text,
  website text,
  created_at timestamptz not null default now()
);

create table neighborhood_admins (
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (neighborhood_id, user_id)
);

-- Email-based invites: an admin can invite someone who doesn't have
-- an account yet. When that email signs up, a trigger promotes them.
create table admin_invites (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create index vendors_neighborhood_idx on vendors(neighborhood_id);
create index admin_invites_email_idx on admin_invites(lower(email));

-- ---------- row level security ----------

alter table neighborhoods enable row level security;
alter table vendors enable row level security;
alter table neighborhood_admins enable row level security;
alter table admin_invites enable row level security;

-- Neighborhoods: anyone can browse the directory list; only that
-- neighborhood's admins can edit its name/tagline/categories.
create policy "neighborhoods_public_read"
  on neighborhoods for select
  using (true);

create policy "neighborhoods_admin_update"
  on neighborhoods for update
  using (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = neighborhoods.id and na.user_id = auth.uid()
  ));

-- Vendors: public read for everyone (including signed-out visitors);
-- writes restricted to admins of that specific neighborhood.
create policy "vendors_public_read"
  on vendors for select
  using (true);

create policy "vendors_admin_insert"
  on vendors for insert
  with check (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = vendors.neighborhood_id and na.user_id = auth.uid()
  ));

create policy "vendors_admin_update"
  on vendors for update
  using (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = vendors.neighborhood_id and na.user_id = auth.uid()
  ));

create policy "vendors_admin_delete"
  on vendors for delete
  using (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = vendors.neighborhood_id and na.user_id = auth.uid()
  ));

-- neighborhood_admins: a user can see their own membership rows, and
-- admins of a neighborhood can see their fellow admins for that
-- neighborhood (so the dashboard can list "who else can edit this").
create policy "admins_read"
  on neighborhood_admins for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from neighborhood_admins na2
      where na2.neighborhood_id = neighborhood_admins.neighborhood_id
        and na2.user_id = auth.uid()
    )
  );

-- admin_invites: only admins of a neighborhood can create or view its
-- pending invites.
create policy "invites_admin_insert"
  on admin_invites for insert
  with check (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = admin_invites.neighborhood_id and na.user_id = auth.uid()
  ));

create policy "invites_admin_read"
  on admin_invites for select
  using (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = admin_invites.neighborhood_id and na.user_id = auth.uid()
  ));

create policy "invites_admin_delete"
  on admin_invites for delete
  using (exists (
    select 1 from neighborhood_admins na
    where na.neighborhood_id = admin_invites.neighborhood_id and na.user_id = auth.uid()
  ));

-- ---------- functions ----------

-- Atomically create a neighborhood and make the calling (logged-in)
-- user its first admin. Runs as SECURITY DEFINER so it can bypass
-- the "only admins can insert into neighborhood_admins" restriction
-- for this one bootstrapping step.
create or replace function create_neighborhood(
  p_name text,
  p_slug text,
  p_tagline text,
  p_categories jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start a neighborhood directory.';
  end if;

  insert into neighborhoods (name, slug, tagline, categories)
  values (p_name, p_slug, p_tagline, coalesce(p_categories, '[]'::jsonb))
  returning id into new_id;

  insert into neighborhood_admins (neighborhood_id, user_id)
  values (new_id, auth.uid());

  return new_id;
end;
$$;

-- When a new user finishes signing up, check whether their email was
-- invited as an admin anywhere, and if so, promote them automatically.
create or replace function handle_new_user_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into neighborhood_admins (neighborhood_id, user_id)
  select ai.neighborhood_id, new.id
  from admin_invites ai
  where lower(ai.email) = lower(new.email)
  on conflict do nothing;

  delete from admin_invites where lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user_invites();

-- Looks up a user's id by email so the invite-admin Edge Function can
-- tell whether someone already has an account. Only the service role
-- (used server-side by the Edge Function, never shipped to the
-- browser) can call this — it's revoked from everyone else so it
-- can't be used to check who has an account here.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
