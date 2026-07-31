import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import { stateForCity } from '../utils/usCities'

export default function Home() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendorCounts, setVendorCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [adMessage] = useState(() => (Math.random() < 0.5 ? 'adMessage1' : 'adMessage2'))

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

  useEffect(() => {
    if (!user) { setIsPlatformAdmin(false); return }
    let active = true
    supabase.rpc('is_platform_admin').then(({ data }) => {
      if (active) setIsPlatformAdmin(!!data)
    })
    return () => { active = false }
  }, [user])

  const filtered = neighborhoods.filter((n) =>
    (n.name + ' ' + (n.tagline || '')).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
          <p className="tagline">{t('home.subtitle')}</p>
        </div>
        <div className="admin-corner">
          {user ? (
            <>
              <div className="admin-pill"><span className="dot" />{user.email}</div><br />
              {isPlatformAdmin ? <Link className="btn-ghost" to="/platform-admin" style={{ marginRight: 6 }}>{t('nav.platformAdmin')}</Link> : null}
              <button className="btn-ghost" onClick={signOut}>{t('nav.logOut')}</button>
            </>
          ) : (
            <Link className="btn-ghost" to="/login">{t('nav.logIn')}</Link>
          )}
        </div>
      </div>

      <div className="cta-grid">
        <div className="cta-banner">
          <div>
            <h2>{t('home.ctaTitle')}</h2>
            <p>{t('home.ctaBody')}</p>
          </div>
          <Link className="btn-invert" to="/new">{t('home.ctaButton')}</Link>
        </div>
        <div className="cta-banner ad-banner">
          <div>
            {adMessage === 'adMessage2' ? (
              <>
                <h2>{t('home.adMessage2Title')}</h2>
                <p>{t('home.adMessage2Body')}</p>
              </>
            ) : (
              <p className="ad-banner-solo">{t('home.adMessage1')}</p>
            )}
          </div>
          <Link className="btn-invert" to="/new">{t('home.adCta')}</Link>
        </div>
      </div>

      <div className="controls">
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

      <footer className="site-footer">
        {t('footer.tagline')}
        <FooterExtras />
      </footer>
    </div>
  )
}
