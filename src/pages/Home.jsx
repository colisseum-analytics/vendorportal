import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import { stateForCity } from '../utils/usCities'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function Home() {
  const { t } = useLanguage()
  usePageMeta({ description: t('home.subtitle') })
  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendorCounts, setVendorCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const [{ data: n, error }, { data: v }] = await Promise.all([
        supabase.from('neighborhoods').select('id, slug, name, tagline, logo_url, city, active').order('name'),
        supabase.from('vendors').select('neighborhood_id'),
      ])
      if (!active) return
      if (!error) setNeighborhoods((n || []).filter((row) => row.active))
      const counts = {}
      for (const row of v || []) counts[row.neighborhood_id] = (counts[row.neighborhood_id] || 0) + 1
      setVendorCounts(counts)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = neighborhoods.filter((n) =>
    (n.name + ' ' + (n.tagline || '')).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
          <p className="tagline tagline-strong">{t('home.subtitle')}</p>
          <p className="tagline">{t('home.subtitleSupport')}</p>
          <ul className="tagline-list">
            <li>{t('home.subtitleBullet1')}</li>
            <li>{t('home.subtitleBullet2')}</li>
            <li>{t('home.subtitleBullet3')}</li>
          </ul>
        </div>
      </div>

      <div className="controls home-controls-grid">
        <div className="search-box">
          <input type="text" placeholder={t('home.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link className="btn-ghost" to="/browse">{t('home.browseAll')}</Link>
      </div>

      {loading ? (
        <div className="empty">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <strong>{t('home.emptyTitle')}</strong>
          {t('home.emptyBody')}
        </div>
      ) : (
        <div className="n-list">
          {filtered.map((n) => (
            <Link key={n.id} to={`/n/${n.slug}`} className="n-row">
              <div className="n-row-main">
                {n.logo_url ? (
                  <img src={n.logo_url} alt="" className="n-logo" />
                ) : (
                  <div className="n-logo n-logo-placeholder">{n.name?.[0]?.toUpperCase() || '?'}</div>
                )}
                <div>
                  <h3>{n.name}</h3>
                  {n.tagline ? <p>{n.tagline}</p> : null}
                  <p className="n-row-meta">
                    {n.city ? `${n.city}${stateForCity(n.city) ? `, ${stateForCity(n.city)}` : ''} · ` : ''}
                    {t(
                      vendorCounts[n.id] === 1 ? 'home.vendorCountOne' : 'home.vendorCountOther',
                      { count: vendorCounts[n.id] || 0 }
                    )}
                  </p>
                </div>
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="cta-banner-row">
        <div className="cta-banner cta-banner-compact">
          <div>
            <h2>{t('home.ctaTitle')}</h2>
            <p>{t('home.ctaBody')}</p>
          </div>
          <Link className="btn-invert" to="/new">{t('home.ctaButton')}</Link>
        </div>

        <div className="cta-banner cta-banner-compact cta-banner-terra">
          <div>
            <h2>{t('home.managerCtaTitle')}</h2>
            <p>{t('home.managerCtaBody')}</p>
          </div>
          <Link className="btn-invert" to="/new">{t('home.managerCtaButton')}</Link>
        </div>
      </div>

      <footer className="site-footer">
        {t('footer.tagline')}
        <FooterExtras />
      </footer>
    </div>
  )
}
