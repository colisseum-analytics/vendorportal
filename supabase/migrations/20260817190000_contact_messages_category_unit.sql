-- The redesigned "Contact the admins" modal now asks the sender to pick
-- Issue vs Idea up front (mirroring Supabase's own feedback widget), and
-- captures their unit at time of submission. Both are nullable since
-- existing rows predate this and have neither.

alter table contact_messages add column category text check (category in ('issue', 'idea'));
alter table contact_messages add column unit text;
