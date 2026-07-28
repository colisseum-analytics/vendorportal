-- Adds the platform-admin role (oversees every neighborhood), the
-- active/logo_url columns on neighborhoods, and a storage bucket for
-- neighborhood logos.

alter table neighborhoods add column if not exists logo_url text;
alter table neighborhoods add column if not exists active boolean not null default true;

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

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

-- Neighborhoods: public read is now active-only (a neighborhood's own
-- admins, or a platform admin, can still see it while inactive).
drop policy if exists "neighborhoods_public_read" on neighborhoods;
create policy "neighborhoods_public_read"
  on neighborhoods for select
  using (
    active
    or is_neighborhood_admin(neighborhoods.id)
    or is_platform_admin()
  );

drop policy if exists "neighborhoods_admin_update" on neighborhoods;
create policy "neighborhoods_admin_update"
  on neighborhoods for update
  using (is_neighborhood_admin(neighborhoods.id) or is_platform_admin());

drop policy if exists "neighborhoods_platform_delete" on neighborhoods;
create policy "neighborhoods_platform_delete"
  on neighborhoods for delete
  using (is_platform_admin());

drop policy if exists "platform_admins_read" on platform_admins;
create policy "platform_admins_read"
  on platform_admins for select
  using (is_platform_admin());

grant update, delete on neighborhoods to authenticated;
grant select on platform_admins to authenticated;

-- Grants the platform admin role to an existing account by email. Only
-- callable by an existing platform admin — the very first one has to be
-- bootstrapped directly in the SQL editor (see ARCHITECTURE.md).
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

-- ---------- storage (neighborhood logos) ----------

insert into storage.buckets (id, name, public)
values ('neighborhood-logos', 'neighborhood-logos', true)
on conflict (id) do nothing;

drop policy if exists "logo_public_read" on storage.objects;
create policy "logo_public_read"
  on storage.objects for select
  using (bucket_id = 'neighborhood-logos');

-- Logos are uploaded to "<neighborhood_id>/<filename>" — the folder name
-- is the neighborhood id, so only that neighborhood's admins (or a
-- platform admin) can write files under it.
drop policy if exists "logo_admin_insert" on storage.objects;
create policy "logo_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

drop policy if exists "logo_admin_update" on storage.objects;
create policy "logo_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

drop policy if exists "logo_admin_delete" on storage.objects;
create policy "logo_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'neighborhood-logos'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );
