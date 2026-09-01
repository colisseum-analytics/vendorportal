import { next } from '@vercel/edge'

// Social/chat link-unfurlers (Facebook, Twitter/X, Slack, LinkedIn, etc.)
// don't execute JavaScript, so they never see the per-neighborhood title,
// description, and logo that usePageMeta() sets client-side — they only
// ever get index.html's generic sitewide tags. This middleware detects
// those known bots and serves them a lightweight, server-rendered HTML
// response with the real neighborhood's meta tags already baked in.
// Real visitors are untouched — they always get the normal SPA.
//
// This is Google's documented "dynamic rendering" pattern: bots get an
// equivalent, server-rendered view of the same content a browser would
// eventually render, not different content (not cloaking).
const BOT_UA_PATTERN = /facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|redditbot|Pinterest|Googlebot|bingbot|Applebot/i

const SITE_URL = 'https://looplisting.com'
const SITE_NAME = 'LoopListing'
const DEFAULT_IMAGE = 'https://looplisting.com/og-image.jpg'

export const config = {
  matcher: '/n/:slug',
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function renderHtml({ title, description, image, url }) {
  const fullTitle = `${escapeHtml(title)} · ${SITE_NAME}`
  const desc = escapeHtml(description)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${fullTitle}">
<meta name="twitter:description" content="${desc}">
<link rel="canonical" href="${escapeHtml(url)}">
</head>
<body></body>
</html>`
}

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || ''
  if (!BOT_UA_PATTERN.test(userAgent)) return next()

  const url = new URL(request.url)
  const match = url.pathname.match(/^\/n\/([^/]+)\/?$/)
  if (!match) return next()
  const slug = match[1]

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${supabaseUrl}/rest/v1/neighborhoods?select=name,tagline,logo_url,community_type&slug=eq.${encodeURIComponent(slug)}&active=eq.true&limit=1`,
      { headers: { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` } }
    )
    if (!res.ok) return next()
    const rows = await res.json()
    const n = rows[0]
    if (!n) return next()

    const description = n.tagline
      || (n.community_type === 'hoa' ? `Resident-recommended vendors for the ${n.name} HOA.`
        : n.community_type === 'condo' ? `Resident-recommended vendors for the ${n.name} condo community.`
        : `Resident-recommended vendors for ${n.name}.`)

    const html = renderHtml({
      title: n.name,
      description,
      // Proxied through our own domain instead of linking Supabase Storage
      // directly — its CDN sends X-Robots-Tag: none, which link-preview
      // bots respect and silently ignore as an image source.
      image: n.logo_url ? `${SITE_URL}/api/og-logo?slug=${encodeURIComponent(slug)}` : DEFAULT_IMAGE,
      url: `${SITE_URL}${url.pathname}`,
    })

    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  } catch {
    // Fail open — never let a middleware bug block a real request.
    return next()
  }
}
