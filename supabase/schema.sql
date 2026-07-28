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
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Platform admins oversee every neighborhood (rename/deactivate/delete,
-- not day-to-day vendor management). There's no self-serve signup path
-- for this role — see README for how to grant it.
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  name text not null,
  category text not null,
  specialty text,
  is_resident boolean not null default false,
  status text not null default 'Active',
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

-- Anyone browsing the public directory can send a note to that
-- neighborhood's admins — a vendor suggestion, an update, a concern.
-- No login required, so name/email are optional (email only if they
-- want a reply). Optionally tied to a specific vendor.
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  name text,
  email text,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- A request to start a new neighborhood directory, submitted without an
-- account. A platform admin reviews it; approving creates the real
-- neighborhood and an admin_invites row for the requester's email, so
-- the moment they sign up with that email the existing invite-promotion
-- trigger makes them its first admin.
create table neighborhood_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  tagline text,
  categories jsonb not null default '[]'::jsonb,
  contact_name text,
  contact_email text not null,
  status text not null default 'pending',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index vendors_neighborhood_idx on vendors(neighborhood_id);
create index admin_invites_email_idx on admin_invites(lower(email));
create index contact_messages_neighborhood_idx on contact_messages(neighborhood_id);
create index neighborhood_requests_status_idx on neighborhood_requests(status);

-- ---------- row level security ----------

alter table neighborhoods enable row level security;
alter table vendors enable row level security;
alter table neighborhood_admins enable row level security;
alter table admin_invites enable row level security;
alter table platform_admins enable row level security;
alter table neighborhood_requests enable row level security;

-- Checks whether the calling user is an admin of the given neighborhood.
-- SECURITY DEFINER so this bypasses RLS on neighborhood_admins internally —
-- policies call this instead of querying neighborhood_admins directly from
-- within a policy on (or referencing) that same table, which Postgres
-- can't evaluate ("infinite recursion detected in policy").
create or replace function public.is_neighborhood_admin(p_neighborhood_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from neighborhood_admins
    where neighborhood_id = p_neighborhood_id and user_id = auth.uid()
  );
$$;

-- Checks whether the calling user is a platform admin (oversees every
-- neighborhood). SECURITY DEFINER for the same reason as above — this
-- table's own "read your admin rows" policy would otherwise recurse.
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

-- Neighborhoods: anyone can browse active neighborhoods; a neighborhood's
-- own admins and platform admins can also see it while inactive (so they
-- can review or reactivate it). Only admins (of that neighborhood) or a
-- platform admin can edit it; only a platform admin can delete one outright.
create policy "neighborhoods_public_read"
  on neighborhoods for select
  using (
    active
    or is_neighborhood_admin(neighborhoods.id)
    or is_platform_admin()
  );

create policy "neighborhoods_admin_update"
  on neighborhoods for update
  using (is_neighborhood_admin(neighborhoods.id) or is_platform_admin());

create policy "neighborhoods_platform_delete"
  on neighborhoods for delete
  using (is_platform_admin());

-- Vendors: public read for everyone (including signed-out visitors);
-- writes restricted to admins of that specific neighborhood.
create policy "vendors_public_read"
  on vendors for select
  using (true);

create policy "vendors_admin_insert"
  on vendors for insert
  with check (is_neighborhood_admin(vendors.neighborhood_id));

create policy "vendors_admin_update"
  on vendors for update
  using (is_neighborhood_admin(vendors.neighborhood_id));

create policy "vendors_admin_delete"
  on vendors for delete
  using (is_neighborhood_admin(vendors.neighborhood_id));

-- neighborhood_admins: a user can see their own membership rows, and
-- admins of a neighborhood can see their fellow admins for that
-- neighborhood (so the dashboard can list "who else can edit this").
create policy "admins_read"
  on neighborhood_admins for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_admins.neighborhood_id)
  );

-- admin_invites: only admins of a neighborhood can create or view its
-- pending invites.
create policy "invites_admin_insert"
  on admin_invites for insert
  with check (is_neighborhood_admin(admin_invites.neighborhood_id));

create policy "invites_admin_read"
  on admin_invites for select
  using (is_neighborhood_admin(admin_invites.neighborhood_id));

create policy "invites_admin_delete"
  on admin_invites for delete
  using (is_neighborhood_admin(admin_invites.neighborhood_id));

-- platform_admins: only visible to other platform admins (so the
-- platform dashboard can list "who else has this role").
create policy "platform_admins_read"
  on platform_admins for select
  using (is_platform_admin());

-- contact_messages: anyone (including signed-out visitors) can send one;
-- only that neighborhood's admins can read, resolve, or delete them.
create policy "contact_messages_public_insert"
  on contact_messages for insert
  with check (true);

create policy "contact_messages_admin_read"
  on contact_messages for select
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

create policy "contact_messages_admin_update"
  on contact_messages for update
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

create policy "contact_messages_admin_delete"
  on contact_messages for delete
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

-- neighborhood_requests: anyone can submit one; only platform admins can
-- see or manage the queue.
create policy "requests_public_insert"
  on neighborhood_requests for insert
  with check (status = 'pending');

create policy "requests_platform_read"
  on neighborhood_requests for select
  using (is_platform_admin());

create policy "requests_platform_update"
  on neighborhood_requests for update
  using (is_platform_admin());

create policy "requests_platform_delete"
  on neighborhood_requests for delete
  using (is_platform_admin());

