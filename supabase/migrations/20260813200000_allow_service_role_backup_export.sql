-- The automated version+backup GitHub Action calls export_platform_backup()
-- using the Supabase service-role key rather than a logged-in platform
-- admin's session, so auth.uid() is null and is_platform_admin() alone
-- would reject it. The service-role key already has unrestricted database
-- access (it bypasses RLS entirely), so also allowing requests carrying
-- the `service_role` JWT claim doesn't grant anything new — it just lets
-- this convenience RPC work for that already-trusted caller too.
--
-- Note: this must check auth.role(), not current_user — this function is
-- SECURITY DEFINER, so current_user inside the function body reflects the
-- function's owner, not the actual caller. auth.role() reads the JWT role
-- claim via a per-request session GUC, which isn't masked by SECURITY
-- DEFINER and correctly reflects who actually called the RPC.

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
  if not (is_platform_admin() or auth.role() = 'service_role') then
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
