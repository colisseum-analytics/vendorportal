-- Lets anyone browsing the public directory send a note to that
-- neighborhood's admins (vendor suggestion, update, concern) without
-- an account. Only that neighborhood's admins (or a platform admin)
-- can read/resolve/delete them.

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  name text,
  email text,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_neighborhood_idx on contact_messages(neighborhood_id);

alter table contact_messages enable row level security;

create policy "contact_messages_public_insert"
  on contact_messages for insert
  with check (true);

create policy "contact_messages_admin_read"
  on contact_messages for select
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

create policy "contact_messages_admin_update"
  on contact_messages for update
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

create policy "contact_messages_admin_delete"
  on contact_messages for delete
  using (is_neighborhood_admin(contact_messages.neighborhood_id) or is_platform_admin());

grant insert on contact_messages to anon, authenticated;
grant select, update, delete on contact_messages to authenticated;
