-- The public "Feedback" form already requires the visitor to be logged
-- in (email OTP) before the UI lets them submit, but the old RLS policy
-- ("with check (true)", granted to anon) didn't enforce that at the
-- database level — anyone could bypass the UI and POST straight to the
-- REST API. That's almost certainly the source of the anonymous "General
-- inquiry" spam showing up under Platform admin → Messages. This closes
-- that gap: only an authenticated session can insert a contact_messages
-- row now, matching what the UI already implied.

drop policy "contact_messages_public_insert" on contact_messages;

create policy "contact_messages_authenticated_insert"
  on contact_messages for insert
  to authenticated
  with check (auth.uid() is not null);

revoke insert on contact_messages from anon;
