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
  city text,
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
  status text not null default 'Unknown',
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
  -- null when sent before a neighborhood exists (e.g. a "wrong state" inquiry
  -- from the Start a directory form) — platform admins can still read/resolve it.
  neighborhood_id uuid references neighborhoods(id) on delete cascade,
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
  city text,
  categories jsonb not null default '[]'::jsonb,
  contact_name text,
  contact_email text not null,
  status text not null default 'pending',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  -- Set once the requester confirms their contact email via a magic-link
  -- sign-in (see verify_my_pending_request()) — required before a
  -- platform admin can approve.
  email_verified boolean not null default false
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
  with check (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

create policy "vendors_admin_update"
  on vendors for update
  using (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

create policy "vendors_admin_delete"
  on vendors for delete
  using (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

-- neighborhood_admins: a user can see their own membership rows, and
-- admins of a neighborhood (or a platform admin) can see their fellow
-- admins for that neighborhood (so the dashboard can list "who else can
-- edit this").
create policy "admins_read"
  on neighborhood_admins for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_admins.neighborhood_id)
    or is_platform_admin()
  );

-- admin_invites: admins of a neighborhood, or a platform admin, can
-- create or view its pending invites.
create policy "invites_admin_insert"
  on admin_invites for insert
  with check (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

create policy "invites_admin_read"
  on admin_invites for select
  using (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

create policy "invites_admin_delete"
  on admin_invites for delete
  using (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

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

-- Called by the requester's own (now-authenticated, magic-link) session
-- to confirm their contact email. Doesn't trust a client-supplied
-- request id — verifies whichever pending request matches their
-- confirmed auth email.
create or replace function public.verify_my_pending_request()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text;
  req_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to verify a request.';
  end if;

  select email into my_email from auth.users where id = auth.uid();

  update neighborhood_requests
  set email_verified = true
  where lower(contact_email) = lower(my_email)
    and status = 'pending'
    and email_verified = false
  returning id into req_id;

  return req_id;
end;
$$;

-- Approves a pending directory request: creates the real neighborhood
-- and grants the requester's already-verified account admin rights
-- directly. Requires email_verified — the requester's account is created
-- (and their email confirmed) via a magic-link sign-in at request-submit
-- time, before an admin ever reviews it. Falls back to the admin_invites
-- mechanism if for some reason no matching account exists yet. Only
-- callable by a platform admin.
create or replace function public.approve_neighborhood_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req neighborhood_requests%rowtype;
  new_id uuid;
  existing_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can approve a directory request.';
  end if;

  select * into req from neighborhood_requests where id = p_request_id and status = 'pending';
  if req.id is null then
    raise exception 'That request was not found, or has already been reviewed.';
  end if;

  if not req.email_verified then
    raise exception 'This request cannot be approved until the requester verifies their email.';
  end if;

  insert into neighborhoods (name, slug, tagline, city, categories)
  values (req.name, req.slug, req.tagline, req.city, coalesce(req.categories, '[]'::jsonb))
  returning id into new_id;

  select id into existing_user_id from auth.users where lower(email) = lower(req.contact_email);

  if existing_user_id is not null then
    insert into neighborhood_admins (neighborhood_id, user_id)
    values (new_id, existing_user_id)
    on conflict do nothing;
  else
    insert into admin_invites (neighborhood_id, email)
    values (new_id, req.contact_email);
  end if;

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
  admin_of jsonb,
  is_banned boolean
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
    ),
    coalesce(u.banned_until, 'epoch'::timestamptz) > now()
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

-- Bans or unbans an account by writing auth.users.banned_until directly —
-- Supabase's own auth server checks this column on every login, so this
-- takes effect immediately without any Admin API / service-role Edge
-- Function. Platform-admin only; can't disable yourself.
create or replace function public.set_user_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can disable an account.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t disable your own account from here.';
  end if;
  update auth.users
  set banned_until = case when p_banned then 'infinity'::timestamptz else null end
  where id = p_user_id;
end;
$$;

-- Changes an account's email directly (e.g. fixing a typo). Marks it
-- confirmed immediately since a platform admin is vouching for it —
-- skips Supabase's usual "confirm your new email" round trip.
-- Platform-admin only.
create or replace function public.admin_update_user_email(p_user_id uuid, p_new_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can edit a user''s email.';
  end if;
  update auth.users
  set email = lower(trim(p_new_email)),
      email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = p_user_id;
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
-- Platform admin overview improvements:
-- 1) A changelog platform admins can add entries to, so they can track
--    what shipped and when without digging through git history.
-- 2) A backup_log recording every full-platform export taken, so admins
--    can see when the last DR backup was made and by whom.
-- 3) export_platform_backup(): a single SECURITY DEFINER call that
--    snapshots every table on the platform into one jsonb payload for
--    disaster recovery, and logs itself to backup_log. Kept as one
--    function (rather than several client-side selects) so the backup
--    is atomic and doesn't depend on per-table RLS staying in sync.

create table app_changelog (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  summary text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table backup_log (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  row_counts jsonb not null,
  created_at timestamptz not null default now()
);

alter table app_changelog enable row level security;
alter table backup_log enable row level security;

create policy "changelog_platform_admin_read"
  on app_changelog for select
  using (is_platform_admin());

create policy "changelog_platform_admin_insert"
  on app_changelog for insert
  with check (is_platform_admin());

create policy "changelog_platform_admin_delete"
  on app_changelog for delete
  using (is_platform_admin());

create policy "backup_log_platform_admin_read"
  on backup_log for select
  using (is_platform_admin());

grant select, insert, delete on app_changelog to authenticated;
grant select on backup_log to authenticated;

create or replace function public.export_platform_backup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  counts jsonb;
begin
  if not (is_platform_admin() or current_user = 'service_role') then
    raise exception 'Only platform admins can export a backup';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'neighborhoods', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from neighborhoods t),
    'vendors', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from vendors t),
    'neighborhood_admins', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from neighborhood_admins t),
    'admin_invites', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from admin_invites t),
    'platform_admins', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from platform_admins t),
    'contact_messages', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from contact_messages t),
    'neighborhood_requests', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from neighborhood_requests t),
    'app_changelog', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from app_changelog t),
    'users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'banned', (u.banned_until is not null and u.banned_until > now())
      )), '[]'::jsonb)
      from auth.users u
    )
  ) into result;

  counts := jsonb_build_object(
    'neighborhoods', jsonb_array_length(result->'neighborhoods'),
    'vendors', jsonb_array_length(result->'vendors'),
    'users', jsonb_array_length(result->'users'),
    'contact_messages', jsonb_array_length(result->'contact_messages'),
    'neighborhood_requests', jsonb_array_length(result->'neighborhood_requests')
  );

  insert into backup_log (created_by, row_counts) values (auth.uid(), counts);

  return result;
