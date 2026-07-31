-- Platform admins are meant to be able to do anything any neighborhood
-- admin can do, anywhere. Vendor writes and invite management were only
-- checking is_neighborhood_admin() — a platform admin who isn't literally
-- a member of neighborhood_admins for a given neighborhood couldn't add,
-- edit, or delete its vendors, or manage its pending invites. Add the
-- is_platform_admin() bypass everywhere neighborhood admin checks appear.

drop policy "vendors_admin_insert" on vendors;
create policy "vendors_admin_insert"
  on vendors for insert
  with check (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

drop policy "vendors_admin_update" on vendors;
create policy "vendors_admin_update"
  on vendors for update
  using (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

drop policy "vendors_admin_delete" on vendors;
create policy "vendors_admin_delete"
  on vendors for delete
  using (is_neighborhood_admin(vendors.neighborhood_id) or is_platform_admin());

drop policy "invites_admin_insert" on admin_invites;
create policy "invites_admin_insert"
  on admin_invites for insert
  with check (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

drop policy "invites_admin_read" on admin_invites;
create policy "invites_admin_read"
  on admin_invites for select
  using (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

drop policy "invites_admin_delete" on admin_invites;
create policy "invites_admin_delete"
  on admin_invites for delete
  using (is_neighborhood_admin(admin_invites.neighborhood_id) or is_platform_admin());

-- admins_read already covered neighborhoods_admin/is_platform_admin? No —
-- it only checked self or is_neighborhood_admin(). Add the same bypass so
-- a platform admin can see who administers any neighborhood.
drop policy "admins_read" on neighborhood_admins;
create policy "admins_read"
  on neighborhood_admins for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_admins.neighborhood_id)
    or is_platform_admin()
  );
