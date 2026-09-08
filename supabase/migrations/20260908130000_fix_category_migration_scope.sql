-- Corrects a scoping mistake in 20260908120000_vendor_categories_array.sql:
-- that migration's vendor mapping was computed from the whole `vendors`
-- table instead of filtering to Antilles at Islands at Doral, so it also
-- tagged vendors belonging to the platform's other (inactive demo)
-- neighborhoods — Doral Landings East and Orange Tree — with Antilles'
-- new granular category names. Those neighborhoods' own `neighborhoods.
-- categories` lists were correctly left untouched, so this left their
-- vendors referencing category names that don't exist in their own
-- neighborhood's selectable list.
--
-- Resets `categories` back to a single-element array from the untouched
-- `category` column for every vendor outside Antilles, i.e. undoes the
-- mistake without touching Antilles' verified data.
update vendors
set categories = jsonb_build_array(category)
where neighborhood_id <> (select id from neighborhoods where slug = 'antilles-at-islands-at-doral')
  and category is not null;

update vendors
set categories = '[]'::jsonb
where neighborhood_id <> (select id from neighborhoods where slug = 'antilles-at-islands-at-doral')
  and category is null;
