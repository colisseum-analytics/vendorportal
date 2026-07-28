-- Adds a free-text "specialty" field (shown/searchable alongside the
-- broad category) and an is_resident flag (shows a "Neighbor" badge on
-- vendors run by a resident of that neighborhood).

alter table vendors add column if not exists specialty text;
alter table vendors add column if not exists is_resident boolean not null default false;
