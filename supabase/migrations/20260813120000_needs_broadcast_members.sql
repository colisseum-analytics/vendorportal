-- Needs / Broadcast / Members: a resident-facing "Service Board" (post and
-- upvote community issues, refer trusted vendors) and an admin panel to
-- manage need status, broadcast official updates, and maintain a member
-- roster with roles. Unlike the rest of the app (public-read vendor
-- directory, public-read community info), this whole feature is
-- members-only — nothing here is granted to `anon`.
--
-- "Membership" is deliberately a separate, lighter-weight concept from
-- admin rights: neighborhood_admins (unchanged) stays the sole source of
-- truth for who can administer a neighborhood. A member is just a
-- logged-in resident who self-registered their unit + Owner/Renter role;
-- an admin can later promote a member to the informational "board_member"
-- role, but that still isn't the same table/mechanism as neighborhood_admins.

create table if not exists neighborhood_members (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  role text not null default 'owner' check (role in ('owner', 'renter', 'board_member')),
  created_at timestamptz not null default now(),
  unique (neighborhood_id, user_id)
);

-- Checks whether the calling user is a member (resident, not admin) of the
-- given neighborhood. SECURITY DEFINER for the same reason as
-- is_neighborhood_admin — this table's own read policy would otherwise
-- recurse.
create or replace function public.is_neighborhood_member(p_neighborhood_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from neighborhood_members
    where neighborhood_id = p_neighborhood_id and user_id = auth.uid()
  );
$$;

create table if not exists needs (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'emergency')),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved')),
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The upvote / "I have this issue too" signal — deliberately the same
-- underlying table for both (see migration discussion): a member either
-- backs a need or doesn't. The composite primary key is what prevents
-- double-voting, so there's no separate unique constraint to add.
create table if not exists need_supporters (
  need_id uuid not null references needs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (need_id, user_id)
);

-- Must reference an existing vendor in that need's own neighborhood
-- (enforced in the insert policy below, not just by convention).
create table if not exists need_vendor_referrals (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references needs(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  referred_by uuid references auth.users(id) on delete set null,
  estimated_cost numeric,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  need_id uuid references needs(id) on delete set null,
  title text not null,
  message text not null,
  posted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists needs_neighborhood_idx on needs(neighborhood_id);
create index if not exists need_supporters_need_idx on need_supporters(need_id);
create index if not exists need_vendor_referrals_need_idx on need_vendor_referrals(need_id);
create index if not exists need_vendor_referrals_vendor_idx on need_vendor_referrals(vendor_id);
create index if not exists broadcasts_neighborhood_idx on broadcasts(neighborhood_id);

alter table neighborhood_members enable row level security;
alter table needs enable row level security;
alter table need_supporters enable row level security;
alter table need_vendor_referrals enable row level security;
alter table broadcasts enable row level security;

-- neighborhood_members: same visibility shape as neighborhood_admins'
-- "admins_read" policy — self row, or that neighborhood's admins, or a
-- platform admin. NOT member-readable — the roster is an admin-only view;
-- needs/broadcasts show `unit` directly on their own rows instead of
-- joining through here.
create policy "members_self_or_admin_read"
  on neighborhood_members for select
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  );

-- Self-serve join: anyone logged in can insert their own row, but only as
-- 'owner' or 'renter' — 'board_member' can only be granted by an admin
-- (see the update policy below).
create policy "members_self_insert"
  on neighborhood_members for insert
  with check (user_id = auth.uid() and role in ('owner', 'renter'));

-- Both USING and WITH CHECK are required here: an UPDATE policy with only
-- WITH CHECK defaults USING to true, which would let anyone retarget any
-- row (not just their own), since only the *new* row gets validated
-- against WITH CHECK.
create policy "members_self_or_admin_update"
  on neighborhood_members for update
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  )
  with check (
    is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
    or (user_id = auth.uid() and role in ('owner', 'renter'))
  );

create policy "members_self_or_admin_delete"
  on neighborhood_members for delete
  using (
    user_id = auth.uid()
    or is_neighborhood_admin(neighborhood_members.neighborhood_id)
    or is_platform_admin()
  );

