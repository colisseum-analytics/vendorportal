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
  if not is_platform_admin() then
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