end;
$$;
-- Left-nav "community knowledge hub" sections per neighborhood: HOA
-- Contacts, Community Services, Emergency, and Community FAQ. One
-- flexible table covers all four (plus Vendors, which already exists) —
-- "subsection" is the free-text category an admin defines (e.g. "Board
-- members"), "title"/"body" double as contact-name/notes for the
-- contact-style sections or question/answer for FAQ. FAQ answers can
-- optionally point at an existing vendor instead of (or alongside) text.

create table neighborhood_info_items (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  section text not null check (section in ('hoa_contacts', 'community_services', 'emergency', 'faq')),
  subsection text,
  title text not null,
  body text,
  phone text,
  email text,
  website text,
  vendor_id uuid references vendors(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index neighborhood_info_items_neighborhood_idx on neighborhood_info_items(neighborhood_id, section);

alter table neighborhood_info_items enable row level security;

create policy "info_items_public_read"
  on neighborhood_info_items for select
  using (true);

create policy "info_items_admin_insert"
  on neighborhood_info_items for insert
  with check (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

create policy "info_items_admin_update"
  on neighborhood_info_items for update
  using (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

create policy "info_items_admin_delete"
  on neighborhood_info_items for delete
  using (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

grant select on neighborhood_info_items to anon, authenticated;
grant insert, update, delete on neighborhood_info_items to authenticated;
-- FAQ answers linked to "a vendor" turned out too narrow — residents
-- want "who handles X kind of thing", not one specific person/company.
-- Add a category link instead (matches the free-text vendor.category /
-- neighborhood.categories values already used elsewhere). vendor_id is
-- left in place for now but the UI no longer sets it.

alter table neighborhood_info_items add column category text;

-- Needs / Broadcast / Members: a resident-facing "Service Board" (post and
-- upvote community issues, refer trusted vendors) and an admin panel to
-- manage need status, broadcast official updates, and maintain a member
-- roster with roles. Unlike the rest of the app (public-read vendor
-- directory, public-read community info), this whole feature is
-- members-only — nothing here is granted to `anon`.
--
-- "Membership" is deliberately a separate, lighter-weight concept from
-- admin rights: neighborhood_admins (unchanged) stays the sole source of
-- truth for who can administer a neighborhood. A member is just a
-- logged-in resident who self-registered their unit + Owner/Renter role;
-- an admin can later promote a member to the informational "board_member"
-- role, but that still isn't the same table/mechanism as neighborhood_admins.

create table if not exists neighborhood_members (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  role text not null default 'owner' check (role in ('owner', 'renter', 'board_member')),
  created_at timestamptz not null default now(),
  unique (neighborhood_id, user_id)
);

-- Checks whether the calling user is a member (resident, not admin) of the
-- given neighborhood. SECURITY DEFINER for the same reason as
-- is_neighborhood_admin — this table's own read policy would otherwise
-- recurse.
create or replace function public.is_neighborhood_member(p_neighborhood_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from neighborhood_members
    where neighborhood_id = p_neighborhood_id and user_id = auth.uid()
  );
$$;

create table if not exists needs (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'emergency')),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved')),
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The upvote / "I have this issue too" signal — deliberately the same
-- underlying table for both (see migration discussion): a member either
-- backs a need or doesn't. The composite primary key is what prevents
-- double-voting, so there's no separate unique constraint to add.
create table if not exists need_supporters (
  need_id uuid not null references needs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (need_id, user_id)
);

-- Must reference an existing vendor in that need's own neighborhood
-- (enforced in the insert policy below, not just by convention).
create table if not exists need_vendor_referrals (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references needs(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  referred_by uuid references auth.users(id) on delete set null,
  estimated_cost numeric,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  need_id uuid references needs(id) on delete set null,
  title text not null,
  message text not null,
  posted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists needs_neighborhood_idx on needs(neighborhood_id);
create index if not exists need_supporters_need_idx on need_supporters(need_id);
create index if not exists need_vendor_referrals_need_idx on need_vendor_referrals(need_id);
create index if not exists need_vendor_referrals_vendor_idx on need_vendor_referrals(vendor_id);
create index if not exists broadcasts_neighborhood_idx on broadcasts(neighborhood_id);

alter table neighborhood_members enable row level security;
alter table needs enable row level security;
alter table need_supporters enable row level security;
alter table need_vendor_referrals enable row level security;
alter table broadcasts enable row level security;

-- neighborhood_members: same visibility shape as neighborhood_admins'
-- "admins_read" policy — self row, or that neighborhood's admins, or a
-- platform admin. NOT member-readable — the roster is an admin-only view;
-- needs/broadcasts show `unit` directly on their own rows instead of
-- joining through here.
create policy "members_self_or_admin_read"
  on neighborhood_members for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  );

-- Self-serve join: anyone logged in can insert their own row, but only as
-- 'owner' or 'renter' — 'board_member' can only be granted by an admin
-- (see the update policy below).
create policy "members_self_insert"
  on neighborhood_members for insert
  with check (user_id = auth.uid() and role in ('owner', 'renter'));

-- Both USING and WITH CHECK are required here: an UPDATE policy with only
-- WITH CHECK defaults USING to true, which would let anyone retarget any
-- row (not just their own), since only the *new* row gets validated
-- against WITH CHECK.
create policy "members_self_or_admin_update"
  on neighborhood_members for update
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  )
  with check (
    is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
    or (user_id = auth.uid() and role in ('owner', 'renter'))
  );

create policy "members_self_or_admin_delete"
  on neighborhood_members for delete
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  );

-- needs: member-or-admin can read/post; only admins manage status/severity
-- after the fact (matches neighborhood_info_items' admin-owns-the-content
-- precedent — authors don't edit their own post once submitted).
create policy "needs_member_or_admin_read"
  on needs for select
  using (
    is_neighborhood_member(needs.neighborhood_id)
    or is_neighborhood_admin(needs.neighborhood_id)
    or is_platform_admin()
  );

create policy "needs_member_insert"
  on needs for insert
  with check (is_neighborhood_member(needs.neighborhood_id) and author_id = auth.uid());

create policy "needs_admin_update"
  on needs for update
  using (is_neighborhood_admin(needs.neighborhood_id) or is_platform_admin());

create policy "needs_author_or_admin_delete"
  on needs for delete
  using (
    author_id = auth.uid()
    or is_neighborhood_admin(needs.neighborhood_id)
    or is_platform_admin()
  );

create policy "supporters_member_or_admin_read"
  on need_supporters for select
  using (
    exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "supporters_member_insert"
  on need_supporters for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "supporters_self_or_admin_delete"
  on need_supporters for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

-- need_vendor_referrals: must point at a vendor in the same neighborhood
-- as the need, and the referrer is always pinned to the caller (never
-- attributable to someone else).
create policy "referrals_member_or_admin_read"
  on need_vendor_referrals for select
  using (
    exists (
      select 1 from needs n
      where n.id = need_vendor_referrals.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "referrals_member_insert"
  on need_vendor_referrals for insert
  with check (
    referred_by = auth.uid()
    and exists (
      select 1 from needs n
      join vendors v on v.id = need_vendor_referrals.vendor_id
      where n.id = need_vendor_referrals.need_id
        and v.neighborhood_id = n.neighborhood_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "referrals_self_or_admin_delete"
  on need_vendor_referrals for delete
  using (
    referred_by = auth.uid()
    or exists (
      select 1 from needs n
      where n.id = need_vendor_referrals.need_id
        and (is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

-- broadcasts: official updates — member-or-admin read, admin-only write.
create policy "broadcasts_member_or_admin_read"
  on broadcasts for select
  using (
    is_neighborhood_member(broadcasts.neighborhood_id)
    or is_neighborhood_admin(broadcasts.neighborhood_id)
    or is_platform_admin()
  );

create policy "broadcasts_admin_insert"
  on broadcasts for insert
  with check (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

create policy "broadcasts_admin_update"
  on broadcasts for update
  using (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

create policy "broadcasts_admin_delete"
  on broadcasts for delete
  using (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

-- Unlike vendors/neighborhoods/neighborhood_info_items, none of these five
-- tables grant anything to anon — the whole feature is members-only.
grant select, insert, update, delete on neighborhood_members to authenticated;
grant select, insert, update, delete on needs to authenticated;
grant select, insert, delete on need_supporters to authenticated;
grant select, insert, delete on need_vendor_referrals to authenticated;
grant select, insert, update, delete on broadcasts to authenticated;

-- The members of one neighborhood, with email and a derived is_admin flag
-- — callable by that neighborhood's own admins or a platform admin.
-- Direct sibling of list_neighborhood_admins; a plain client-side select
-- can't join auth.users for the email column.
create or replace function public.list_neighborhood_members(p_neighborhood_id uuid)
returns table (user_id uuid, email text, unit text, role text, created_at timestamptz, is_admin boolean)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id, u.email, m.unit, m.role, m.created_at,
         exists (
           select 1 from neighborhood_admins na
           where na.neighborhood_id = p_neighborhood_id and na.user_id = m.user_id
         )
  from neighborhood_members m
  join auth.users u on u.id = m.user_id
  where m.neighborhood_id = p_neighborhood_id
    and (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin())
  order by m.created_at;
$$;
