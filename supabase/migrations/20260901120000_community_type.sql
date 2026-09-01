-- Lets a neighborhood be tagged as an HOA, Condo, or generic Community —
-- purely a display value (meta descriptions, copy) with no effect on
-- routing/slugs/RLS. Nullable and un-backfilled: existing rows stay
-- untyped and fall back to today's generic wording until an admin sets
-- one, same pattern as tagline/city.

alter table neighborhoods
  add column if not exists community_type text;

alter table neighborhood_requests
  add column if not exists community_type text;

create or replace function public.approve_neighborhood_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req neighborhood_requests%rowtype;
  new_id uuid;
  existing_user_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can approve a directory request.';
  end if;

  select * into req from neighborhood_requests where id = p_request_id and status = 'pending';
  if req.id is null then
    raise exception 'That request was not found, or has already been reviewed.';
  end if;

  if not req.email_verified then
    raise exception 'This request cannot be approved until the requester verifies their email.';
  end if;

  insert into neighborhoods (name, slug, tagline, city, community_type, categories)
  values (req.name, req.slug, req.tagline, req.city, req.community_type, coalesce(req.categories, '[]'::jsonb))
  returning id into new_id;

  select id into existing_user_id from auth.users where lower(email) = lower(req.contact_email);

  if existing_user_id is not null then
    insert into neighborhood_admins (neighborhood_id, user_id)
    values (new_id, existing_user_id)
    on conflict do nothing;
  else
    insert into admin_invites (neighborhood_id, email)
    values (new_id, req.contact_email);
  end if;

  update neighborhood_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return new_id;
end;
$$;
