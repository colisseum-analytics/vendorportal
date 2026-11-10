-- Counts taps on a vendor's phone number ("call") and website link
-- ("website"). Purely additive: one new table and two functions; nothing
-- existing is changed, and it is safe to re-run.
--
-- Stored as one counter per vendor per day per kind rather than one row per
-- click, so the table stays small and holds no information about who
-- clicked. Anonymous visitors can only bump a counter through
-- record_vendor_click(); the table itself has no policies, so nobody can
-- read or write it directly. Community admins read totals through
-- vendor_click_summary().

create table if not exists vendor_click_counts (
  vendor_id uuid not null references vendors(id) on delete cascade,
  neighborhood_id uuid not null references neighborhoods(id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('call', 'website')),
  clicks integer not null default 0,
  primary key (vendor_id, day, kind)
);

create index if not exists vendor_click_counts_neighborhood_idx on vendor_click_counts(neighborhood_id);

alter table vendor_click_counts enable row level security;

create or replace function public.record_vendor_click(p_vendor_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_neighborhood uuid;
begin
  if p_kind not in ('call', 'website') then
    return;
  end if;
  select neighborhood_id into v_neighborhood from vendors where id = p_vendor_id;
  if v_neighborhood is null then
    return;
  end if;
  insert into vendor_click_counts (vendor_id, neighborhood_id, day, kind, clicks)
  values (p_vendor_id, v_neighborhood, current_date, p_kind, 1)
  on conflict (vendor_id, day, kind) do update set clicks = vendor_click_counts.clicks + 1;
end;
$$;

grant execute on function public.record_vendor_click(uuid, text) to anon, authenticated;

-- Admin-only: last 30 days and all-time totals per vendor and kind.
-- Returns nothing for anyone who isn't an admin of that neighborhood.
create or replace function public.vendor_click_summary(p_neighborhood_id uuid)
returns table (vendor_id uuid, kind text, last_30 bigint, total bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.vendor_id,
    c.kind,
    coalesce(sum(c.clicks) filter (where c.day > current_date - 30), 0)::bigint as last_30,
    sum(c.clicks)::bigint as total
  from vendor_click_counts c
  where c.neighborhood_id = p_neighborhood_id
    and (is_neighborhood_admin(p_neighborhood_id) or is_platform_admin())
  group by c.vendor_id, c.kind;
$$;

grant execute on function public.vendor_click_summary(uuid) to authenticated;
