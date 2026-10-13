-- The platform backup predates community info, residents, the Service
-- Board, broadcasts and the inactive-user warnings, so none of those were
-- in the export. Adds them to the shared helper used by both
-- export_platform_backup() and the scheduled backup.

create or replace function public._build_and_log_platform_backup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  counts jsonb;
begin
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
    'neighborhood_info_items', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from neighborhood_info_items t),
    'neighborhood_members', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from neighborhood_members t),
    'needs', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from needs t),
    'need_supporters', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from need_supporters t),
    'need_vendor_referrals', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from need_vendor_referrals t),
    'broadcasts', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from broadcasts t),
    'inactive_user_warnings', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from inactive_user_warnings t),
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
    'neighborhood_requests', jsonb_array_length(result->'neighborhood_requests'),
    'neighborhood_info_items', jsonb_array_length(result->'neighborhood_info_items'),
    'neighborhood_members', jsonb_array_length(result->'neighborhood_members'),
    'needs', jsonb_array_length(result->'needs'),
    'broadcasts', jsonb_array_length(result->'broadcasts')
  );

  insert into backup_log (created_by, row_counts) values (auth.uid(), counts);

  return result;
end;
$$;
revoke all on function public._build_and_log_platform_backup() from public, anon, authenticated;
