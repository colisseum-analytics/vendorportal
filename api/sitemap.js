import { createClient } from '@supabase/supabase-js'

// Vercel serverless function, wired up in vercel.json to serve at /sitemap.xml.
// Queries live rather than being generated at build time, so newly created
// neighborhoods show up immediately without waiting on a redeploy.
const SITE_URL = 'https://looplisting.com'

const STATIC_URLS = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/browse`, changefreq: 'daily', priority: '0.8' },
]

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

export default async function handler(req, res) {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

  const { data: neighborhoods, error } = await supabase
    .from('neighborhoods')
    .select('slug, active, created_at')
    .eq('active', true)

  if (error) {
    res.status(500).send('Error generating sitemap')
    return
  }

  const neighborhoodUrls = (neighborhoods || []).map((n) =>
    urlEntry({
      loc: `${SITE_URL}/n/${n.slug}`,
      lastmod: n.created_at ? n.created_at.split('T')[0] : undefined,
      changefreq: 'daily',
      priority: '0.9',
    })
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${STATIC_URLS.map(urlEntry).join('\n')}\n${neighborhoodUrls.join('\n')}\n</urlset>\n`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
