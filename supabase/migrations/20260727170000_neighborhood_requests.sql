-- Lets anyone request a new neighborhood directory without an account.
-- A platform admin reviews the queue; approving creates the real
-- neighborhood and an admin_invites row for the requester's email, so
-- the moment they sign up with that email the existing invite-promotion
-- trigger (handle_new_user_invites, see initial_schema) makes them its
-- first admin.

create table neighborhood_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  tagline text,
  categories jsonb not null default '[]'::jsonb,
  contact_name text,
  contact_email text not null,
  status text not null default 'pending',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index neighborhood_requests_status_idx on neighborhood_requests(status);

alter table neighborhood_requests enable row level security;

create policy "requests_public_insert"
  on neighborhood_requests for insert
  with check (status = 'pending');

create policy "requests_platform_read"
  on neighborhood_requests for select
  using (is_platform_admin());

create policy "requests_platform_update"
  on neighborhood_requests for update
  using (is_platform_admin());

create policy "requests_platform_delete"
  on neighborhood_requests for delete
  using (is_platform_admin());

grant insert on neighborhood_requests to anon, authenticated;
grant select, update, delete on neighborhood_requests to authenticated;

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

  insert into neighborhoods (name, slug, tagline, categories)
  values (req.name, req.slug, req.tagline, coalesce(req.categories, '[]'::jsonb))
  returning id into new_id;

  insert into admin_invites (neighborhood_id, email)
  values (new_id, req.contact_email);

  update neighborhood_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return new_id;
end;
$$;

create or replace function public.reject_neighborhood_request(p_request_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Only a platform admin can reject a directory request.';
  end if;

  update neighborhood_requests
  set status = 'rejected', review_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id and status = 'pending';
end;
$$;
