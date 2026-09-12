-- Automates two of the buckets already shown (manually, for bulk-delete)
-- on the Platform admin Users page:
--   - "Never completed sign-in": deleted after 7 days. These aren't real
--     established identities, just abandoned signups — no warning needed.
--   - "Signed in, no activity": warned by email once inactive for 13 days,
--     then deleted at 20 days if they haven't signed back in since. A
--     fresh sign-in after the warning cancels it (see last_sign_in_at
--     snapshot below) rather than deleting someone who came back.
--
-- Driven by a daily GitHub Actions job (see
-- .github/workflows/inactive-user-cleanup.yml) rather than pg_cron —
-- reuses the same SUPABASE_SERVICE_ROLE_KEY secret and script pattern
-- already set up for the backup workflow, no separate pg_net/Vault setup.
-- Every function here checks auth.role() = 'service_role' itself, so
-- only that scheduled job (never a logged-in user) can call them.

create table inactive_user_warnings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  warned_at timestamptz not null default now(),
  -- Snapshot of last_sign_in_at at warning time. If the user signs in
  -- again before the deletion pass, their current last_sign_in_at no
  -- longer matches this snapshot — that cancels the pending deletion,
  -- and their next inactive stretch gets a fresh warning.
  last_sign_in_at_snapshot timestamptz
);
alter table inactive_user_warnings enable row level security;
-- No policies — only the service role (which bypasses RLS) ever touches
-- this table; nothing here is meant to be visible to admins or residents.

create or replace function public.list_never_signed_in_candidates()
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email
  from auth.users u
  where auth.role() = 'service_role'
    and u.last_sign_in_at is null
    and u.created_at < now() - interval '7 days'
    and not exists (select 1 from platform_admins pa where pa.user_id = u.id)
    and not exists (select 1 from neighborhood_admins na where na.user_id = u.id)
    and not exists (select 1 from neighborhood_members nm where nm.user_id = u.id);
$$;

create or replace function public.list_inactive_warn_candidates()
returns table (user_id uuid, email text, last_sign_in_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email, u.last_sign_in_at
  from auth.users u
  left join inactive_user_warnings w on w.user_id = u.id
  where auth.role() = 'service_role'
    and u.last_sign_in_at is not null
    and u.last_sign_in_at < now() - interval '13 days'
    and not exists (select 1 from platform_admins pa where pa.user_id = u.id)
    and not exists (select 1 from neighborhood_admins na where na.user_id = u.id)
    and not exists (select 1 from neighborhood_members nm where nm.user_id = u.id)
    and (w.user_id is null or w.last_sign_in_at_snapshot is distinct from u.last_sign_in_at);
$$;

create or replace function public.list_inactive_delete_candidates()
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email
  from auth.users u
  join inactive_user_warnings w on w.user_id = u.id
  where auth.role() = 'service_role'
    and u.last_sign_in_at is not null
    and u.last_sign_in_at < now() - interval '20 days'
    and w.last_sign_in_at_snapshot = u.last_sign_in_at
    and w.warned_at <= now() - interval '7 days'
    and not exists (select 1 from platform_admins pa where pa.user_id = u.id)
    and not exists (select 1 from neighborhood_admins na where na.user_id = u.id)
    and not exists (select 1 from neighborhood_members nm where nm.user_id = u.id);
$$;

create or replace function public.record_inactivity_warning(p_user_id uuid, p_last_sign_in_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the automated cleanup job can record a warning.';
  end if;
  insert into inactive_user_warnings (user_id, warned_at, last_sign_in_at_snapshot)
  values (p_user_id, now(), p_last_sign_in_at)
  on conflict (user_id) do update
    set warned_at = excluded.warned_at, last_sign_in_at_snapshot = excluded.last_sign_in_at_snapshot;
end;
$$;

-- delete_user_accounts() previously only allowed a logged-in platform
-- admin — the scheduled cleanup job runs with no user session at all,
-- only the service role, so it needs the same allowance
-- export_platform_backup() already has.
create or replace function public.delete_user_accounts(p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_platform_admin() or auth.role() = 'service_role') then
    raise exception 'Only a platform admin can delete accounts.';
  end if;
  if auth.uid() = any(p_user_ids) then
    raise exception 'You can''t delete your own account from here.';
  end if;
  delete from auth.users where id = any(p_user_ids);
end;
$$;
