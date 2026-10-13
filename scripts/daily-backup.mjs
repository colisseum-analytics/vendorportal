// Runs daily (see .github/workflows/daily-backup.yml): exports the full
// platform JSON via export_platform_backup() and downloads every file in the
// public Storage buckets (logos, flyers) so a lost Supabase project can be
// rebuilt from the backup alone. The workflow then archives and uploads it.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKETS = ['neighborhood-logos', 'vendor-flyers']
const OUT = 'backup'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function listAll(bucket, prefix = '') {
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`Listing ${bucket}/${prefix} failed: ${error.message}`)
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) files.push(...(await listAll(bucket, path)))
      else files.push(path)
    }
    if (data.length < 1000) break
  }
  return files
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)

  const { data: backup, error } = await supabase.rpc('export_platform_backup')
  if (error) throw new Error(`export_platform_backup failed: ${error.message}`)
  writeFileSync(join(OUT, `looplisting-${stamp}.json`), JSON.stringify(backup, null, 2))
  console.log(`Wrote database backup (${Object.keys(backup).length} sections).`)

  let fileCount = 0
  for (const bucket of BUCKETS) {
    for (const path of await listAll(bucket)) {
      const { data, error: dlError } = await supabase.storage.from(bucket).download(path)
      if (dlError) throw new Error(`Downloading ${bucket}/${path} failed: ${dlError.message}`)
      const dest = join(OUT, 'storage', bucket, path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, Buffer.from(await data.arrayBuffer()))
      fileCount++
    }
  }
  console.log(`Downloaded ${fileCount} storage file(s).`)
  mkdirSync(join(OUT, 'storage'), { recursive: true })
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
