-- Lets a platform admin set how often backups run automatically (in
-- addition to the existing manual Export button and the per-push GitHub
-- Action), enforced by a pg_cron job that's rescheduled whenever the
-- setting changes — takes effect immediately, no redeploy needed.

create extension if not exists pg_cron with schema extensions;

create table backup_schedule (
  id boolean primary key default true check (id),
  frequency text not null default 'manual' check (frequency in ('manual', 'daily', 'weekly', 'monthly')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into backup_schedule (id, frequency) values (true, 'manual');

alter table backup_schedule enable row level security;

create policy "backup_schedule_platform_admin_read"
  on backup_schedule for select
  using (is_platform_admin());

grant select on backup_schedule to authenticated;

-- The actual backup-building logic, shared by both entry points below.
-- No auth check of its own — safe only because EXECUTE is revoked from
-- every client-facing role; it's reachable solely via export_platform_backup()
-- (which does check) or via pg_cron (which runs as a superuser that
-- bypasses EXECUTE grants entirely, so the revoke doesn't block it).
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
revoke all on function public._build_and_log_platform_backup() from public, anon, authenticated;

-- Client-facing export — same signature and auth check as before, now
-- just delegating to the shared helper.
create or replace function public.export_platform_backup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_platform_admin() or auth.role() = 'service_role') then
    raise exception 'Only platform admins can export a backup';
  end if;
  return public._build_and_log_platform_backup();
end;
$$;

-- Cron-only entry point — never reachable by a client, whether logged
-- in or not (EXECUTE revoked below). pg_cron runs as a superuser, which
-- bypasses function EXECUTE grants entirely, so it can still call this.
create or replace function public.scheduled_platform_backup()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._build_and_log_platform_backup();
end;
$$;
revoke all on function public.scheduled_platform_backup() from public, anon, authenticated;

-- Platform-admin-only: updates the setting and (re)schedules the cron
-- job to match. Unschedule-then-reschedule handles every transition,
-- including turning it back off ('manual' just leaves nothing scheduled).
create or replace function public.set_backup_frequency(p_frequency text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can change the backup schedule.';
  end if;
  if p_frequency not in ('manual', 'daily', 'weekly', 'monthly') then
    raise exception 'Invalid frequency.';
  end if;

  update backup_schedule set frequency = p_frequency, updated_at = now(), updated_by = auth.uid() where id = true;

  perform cron.unschedule(jobid) from cron.job where jobname = 'platform-backup';

  if p_frequency = 'daily' then
    perform cron.schedule('platform-backup', '0 6 * * *', $c$select public.scheduled_platform_backup();$c$);
  elsif p_frequency = 'weekly' then
    perform cron.schedule('platform-backup', '0 6 * * 1', $c$select public.scheduled_platform_backup();$c$);
  elsif p_frequency = 'monthly' then
    perform cron.schedule('platform-backup', '0 6 1 * *', $c$select public.scheduled_platform_backup();$c$);
  end if;
end;
$$;
