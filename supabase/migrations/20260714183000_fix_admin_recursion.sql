-- Fix: "infinite recursion detected in policy for relation
-- neighborhood_admins" (error 42P17). The admins_read policy queried
-- neighborhood_admins from within a policy ON neighborhood_admins,
-- which Postgres can't evaluate. Every other policy that checked
-- neighborhood_admins from a subquery inherited the same problem.
--
-- Fix: a SECURITY DEFINER helper function bypasses RLS internally, so
-- policies call it instead of querying neighborhood_admins directly.

create or replace function public.is_neighborhood_admin(p_neighborhood_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from neighborhood_admins
    where neighborhood_id = p_neighborhood_id and user_id = auth.uid()
  );
$$;

drop policy if exists "neighborhoods_admin_update" on neighborhoods;
create policy "neighborhoods_admin_update"
  on neighborhoods for update
  using (is_neighborhood_admin(neighborhoods.id));

drop policy if exists "vendors_admin_insert" on vendors;
create policy "vendors_admin_insert"
  on vendors for insert
  with check (is_neighborhood_admin(vendors.neighborhood_id));

drop policy if exists "vendors_admin_update" on vendors;
create policy "vendors_admin_update"
  on vendors for update
  using (is_neighborhood_admin(vendors.neighborhood_id));

drop policy if exists "vendors_admin_delete" on vendors;
create policy "vendors_admin_delete"
  on vendors for delete
  using (is_neighborhood_admin(vendors.neighborhood_id));

drop policy if exists "admins_read" on neighborhood_admins;
create policy "admins_read"
  on neighborhood_admins for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_admins.neighborhood_id)
  );

drop policy if exists "invites_admin_insert" on admin_invites;
create policy "invites_admin_insert"
  on admin_invites for insert
  with check (is_neighborhood_admin(admin_invites.neighborhood_id));

drop policy if exists "invites_admin_read" on admin_invites;
create policy "invites_admin_read"
  on admin_invites for select
  using (is_neighborhood_admin(admin_invites.neighborhood_id));

drop policy if exists "invites_admin_delete" on admin_invites;
create policy "invites_admin_delete"
  on admin_invites for delete
  using (is_neighborhood_admin(admin_invites.neighborhood_id));
