-- Companion to remove_neighborhood_admin(): lets a platform admin (or an
-- existing admin of the target neighborhood) grant admin access to an
-- EXISTING account directly. The only path that previously existed
-- (admin_invites) only resolves via a trigger on brand-new auth.users
-- signup, so it could never promote someone who already has an account.
--
-- Nothing here changes what's allowed structurally -- neighborhood_admins
-- has always had a composite (neighborhood_id, user_id) primary key, so a
-- user being admin of more than one neighborhood already worked; this
-- just adds the missing way to create that second row for an existing user.
create or replace function public.add_neighborhood_admin(p_neighborhood_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin()) then
    raise exception 'Only an admin of this neighborhood (or a platform admin) can do that.';
  end if;

  insert into neighborhood_admins (neighborhood_id, user_id)
  values (p_neighborhood_id, p_user_id)
  on conflict do nothing;
end;
$$;
