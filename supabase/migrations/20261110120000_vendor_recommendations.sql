-- "I recommend them" on a vendor. Purely additive: one new table, one new
-- function. Nothing existing is altered, so it is safe to run on a live
-- project, and safe to re-run.
--
-- Anyone signed in (any email) can recommend a vendor once; recommending
-- again is a no-op and they can take it back. Ratings count as "neighbor"
-- ratings when the person has joined that community (a neighborhood_members
-- row — which residents self-register, so it means "joined with a unit",
-- not "verified by the board") or is one of its admins.
--
-- Raw rows are private to the voter (and the community's admins). The
-- public sees only the counts, through vendor_rating_summary().

create table if not exists vendor_ratings (
  vendor_id uuid not null references vendors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vendor_id, user_id)
);

create index if not exists vendor_ratings_neighborhood_idx on vendor_ratings(neighborhood_id);

alter table vendor_ratings enable row level security;

drop policy if exists "vendor_ratings_self_or_admin_read" on vendor_ratings;
create policy "vendor_ratings_self_or_admin_read"
  on vendor_ratings for select
  using (user_id = auth.uid() or is_neighborhood_admin(neighborhood_id) or is_platform_admin());

-- The voter is always the caller, and the vendor must really belong to the
-- neighborhood the row claims (so a vote can't be filed under another one).
drop policy if exists "vendor_ratings_self_insert" on vendor_ratings;
create policy "vendor_ratings_self_insert"
  on vendor_ratings for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from vendors v
      where v.id = vendor_ratings.vendor_id
        and v.neighborhood_id = vendor_ratings.neighborhood_id
    )
  );

drop policy if exists "vendor_ratings_self_or_admin_delete" on vendor_ratings;
create policy "vendor_ratings_self_or_admin_delete"
  on vendor_ratings for delete
  using (user_id = auth.uid() or is_neighborhood_admin(neighborhood_id) or is_platform_admin());

grant select, insert, delete on vendor_ratings to authenticated;

-- Public counts per vendor for one neighborhood, plus whether the caller
-- has recommended it. SECURITY DEFINER so anonymous visitors can read
-- totals without being able to read who voted.
create or replace function public.vendor_rating_summary(p_neighborhood_id uuid)
returns table (vendor_id uuid, total bigint, neighbors bigint, mine boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.vendor_id,
    count(*)::bigint as total,
    (count(*) filter (where
      exists (select 1 from neighborhood_members m
              where m.neighborhood_id = r.neighborhood_id and m.user_id = r.user_id)
      or exists (select 1 from neighborhood_admins a
              where a.neighborhood_id = r.neighborhood_id and a.user_id = r.user_id)
    ))::bigint as neighbors,
    coalesce(bool_or(r.user_id = auth.uid()), false) as mine
  from vendor_ratings r
  where r.neighborhood_id = p_neighborhood_id
  group by r.vendor_id;
$$;

grant execute on function public.vendor_rating_summary(uuid) to anon, authenticated;
