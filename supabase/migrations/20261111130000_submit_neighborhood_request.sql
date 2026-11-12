-- Step 1 of 2 — purely additive (adds a function; changes nothing that exists).
-- Safe to run before the new site code is deployed, and safe to re-run.
--
-- Directory requests used to be written straight into the table by the
-- browser, which let anyone with the public key skip the email/CAPTCHA step
-- and even mark their own request "email verified". This function is the
-- checked front door: the form calls it instead, and it
--   * requires that a sign-in email really was just sent to that address
--     (that is the step the CAPTCHA protects),
--   * validates and length-limits every field,
--   * always saves the request as NOT email-verified,
--   * allows one pending request per email and one per web address,
--   * caps total submissions per hour as a backstop.
-- Step 2 (20261111140000_close_direct_request_insert.sql) removes the old
-- direct-insert route once the new form is live and tested.

create or replace function public.submit_neighborhood_request(
  p_name text,
  p_slug text,
  p_tagline text,
  p_city text,
  p_community_type text,
  p_categories jsonb,
  p_contact_name text,
  p_contact_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
  v_slug text := btrim(coalesce(p_slug, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_cats jsonb := coalesce(p_categories, '[]'::jsonb);
  v_sent timestamptz;
  v_id uuid;
begin
  -- field validation
  if length(v_name) < 2 or length(v_name) > 80
     or length(v_slug) < 3 or length(v_slug) > 60 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(btrim(coalesce(p_tagline, ''))) > 200
     or length(btrim(coalesce(p_city, ''))) > 80
     or length(btrim(coalesce(p_contact_name, ''))) > 80
     or (p_community_type is not null and p_community_type not in ('hoa', 'condo', 'community'))
     or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or jsonb_typeof(v_cats) <> 'array' or jsonb_array_length(v_cats) > 60
     or exists (
       select 1 from jsonb_array_elements(v_cats) c
       where jsonb_typeof(c) <> 'string' or length(c #>> '{}') > 60
     )
  then
    raise exception 'invalid_input';
  end if;

  -- proof that the sign-in email (CAPTCHA-protected) was really just sent
  select greatest(u.recovery_sent_at, u.confirmation_sent_at) into v_sent
  from auth.users u
  where lower(u.email) = v_email
  limit 1;
  if v_sent is null or v_sent < now() - interval '15 minutes' then
    raise exception 'verify_email_first';
  end if;

  -- backstop against floods
  if (select count(*) from neighborhood_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many_requests';
  end if;

  if exists (select 1 from neighborhood_requests where lower(contact_email) = v_email and status = 'pending') then
    raise exception 'already_pending';
  end if;

  if exists (select 1 from neighborhoods where slug = v_slug)
     or exists (select 1 from neighborhood_requests where slug = v_slug and status = 'pending') then
    raise exception 'slug_taken';
  end if;

  insert into neighborhood_requests (name, slug, tagline, city, community_type, categories, contact_name, contact_email, email_verified)
  values (
    v_name, v_slug,
    nullif(btrim(coalesce(p_tagline, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    p_community_type, v_cats,
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    v_email, false
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_neighborhood_request(text, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.submit_neighborhood_request(text, text, text, text, text, jsonb, text, text) to anon, authenticated;
