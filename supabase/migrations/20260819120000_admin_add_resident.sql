-- Lets a neighborhood admin add an existing account as a resident by
-- email, from the new admin Residents page. Only works for accounts that
-- already exist (no deferred/pending-invite mechanism, unlike
-- admin_invites for co-admins) — by design, per product decision, to keep
-- this simple. SECURITY DEFINER because looking up a user by email
-- requires reading auth.users, which neighborhood admins can't do
-- directly, and members_self_insert only allows inserting your own row.

create or replace function public.admin_add_resident(p_neighborhood_id uuid, p_email text, p_unit text, p_role text default 'owner')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin()) then
    raise exception 'Only an admin of this neighborhood can add a resident.';
  end if;

  if p_role not in ('owner', 'renter', 'board_member') then
    raise exception 'Invalid role.';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'No account found for that email — they need to create an account first.';
  end if;

  insert into neighborhood_members (neighborhood_id, user_id, unit, role)
  values (p_neighborhood_id, v_user_id, trim(p_unit), p_role)
  on conflict (neighborhood_id, user_id) do update set unit = excluded.unit, role = excluded.role;
end;
$$;
