-- Lets a platform admin delete individual backup_log entries (the audit
-- record of when a backup was taken, not the backup file itself — no
-- backup file is stored server-side; it's either downloaded client-side
-- or uploaded as a GitHub Actions artifact) from the new Backups page,
-- to prune redundant history.

create policy "backup_log_platform_admin_delete"
  on backup_log for delete
  using (is_platform_admin());

grant delete on backup_log to authenticated;
