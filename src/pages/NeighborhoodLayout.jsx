import { useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import NeighborhoodNav from '../components/NeighborhoodNav.jsx'
import ContactAdminModal from '../components/ContactAdminModal.jsx'
import FooterExtras from '../components/FooterExtras.jsx'

export default function NeighborhoodLayout() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [neighborhood, setNeighborhood] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data: n, error: nErr } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!active) return
      if (nErr || !n) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setNeighborhood(n)

      if (user) {
        const [{ data: admin }, { data: platformAdmin }] = await Promise.all([
          supabase
            .from('neighborhood_admins')
            .select('user_id')
            .eq('neighborhood_id', n.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.rpc('is_platform_admin'),
        ])
        if (active) setIsAdmin(!!admin || !!platformAdmin)
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [slug, user])

  if (loading) return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>{t('directory.loadingDirectory')}</div></div>

  if (notFound) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: 60 }}>
          <strong>{t('directory.notFoundTitle')}</strong>
          <Link to="/">← {t('common.backToAllNeighborhoods')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="masthead">
        <div className="masthead-with-logo">
          {neighborhood.logo_url ? (
            <img src={neighborhood.logo_url} alt="" className="masthead-logo" />
          ) : null}
          <div>
            <p className="eyebrow"><Link to="/">{t('common.backToAllNeighborhoods')}</Link> · {t('directory.eyebrow')}</p>
            <h1>{neighborhood.name}</h1>
            {neighborhood.tagline ? <p className="tagline">{neighborhood.tagline}</p> : null}
          </div>
        </div>
        <div className="admin-corner">
          {isAdmin ? (
            <Link className="btn-ghost" to={`/n/${slug}/admin`}>{t('directory.adminDashboard')}</Link>
          ) : user ? (
            <Link className="btn-ghost" to={`/n/${slug}/admin`}>{t('directory.requestAdminAccess')}</Link>
          ) : (
            <Link className="btn-ghost" to={`/login?redirect=/n/${slug}/admin`}>{t('directory.adminLogin')}</Link>
          )}
          <br />
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setContactOpen(true)}>{t('directory.contactAdmins')}</button>
        </div>
      </div>

      <NeighborhoodNav slug={slug} />
      <div className="neighborhood-content">
        <Outlet context={{ neighborhood, isAdmin }} />
      </div>

      <footer className="site-footer">
        {t('directory.footerAskAdmin')}{' '}
        <button type="button" className="footer-link" onClick={() => setContactOpen(true)}>{t('directory.footerAskAdminLink')}</button> {t('directory.footerAskAdminSuffix')}
        <FooterExtras />
      </footer>

      {contactOpen ? (
        <ContactAdminModal neighborhood={neighborhood} onCancel={() => setContactOpen(false)} />
      ) : null}
    </div>
  )
}
