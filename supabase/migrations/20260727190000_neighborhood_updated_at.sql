-- Tracks when a neighborhood's row was last edited (name, tagline,
-- categories, logo, active/inactive) — powers "last updated" in the
-- platform admin view.

alter table neighborhoods add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_neighborhood_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_neighborhood_updated on neighborhoods;
create trigger on_neighborhood_updated
  before update on neighborhoods
  for each row execute function touch_neighborhood_updated_at();
