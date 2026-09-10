-- Many vendors already have a promotional flyer (a JPG/PNG they post on
-- social media) they'd rather show as-is than retype into the description
-- field. Store an optional image per vendor, the same way neighborhood
-- logos already work: a public-read storage bucket, folder-scoped by
-- neighborhood id so only that neighborhood's admins can write to it.
alter table vendors add column if not exists flyer_url text;

insert into storage.buckets (id, name, public)
values ('vendor-flyers', 'vendor-flyers', true)
on conflict (id) do nothing;

drop policy if exists "flyer_public_read" on storage.objects;
create policy "flyer_public_read"
  on storage.objects for select
  using (bucket_id = 'vendor-flyers');

-- Flyers are uploaded to "<neighborhood_id>/<filename>" — same
-- folder-per-neighborhood convention as neighborhood-logos.
drop policy if exists "flyer_admin_insert" on storage.objects;
create policy "flyer_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-flyers'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

drop policy if exists "flyer_admin_update" on storage.objects;
create policy "flyer_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'vendor-flyers'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );

drop policy if exists "flyer_admin_delete" on storage.objects;
create policy "flyer_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'vendor-flyers'
    and (is_neighborhood_admin(((storage.foldername(name))[1])::uuid) or is_platform_admin())
  );