-- ---------- grants ----------
-- RLS policies only restrict access a role already has at the table
-- level — without these grants, Postgres denies access before policies
-- are even consulted (PostgREST returns "permission denied").

grant usage on schema public to anon, authenticated;

grant select on neighborhoods, vendors to anon, authenticated;
grant update, delete on neighborhoods to authenticated;
grant insert, update, delete on vendors to authenticated;
grant select on neighborhood_admins to authenticated;
grant select, insert, delete on admin_invites to authenticated;
grant select on platform_admins to authenticated;
grant insert on contact_messages to anon, authenticated;
grant select, update, delete on contact_messages to authenticated;
grant insert on neighborhood_requests to anon, authenticated;
grant select, update, delete on neighborhood_requests to authenticated;

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

-- Keeps neighborhoods.updated_at current on every edit (name, tagline,
-- categories, logo, active/inactive) — powers "last updated" in the
-- platform admin view.
create or replace function public.touch_neighborhood_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_neighborhood_updated on neighborhoods;
create trigger on_neighborhood_updated
  before update on neighborhoods
  for each row execute function touch_neighborhood_updated_at();

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

-- Grants the platform admin role to an existing account by email. Only
-- callable by an existing platform admin — see README for how to bootstrap
-- the very first one (there's no self-serve signup path for this role).
create or replace function public.add_platform_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can add another platform admin.';
  end if;

  select id into target_id from auth.users where lower(email) = lower(p_email);
  if target_id is null then
    raise exception 'No account found for that email — they need to create one first.';
  end if;

  insert into platform_admins (user_id) values (target_id) on conflict do nothing;
end;
$$;

create or replace function public.remove_platform_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can remove another platform admin.';
  end if;
  delete from platform_admins where user_id = p_user_id;
end;
$$;

-- Approves a pending directory request: creates the real neighborhood
-- and invites the requester's email as its first admin (via the existing
-- admin_invites mechanism — they're promoted the moment they sign up
-- with that address). Only callable by a platform admin.
create or replace function public.approve_neighborhood_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req neighborhood_requests%rowtype;
  new_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can approve a directory request.';
  end if;

  select * into req from neighborhood_requests where id = p_request_id and status = 'pending';
  if req.id is null then
    raise exception 'That request was not found, or has already been reviewed.';
  end if;

  insert into neighborhoods (name, slug, tagline, categories)
  values (req.name, req.slug, req.tagline, coalesce(req.categories, '[]'::jsonb))
  returning id into new_id;

  insert into admin_invites (neighborhood_id, email)
  values (new_id, req.contact_email);

  update neighborhood_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return new_id;
end;
$$;

create or replace function public.reject_neighborhood_request(p_request_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can reject a directory request.';
  end if;

  update neighborhood_requests
  set status = 'rejected', review_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
end;
$$;

-- ---------- user management ----------

-- Every registered account, with roles and which neighborhoods they
-- admin. Reads auth.users directly (the same trick get_user_id_by_email
-- above already relies on) so no service-role Edge Function is needed.
-- Platform-admin only.
create or replace function public.list_all_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_platform_admin boolean,
  admin_of jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    exists(select 1 from platform_admins pa where pa.user_id = u.id),
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug) order by n.name)
       from neighborhood_admins na
       join neighborhoods n on n.id = na.neighborhood_id
       where na.user_id = u.id),
      '[]'::jsonb
    )
  from auth.users u
  where is_platform_admin()
  order by u.created_at desc;
$$;

-- Permanently deletes an account (cascades to their neighborhood_admins,
-- platform_admins, and vendor edits stay but are unattributed — nothing
-- vendor-facing references a user directly). Platform-admin only; can't
-- delete yourself this way to avoid locking yourself out.
create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can delete an account.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t delete your own account from here.';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- The admins of one neighborhood, with email — callable by that
-- neighborhood's own admins (to manage their co-admins) or a platform admin.
create or replace function public.list_neighborhood_admins(p_neighborhood_id uuid)
returns table (user_id uuid, email text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email, na.created_at
  from neighborhood_admins na
  join auth.users u on u.id = na.user_id
  where na.neighborhood_id = p_neighborhood_id
    and (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin())
  order by na.created_at;
$$;

-- Revokes one admin's access to a neighborhood. Refuses to remove the
-- last remaining admin, so a neighborhood is never left with none.
create or replace function public.remove_neighborhood_admin(p_neighborhood_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
begin
  if not (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin()) then
    raise exception 'Only an admin of this neighborhood (or a platform admin) can do that.';
  end if;

  select count(*) into admin_count from neighborhood_admins where neighborhood_id = p_neighborhood_id;
  if admin_count <= 1 then
    raise exception 'This is the only admin left — invite another admin before removing this one.';
  end if;

  delete from neighborhood_admins where neighborhood_id = p_neighborhood_id and user_id = p_user_id;
end;
$$;

-- ---------- storage (neighborhood logos) ----------

insert into storage.buckets (id, name, public)
values ('neighborhood-logos', 'neighborhood-logos', true)
on conflict (id) do nothing;

create policy "logo_public_read"
  on storage.objects for select
  using (bucket_id = 'neighborhood-logos');

-- Logos are uploaded to "<neighborhood_id>/<filename>" — the folder name
-- is the neighborhood id, so only that neighborhood's admins (or a
-- platform admin) can write files under it.
create policy "logo_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

create policy "logo_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

create policy "logo_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );
