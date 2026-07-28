-- Fix: RLS policies only restrict access a role already has at the table
-- level. Without explicit GRANTs, Postgres denies access before policies
-- are even consulted (PostgREST returned "permission denied for table
-- neighborhoods" on every request until this ran).

grant usage on schema public to anon, authenticated;

grant select on neighborhoods, vendors to anon, authenticated;
grant update on neighborhoods to authenticated;
grant insert, update, delete on vendors to authenticated;
grant select on neighborhood_admins to authenticated;
grant select, insert, delete on admin_invites to authenticated;
