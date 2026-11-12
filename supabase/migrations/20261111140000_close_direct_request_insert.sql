-- Step 2 of 2 — run ONLY after the new request form is deployed and a test
-- signup has gone through submit_neighborhood_request() successfully.
-- (Running it earlier breaks the old form, which writes to the table directly.)
--
-- Removes the open door: visitors can no longer insert into
-- neighborhood_requests themselves; the only way in is the checked function.
-- Safe to re-run.

drop policy if exists "requests_public_insert" on neighborhood_requests;
revoke insert on neighborhood_requests from anon, authenticated;
