-- Platform-admin user management. Reads/writes auth.users directly from
-- SECURITY DEFINER functions (the same trick get_user_id_by_email
-- already relies on, see initial_schema) so none of this needs a
-- service-role Edge Function.

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
-- platform_admins rows). Platform-admin only; can't delete yourself to
-- avoid locking yourself out.
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
