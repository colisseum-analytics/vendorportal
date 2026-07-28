-- Platform admin: disable/enable an account (writes auth.users.banned_until
-- directly — Supabase's auth server checks this column on every login, so
-- no service-role Edge Function is needed) and edit a user's email inline.
-- Also adds is_banned to list_all_users.

-- CREATE OR REPLACE can't change a function's return column set; the
-- original list_all_users (see user_management_functions.sql) must be
-- dropped before recreating it with the extra is_banned column.
drop function if exists list_all_users();

create function public.list_all_users()
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
