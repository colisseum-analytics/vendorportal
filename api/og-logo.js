import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Two independent problems, both fixed here:
// 1. Supabase Storage's CDN sends "X-Robots-Tag: none" on every object it
//    serves, which link-preview bots (confirmed with WhatsApp) treat as
//    "don't use this as a preview image" and silently drop — even though
//    the image loads fine in a browser. Re-serving the bytes from our own
//    domain sidesteps that header entirely, since we set our own headers.
// 2. Admin-uploaded logos can be tiny (seen as small as 102x81) and/or
//    transparent — most platforms silently ignore preview images below
//    roughly 200x200, and transparency renders as white corners. Padding
//    every logo onto a fixed-size opaque canvas fixes both, for every
//    neighborhood, without relying on admins to know image requirements.
const MIN_SIZE = 400

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

  const inputBuffer = Buffer.from(await upstream.arrayBuffer())
  const metadata = await sharp(inputBuffer).metadata()
  const needsNormalizing = (metadata.width ?? 0) < MIN_SIZE || (metadata.height ?? 0) < MIN_SIZE || metadata.hasAlpha

  const outputBuffer = needsNormalizing
    ? await sharp(inputBuffer)
        .resize(MIN_SIZE, MIN_SIZE, { fit: 'contain', background: '#FFFFFF' })
        .flatten({ background: '#FFFFFF' })
        .jpeg({ quality: 90 })
        .toBuffer()
    : inputBuffer

  res.setHeader('Content-Type', needsNormalizing ? 'image/jpeg' : (upstream.headers.get('content-type') || 'image/png'))
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(outputBuffer)
}
