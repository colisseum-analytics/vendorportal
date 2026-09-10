-- Neighborhoods are starting to add more than one admin, so it's worth
-- knowing which admin actually added a given vendor. `default auth.uid()`
-- captures this automatically on every insert (manual "Add vendor" and CSV
-- import alike) with no app-code changes needed for the write path.
alter table vendors add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

-- Sibling of list_neighborhood_admins/list_neighborhood_members: a plain
-- client-side select can't join auth.users for the email column, and
-- created_by can point at a platform admin who isn't one of this
-- neighborhood's own admins, so the already-loaded admin list isn't enough.
create or replace function public.list_vendor_creators(p_neighborhood_id uuid)
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public
stable
as $$
  select distinct u.id, u.email
  from vendors v
  join auth.users u on u.id = v.created_by
  where v.neighborhood_id = p_neighborhood_id
    and (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin());
$$;
