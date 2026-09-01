import { useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import NeighborhoodSidebar from '../components/NeighborhoodSidebar.jsx'
import ContactAdminModal from '../components/ContactAdminModal.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function NeighborhoodLayout() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [neighborhood, setNeighborhood] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [membershipRole, setMembershipRole] = useState(null)
  const [membershipUnit, setMembershipUnit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [neighborhoodReloadKey, setMembershipReloadKey] = useState(0)

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
        const [{ data: admin }, { data: platformAdmin }, { data: member }] = await Promise.all([
          supabase
            .from('neighborhood_admins')
            .select('user_id')
            .eq('neighborhood_id', n.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.rpc('is_platform_admin'),
          supabase
            .from('neighborhood_members')
            .select('unit, role')
            .eq('neighborhood_id', n.id)
            .eq('user_id', user.id)
            .maybeSingle(),
        ])
        if (active) {
          setIsAdmin(!!admin || !!platformAdmin)
          setIsMember(!!member)
          setMembershipRole(member?.role ?? null)
          setMembershipUnit(member?.unit ?? null)
        }
      } else {
        setIsAdmin(false)
        setIsMember(false)
        setMembershipRole(null)
        setMembershipUnit(null)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [slug, user, neighborhoodReloadKey])

  const reloadNeighborhood = () => setMembershipReloadKey((k) => k + 1)

  usePageMeta({ title: t('directory.notFoundTitle'), noindex: true, skip: !notFound })

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
    <div className="neighborhood-shell">
      <NeighborhoodSidebar isAdmin={isAdmin} user={user} onContactAdmins={() => setContactOpen(true)} />
      <div className="neighborhood-shell-content">
        <div className="wrap">
          <div className="masthead">
            <div className="masthead-with-logo">
              {neighborhood.logo_url ? (
                <img src={neighborhood.logo_url} alt="" className="masthead-logo" />
              ) : null}
              <div>
                <p className="eyebrow"><Link to="/">{t('common.backToAllNeighborhoods')}</Link> · {t('directory.eyebrow')}</p>
                <h1>
                  {neighborhood.name}
                  {neighborhood.community_type ? (
                    <span className="badge badge-neutral" style={{ marginLeft: 10, verticalAlign: 'middle' }}>
                      {t(`createNeighborhood.communityTypeLabels.${neighborhood.community_type}`)}
                    </span>
                  ) : null}
                </h1>
                {neighborhood.tagline ? <p className="tagline">{neighborhood.tagline}</p> : null}
              </div>
            </div>
            {!isAdmin && user ? (
              <div className="admin-corner">
                <Link className="btn-ghost" to={`/n/${slug}/admin`}>{t('directory.requestAdminAccess')}</Link>
              </div>
            ) : null}
          </div>

          <div className="neighborhood-content">
            <Outlet context={{ neighborhood, isAdmin, isMember, membershipRole, membershipUnit, reloadNeighborhood }} />
          </div>

          <footer className="site-footer">
            <p className="footer-feedback">
              {t('directory.footerAskAdmin')}{' '}
              <button type="button" className="footer-link" onClick={() => setContactOpen(true)}>{t('directory.footerAskAdminLink')}</button> {t('directory.footerAskAdminSuffix')}
            </p>
            <FooterExtras />
          </footer>

          {contactOpen ? (
            <ContactAdminModal neighborhood={neighborhood} membershipUnit={membershipUnit} onCancel={() => setContactOpen(false)} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
