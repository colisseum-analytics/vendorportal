// Runs on every push to main (see .github/workflows/version-and-backup.yml).
// Bumps the platform version by 0.1, logs it to app_changelog (shown in
// Platform Admin's "Version history"), then exports a full-platform JSON
// backup via the export_platform_backup() RPC and writes it to backup/.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment —
// the service-role key is needed because this runs without a logged-in
// platform admin session (see the matching migration that allows the
// service_role Postgres role to call export_platform_backup()).

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function nextVersion(versions) {
  const numeric = versions.map((v) => parseFloat(v)).filter((n) => Number.isFinite(n))
  const current = numeric.length ? Math.max(...numeric) : 0.9
  return (current + 0.1).toFixed(1)
}

async function main() {
  const { data: existing, error: readError } = await supabase
    .from('app_changelog')
    .select('version')
  if (readError) throw new Error(`Reading app_changelog failed: ${readError.message}`)

  const version = nextVersion((existing || []).map((r) => r.version))
  const summary = (process.env.COMMIT_MESSAGE || 'Automated deploy').split('\n')[0].slice(0, 500)

  const { error: insertError } = await supabase
    .from('app_changelog')
    .insert({ version, summary, created_by: null })
  if (insertError) throw new Error(`Inserting changelog entry failed: ${insertError.message}`)
  console.log(`Logged version ${version}: ${summary}`)

  const { data: backup, error: backupError } = await supabase.rpc('export_platform_backup')
  if (backupError) throw new Error(`export_platform_backup failed: ${backupError.message}`)

  mkdirSync('backup', { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `backup/looplisting-backup-${stamp}-v${version}.json`
  writeFileSync(filename, JSON.stringify(backup, null, 2))
  console.log(`Wrote ${filename}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nfilename=${filename}\n`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
