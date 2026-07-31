-- Adds a city field to neighborhoods (and to pending requests, so it
-- carries through on approval) for the new cross-neighborhood "Browse
-- all vendors" page. Also relabels vendor status from Active/Inactive
-- to Verified/Unknown -- "Verified" now means neighbors have vouched
-- for this vendor, not "currently open for business." A vendor that's
-- no longer in business should just be deleted rather than marked
-- inactive (see AdminDashboard's existing Delete action).

alter table neighborhoods add column if not exists city text;
alter table neighborhood_requests add column if not exists city text;

create or replace function public.approve_neighborhood_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req neighborhood_requests%rowtype;
  new_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can approve a directory request.';
  end if;

  select * into req from neighborhood_requests where id = p_request_id and status = 'pending';
  if req.id is null then
    raise exception 'That request was not found, or has already been reviewed.';
  end if;

  insert into neighborhoods (name, slug, tagline, city, categories)
  values (req.name, req.slug, req.tagline, req.city, coalesce(req.categories, '[]'::jsonb))
  returning id into new_id;

  insert into admin_invites (neighborhood_id, email)
  values (new_id, req.contact_email);

  update neighborhood_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return new_id;
end;
$$;

-- Existing "Active" vendors default to Unknown rather than Verified --
-- having been open for business isn't the same claim as "neighbors
-- have used this." Any other legacy value (Inactive, Open, Closed,
-- Seasonal, from earlier relabelings) also collapses to Unknown.
update vendors set status = 'Unknown' where status <> 'Verified';
alter table vendors alter column status set default 'Unknown';
