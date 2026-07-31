-- Contact messages sent before a neighborhood exists yet (e.g. someone
-- outside Florida asking about bringing the app to their state) have no
-- neighborhood to attach to. Allow neighborhood_id to be null for those;
-- contact_messages_admin_read/update/delete already grant platform admins
-- read/write access to every row via is_platform_admin(), so nothing else
-- needs to change for them to see and resolve these.
alter table contact_messages alter column neighborhood_id drop not null;
