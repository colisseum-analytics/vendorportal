-- The automated version+backup workflow reads/writes app_changelog and
-- reads backup_log directly via PostgREST using the service-role key,
-- which turned out not to carry the blanket grants this project expected
-- (confirmed live: "permission denied for table app_changelog" even with
-- a genuine secret/service-role key). Grant it explicitly rather than
-- relying on implicit service_role privileges.

grant select, insert, delete on app_changelog to service_role;
grant select on backup_log to service_role;
