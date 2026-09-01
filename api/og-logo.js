import { createClient } from '@supabase/supabase-js'

// Supabase Storage's CDN sends "X-Robots-Tag: none" on every object it
// serves, which link-preview bots (confirmed with WhatsApp) treat as "don't
// use this as a preview image" and silently drop — even though the image
// itself loads fine in a browser. Re-serving the bytes from our own domain
// sidesteps that header entirely, since we set our own response headers.
export default async function handler(req, res) {
  const slug = req.query.slug
  if (!slug || Array.isArray(slug)) {
    res.status(400).send('Missing slug')
    return
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('logo_url')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error || !data?.logo_url) {
    res.status(404).send('Not found')
    return
  }

  const upstream = await fetch(data.logo_url)
  if (!upstream.ok) {
    res.status(502).send('Upstream error')
    return
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(buffer)
}
