-- One-time cleanup: write vendor phone numbers as 786-361-8563.
-- Safe to re-run. Only rewrites numbers that are clearly 10 digits (or 11 with
-- a leading 1); anything else is left as is. Skips vendors whose name is a
-- single word (no last name) — those are being reviewed separately.
update vendors
set phone = substr(d, 1, 3) || '-' || substr(d, 4, 3) || '-' || substr(d, 7, 4)
from (
  select id,
         case when length(digits) = 11 and left(digits, 1) = '1' then substr(digits, 2) else digits end as d
  from (select id, regexp_replace(phone, '\D', '', 'g') as digits from vendors where phone is not null) x
) f
where vendors.id = f.id
  and length(f.d) = 10
  and vendors.phone !~ '[A-Za-z]'
  and vendors.phone is distinct from substr(f.d, 1, 3) || '-' || substr(f.d, 4, 3) || '-' || substr(f.d, 7, 4)
  and position(' ' in btrim(vendors.name)) > 0;
