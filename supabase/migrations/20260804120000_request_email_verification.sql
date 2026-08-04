-- Requires a directory requester to verify their contact email (via a
-- Supabase magic-link sign-in, which also creates their auth account
-- immediately) before a platform admin is allowed to approve the request.
-- Approval then promotes their already-existing account directly, instead
-- of relying on the admin_invites + handle_new_user_invites() trigger
-- (which only fires on account creation — by approval time, the account
-- already exists).

alter table neighborhood_requests
  add column email_verified boolean not null default false;

-- Called by the requester's own (now-authenticated, magic-link) session.
-- Verifies whichever pending request matches their confirmed email —
-- doesn't trust a client-supplied request id, since RLS/SECURITY DEFINER
-- means the client can't be trusted to say who they are.
create or replace function public.verify_my_pending_request()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text;
  req_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to verify a request.';
  end if;

  select email into my_email from auth.users where id = auth.uid();

  update neighborhood_requests
  set email_verified = true
  where lower(contact_email) = lower(my_email)
    and status = 'pending'
    and email_verified = false
  returning id into req_id;

  return req_id;
end;
$$;

-- Approval now requires email_verified, and promotes an already-existing
-- account directly (the common case under the new flow) while keeping
-- the admin_invites fallback for any request approved before this
-- migration, or otherwise missing a verified account.
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

  insert into neighborhoods (name, slug, tagline, city, categories)
  values (req.name, req.slug, req.tagline, req.city, coalesce(req.categories, '[]'::jsonb))
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
