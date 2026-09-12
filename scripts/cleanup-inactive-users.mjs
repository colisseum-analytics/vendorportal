// Runs daily (see .github/workflows/inactive-user-cleanup.yml) to automate
// two of the buckets shown, for manual bulk-delete, on the Platform admin
// Users page:
//   - "Never completed sign-in": deleted after 7 days.
//   - "Signed in, no activity": warned by email once inactive for 13 days,
//     deleted at 20 days if they haven't signed back in since.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (same secrets the
// version-and-backup workflow already uses). RESEND_API_KEY/EMAIL_FROM are
// optional — without them the inactivity warning is skipped (logged, not
// fatal) but never-signed-in/already-warned deletions still run, matching
// how invite-admin degrades when RESEND_API_KEY isn't set.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function sendWarningEmail(email) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping warning email to ${email}.`)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your LoopListing account will be removed in 7 days',
      html: `<p>Your account hasn't had any activity since you signed in, and inactive accounts are removed after 20 days.</p>
             <p>Sign in any time in the next 7 days to keep your account — no other action is needed.</p>`,
    }),
  })
  if (!res.ok) {
    console.error('Resend error:', await res.text())
    return false
  }
  return true
}

async function main() {
  let didSomething = false

  const { data: neverSignedIn, error: e1 } = await supabase.rpc('list_never_signed_in_candidates')
  if (e1) throw new Error(`list_never_signed_in_candidates failed: ${e1.message}`)
  if (neverSignedIn?.length) {
    didSomething = true
    const { error } = await supabase.rpc('delete_user_accounts', { p_user_ids: neverSignedIn.map((u) => u.user_id) })
    if (error) throw new Error(`Deleting never-signed-in accounts failed: ${error.message}`)
    console.log(`Deleted ${neverSignedIn.length} never-signed-in account(s).`)
  }

  const { data: toWarn, error: e2 } = await supabase.rpc('list_inactive_warn_candidates')
  if (e2) throw new Error(`list_inactive_warn_candidates failed: ${e2.message}`)
  for (const u of toWarn || []) {
    didSomething = true
    const sent = await sendWarningEmail(u.email)
    const { error } = await supabase.rpc('record_inactivity_warning', {
      p_user_id: u.user_id,
      p_last_sign_in_at: u.last_sign_in_at,
    })
    if (error) console.error(`record_inactivity_warning failed for ${u.email}: ${error.message}`)
    else console.log(`Warned ${u.email}${sent ? '' : ' (email not sent — see warning above)'}.`)
  }

  const { data: toDelete, error: e3 } = await supabase.rpc('list_inactive_delete_candidates')
  if (e3) throw new Error(`list_inactive_delete_candidates failed: ${e3.message}`)
  if (toDelete?.length) {
    didSomething = true
    const { error } = await supabase.rpc('delete_user_accounts', { p_user_ids: toDelete.map((u) => u.user_id) })
    if (error) throw new Error(`Deleting inactive accounts failed: ${error.message}`)
    console.log(`Deleted ${toDelete.length} inactive account(s) after warning.`)
  }

  if (!didSomething) console.log('Nothing to do today.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
