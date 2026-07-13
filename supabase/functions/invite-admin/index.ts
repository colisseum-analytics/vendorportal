// Supabase Edge Function: invite-admin
//
// Called from the admin dashboard when an admin invites a co-admin.
// Two things happen here that can't safely happen in the browser:
//   1. Checking whether the invited email already has an account
//      (needs the service role key — never exposed to the client).
//   2. Actually sending the email (needs the Resend API key — same).
//
// Deploy with:  supabase functions deploy invite-admin
// Configure secrets with:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set SITE_URL=https://your-deployed-site.vercel.app
//   supabase secrets set EMAIL_FROM="Neighborhood Directory <onboarding@resend.dev>"
// (SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// already available automatically — you don't set those yourself.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const { neighborhood_id, neighborhood_slug, neighborhood_name, email } = await req.json()
    if (!neighborhood_id || !neighborhood_slug || !email) {
      return json({ error: 'Missing required fields' }, 400)
    }
    const cleanEmail = String(email).trim().toLowerCase()

    // Scoped to the calling user's own permissions. This insert only
    // succeeds if row-level security says the caller is an admin of
    // this neighborhood — which doubles as our authorization check,
    // so we don't need to duplicate that logic here.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { error: inviteInsertError } = await userClient
      .from('admin_invites')
      .insert({ neighborhood_id, email: cleanEmail })

    if (inviteInsertError) {
      return json({ error: "You don't have admin access to invite people to this neighborhood." }, 403)
    }

    // From here on we use the service role — this key never reaches
    // the browser, only this server-side function.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: existingUserId } = await adminClient.rpc('get_user_id_by_email', { p_email: cleanEmail })

    let status = 'invited'
    if (existingUserId) {
      status = 'added'
      await adminClient
        .from('neighborhood_admins')
        .upsert(
          { neighborhood_id, user_id: existingUserId },
          { onConflict: 'neighborhood_id,user_id', ignoreDuplicates: true }
        )
      // No signup will happen to consume this invite, so clear it now.
      await adminClient.from('admin_invites').delete().eq('neighborhood_id', neighborhood_id).eq('email', cleanEmail)
    }

    const link = `${SITE_URL}/n/${neighborhood_slug}/admin`
    const safeName = escapeHtml(neighborhood_name || 'your neighborhood')
    const subject = status === 'added'
      ? `You're now an admin of ${neighborhood_name}`
      : `You've been invited to help manage ${neighborhood_name}`
    const html = status === 'added'
      ? `<p>You've been added as an admin of the <strong>${safeName}</strong> vendor directory.</p>
         <p><a href="${link}">Open the admin dashboard</a> and log in with this email address (${escapeHtml(cleanEmail)}).</p>`
      : `<p>You've been invited to help manage the <strong>${safeName}</strong> vendor directory.</p>
         <p><a href="${link}">Create an account with this email address</a> (${escapeHtml(cleanEmail)}) and you'll automatically become an admin — no extra steps.</p>`

    let emailSent = false
    if (RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: EMAIL_FROM, to: cleanEmail, subject, html }),
      })
      if (emailRes.ok) {
        emailSent = true
      } else {
        console.error('Resend error:', await emailRes.text())
      }
    } else {
      console.warn('RESEND_API_KEY not set — invite recorded but no email was sent.')
    }

    return json({ status, emailSent })
  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong sending the invite.' }, 500)
  }
})