-- needs: member-or-admin can read/post; only admins manage status/severity
-- after the fact (matches neighborhood_info_items' admin-owns-the-content
-- precedent — authors don't edit their own post once submitted).
create policy "needs_member_or_admin_read"
  on needs for select
  using (
    is_neighborhood_member(needs.neighborhood_id)
    or is_neighborhood_admin(needs.neighborhood_id)
    or is_platform_admin()
  );

create policy "needs_member_insert"
  on needs for insert
  with check (is_neighborhood_member(needs.neighborhood_id) and author_id = auth.uid());

create policy "needs_admin_update"
  on needs for update
  using (is_neighborhood_admin(needs.neighborhood_id) or is_platform_admin());

create policy "needs_author_or_admin_delete"
  on needs for delete
  using (
    author_id = auth.uid()
    or is_neighborhood_admin(needs.neighborhood_id)
    or is_platform_admin()
  );

create policy "supporters_member_or_admin_read"
  on need_supporters for select
  using (
    exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "supporters_member_insert"
  on need_supporters for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "supporters_self_or_admin_delete"
  on need_supporters for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from needs n
      where n.id = need_supporters.need_id
        and (is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

-- need_vendor_referrals: must point at a vendor in the same neighborhood
-- as the need, and the referrer is always pinned to the caller (never
-- attributable to someone else).
create policy "referrals_member_or_admin_read"
  on need_vendor_referrals for select
  using (
    exists (
      select 1 from needs n
      where n.id = need_vendor_referrals.need_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "referrals_member_insert"
  on need_vendor_referrals for insert
  with check (
    referred_by = auth.uid()
    and exists (
      select 1 from needs n
      join vendors v on v.id = need_vendor_referrals.vendor_id
      where n.id = need_vendor_referrals.need_id
        and v.neighborhood_id = n.neighborhood_id
        and (is_neighborhood_member(n.neighborhood_id) or is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

create policy "referrals_self_or_admin_delete"
  on need_vendor_referrals for delete
  using (
    referred_by = auth.uid()
    or exists (
      select 1 from needs n
      where n.id = need_vendor_referrals.need_id
        and (is_neighborhood_admin(n.neighborhood_id) or is_platform_admin())
    )
  );

-- broadcasts: official updates — member-or-admin read, admin-only write.
create policy "broadcasts_member_or_admin_read"
  on broadcasts for select
  using (
    is_neighborhood_member(broadcasts.neighborhood_id)
    or is_neighborhood_admin(broadcasts.neighborhood_id)
    or is_platform_admin()
  );

create policy "broadcasts_admin_insert"
  on broadcasts for insert
  with check (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

create policy "broadcasts_admin_update"
  on broadcasts for update
  using (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

create policy "broadcasts_admin_delete"
  on broadcasts for delete
  using (is_neighborhood_admin(broadcasts.neighborhood_id) or is_platform_admin());

-- Unlike vendors/neighborhoods/neighborhood_info_items, none of these five
-- tables grant anything to anon — the whole feature is members-only.
grant select, insert, update, delete on neighborhood_members to authenticated;
grant select, insert, update, delete on needs to authenticated;
grant select, insert, delete on need_supporters to authenticated;
grant select, insert, delete on need_vendor_referrals to authenticated;
grant select, insert, update, delete on broadcasts to authenticated;

-- The members of one neighborhood, with email and a derived is_admin flag
-- — callable by that neighborhood's own admins or a platform admin.
-- Direct sibling of list_neighborhood_admins; a plain client-side select
-- can't join auth.users for the email column.
create or replace function public.list_neighborhood_members(p_neighborhood_id uuid)
returns table (user_id uuid, email text, unit text, role text, created_at timestamptz, is_admin boolean)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id, u.email, m.unit, m.role, m.created_at,
         exists (
           select 1 from neighborhood_admins na
           where na.neighborhood_id = p_neighborhood_id and na.user_id = m.user_id
         )
  from neighborhood_members m
  join auth.users u on u.id = m.user_id
  where m.neighborhood_id = p_neighborhood_id
    and (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin())
  order by m.created_at;
$$;
