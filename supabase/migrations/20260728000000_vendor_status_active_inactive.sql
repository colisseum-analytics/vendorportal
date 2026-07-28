-- Vendor status relabeled Open/Closed/Seasonal -> Active/Inactive.
-- Migrates existing data and updates the column default for new rows.

update vendors set status = 'Active' where status = 'Open';
update vendors set status = 'Inactive' where status in ('Closed', 'Seasonal');
alter table vendors alter column status set default 'Active';
