// Supabase Edge Function: extract-info-items
//
// Called from the Community Info admin page's "Import from document" flow.
// Parses an uploaded PDF/Word/text file and asks Claude to extract discrete
// HOA-contact/service/emergency/FAQ items, classified into the same 4
// sections the neighborhood_info_items table uses. This never writes to the
// database itself — it only returns candidate items for the admin to review
// and edit in the browser, which then inserts them through the same
// RLS-protected path every other admin edit already uses
// (info_items_admin_insert in schema.sql).
//
// Deploy with:  supabase functions deploy extract-info-items
// Configure secrets with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
// (SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// already available automatically — you don't set those yourself.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { extractText } from 'npm:unpdf@0.11.0'
import mammoth from 'npm:mammoth@1.8.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const MODEL = 'claude-sonnet-5'
const SECTIONS = ['hoa_contacts', 'community_services', 'emergency', 'faq']

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

async function extractTextFromFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt')) return await file.text()
  if (name.endsWith('.pdf')) {
    const buf = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(buf, { mergePages: true })
    return Array.isArray(text) ? text.join('\n\n') : text
  }
  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer })
    return value
  }
  return null
}

// Forces a structured response instead of freeform prose — the browser
// gets a guaranteed-shaped array to render as an editable review table.
const EXTRACTION_TOOL = {
  name: 'extract_items',
  description: 'Extract discrete community-info items from the document text.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section: { type: 'string', enum: SECTIONS },
            subsection: { type: ['string', 'null'] },
            title: { type: 'string' },
            body: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
            website: { type: ['string', 'null'] },
            category: { type: ['string', 'null'] },
          },
          required: ['section', 'title'],
        },
      },
    },
    required: ['items'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const form = await req.formData()
    const file = form.get('file')
    const neighborhoodId = form.get('neighborhood_id')
    const categoriesRaw = form.get('categories') // JSON-encoded string array, optional
    if (!file || !neighborhoodId) return json({ error: 'Missing file or neighborhood_id' }, 400)

    let categories = []
    try { categories = categoriesRaw ? JSON.parse(String(categoriesRaw)) : [] } catch { /* ignore malformed */ }

    // Scoped to the caller's own permissions — same authorization pattern
    // as invite-admin: this doubles as our "are they really an admin of
    // this neighborhood" check, so LLM budget can't be spent by anyone
    // who just has an account.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Not signed in.' }, 401)

    const [{ data: adminRow }, { data: isPlatformAdmin }] = await Promise.all([
      userClient
        .from('neighborhood_admins')
        .select('user_id')
        .eq('neighborhood_id', neighborhoodId)
        .eq('user_id', userData.user.id)
        .maybeSingle(),
      userClient.rpc('is_platform_admin'),
    ])
    if (!adminRow && !isPlatformAdmin) {
      return json({ error: "You don't have admin access to this neighborhood." }, 403)
    }

    if (!ANTHROPIC_API_KEY) {
      return json({ error: 'Document import is not configured yet — ask the site owner to set ANTHROPIC_API_KEY.' }, 500)
    }

    const text = await extractTextFromFile(file)
    if (!text || text.trim().length < 20) {
      return json({ error: "This file doesn't seem to have extractable text — scanned/image-only PDFs aren't supported yet." }, 422)
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: `You extract discrete community-info items from an HOA/condo document for a resident directory app. Only use information actually present in the text — never invent names, numbers, or details that aren't there. Split multi-topic content into separate atomic items rather than one giant blob. Classify every item into exactly one section: hoa_contacts (association/management/board contacts), community_services (utilities, trash, cable, internet, etc.), emergency (emergency/after-hours numbers), or faq (question-and-answer style content). For faq items only, "category" may link to one of these existing vendor categories if genuinely relevant: ${categories.length ? categories.join(', ') : '(none configured)'} — leave it null otherwise, and never invent a category that isn't in that list.`,
        messages: [{ role: 'user', content: `Extract items from this document:\n\n${text.slice(0, 100000)}` }],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'extract_items' },
      }),
    })

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', await anthropicRes.text())
      return json({ error: 'The extraction service had a problem — try again in a moment.' }, 502)
    }

    const anthropicData = await anthropicRes.json()
    const toolUse = anthropicData.content?.find((b) => b.type === 'tool_use')
    const items = toolUse?.input?.items || []

    return json({ items })
  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong analyzing that document.' }, 500)
  }
})
