-- list_all_users() previously only reported neighborhood_admins (as
-- admin_of), so the Platform admin Users page couldn't tell a real
-- resident (a plain neighborhood_members row, no admin role) apart from
-- an account with zero footprint anywhere — both looked identical,
-- lumped into one "No neighborhood" bucket. Adding member_of lets the
-- page split that bucket into real signal (residents) and the two kinds
-- of inert accounts (never finished signing in vs. signed in once and
-- never did anything).
--
-- Return type is changing, which create-or-replace can't do — drop first.
drop function if exists public.list_all_users();

create function public.list_all_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_platform_admin boolean,
  admin_of jsonb,
  member_of jsonb,
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
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug) order by n.name)
       from neighborhood_members nm
       join neighborhoods n on n.id = nm.neighborhood_id
       where nm.user_id = u.id),
      '[]'::jsonb
    ),
    coalesce(u.banned_until, 'epoch'::timestamptz) > now()
  from auth.users u
  where is_platform_admin()
  order by u.created_at desc;
$$;

-- Bulk companion to delete_user_account(), for clearing out a batch of
-- lingering no-footprint accounts in one action instead of one click each.
create or replace function public.delete_user_accounts(p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can delete accounts.';
  end if;
  if auth.uid() = any(p_user_ids) then
    raise exception 'You can''t delete your own account from here.';
  end if;
  delete from auth.users where id = any(p_user_ids);
end;
$$;
