-- Left-nav "community knowledge hub" sections per neighborhood: HOA
-- Contacts, Community Services, Emergency, and Community FAQ. One
-- flexible table covers all four (plus Vendors, which already exists) —
-- "subsection" is the free-text category an admin defines (e.g. "Board
-- members"), "title"/"body" double as contact-name/notes for the
-- contact-style sections or question/answer for FAQ. FAQ answers can
-- optionally point at an existing vendor instead of (or alongside) text.

create table neighborhood_info_items (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  section text not null check (section in ('hoa_contacts', 'community_services', 'emergency', 'faq')),
  subsection text,
  title text not null,
  body text,
  phone text,
  email text,
  website text,
  vendor_id uuid references vendors(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index neighborhood_info_items_neighborhood_idx on neighborhood_info_items(neighborhood_id, section);

alter table neighborhood_info_items enable row level security;

create policy "info_items_public_read"
  on neighborhood_info_items for select
  using (true);

create policy "info_items_admin_insert"
  on neighborhood_info_items for insert
  with check (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

create policy "info_items_admin_update"
  on neighborhood_info_items for update
  using (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

create policy "info_items_admin_delete"
  on neighborhood_info_items for delete
  using (is_neighborhood_admin(neighborhood_id) or is_platform_admin());

grant select on neighborhood_info_items to anon, authenticated;
grant insert, update, delete on neighborhood_info_items to authenticated;
