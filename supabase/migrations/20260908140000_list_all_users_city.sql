-- Add city to each admin_of/member_of entry so the Platform admin Users
-- page can show it next to a user's neighborhoods, the same way the
-- Neighborhoods page already groups by city — otherwise two same-named
-- (or same-sounding) neighborhoods in different cities are indistinguishable
-- on the Users page.
create or replace function public.list_all_users()
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
      (select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug, 'city', n.city) order by n.name)
       from neighborhood_admins na
       join neighborhoods n on n.id = na.neighborhood_id
       where na.user_id = u.id),
      '[]'::jsonb
    ),
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug, 'city', n.city) order by n.name)
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
