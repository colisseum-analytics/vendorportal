import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import VendorCard from '../components/VendorCard.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import ContactAdminModal from '../components/ContactAdminModal.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import Pagination from '../components/Pagination.jsx'
import { useVendorView } from '../hooks/useVendorView.js'
import { colorForCategory } from '../utils/categoryColor'
import { relativeTime } from '../utils/relativeTime'

const PAGE_SIZE = 25

export default function NeighborhoodDirectory() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [neighborhood, setNeighborhood] = useState(null)
  const [vendors, setVendors] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [view, setView] = useVendorView()
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

      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .eq('neighborhood_id', n.id)
        .order('name')
      if (!active) return
      setVendors(v || [])

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
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [slug, user])

  const filtered = useMemo(() => {
    return vendors
      .filter((v) => category === 'All' || v.category === category)
      .filter((v) => status === 'All' || v.status === status)
      .filter((v) => {
        if (!search) return true
        const hay = `${v.name} ${v.category} ${v.specialty || ''} ${v.address || ''} ${v.description || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [vendors, category, status, search])

  useEffect(() => {
    setPage(1)
  }, [category, status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

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

  const categories = neighborhood.categories || []
  const residentCount = vendors.filter((v) => v.is_resident).length
  const lastAdded = vendors.reduce((max, v) => (!max || v.created_at > max ? v.created_at : max), null)

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

      <div className="stats-row">
        <div className="stat-item"><strong>{vendors.length}</strong><span>{vendors.length === 1 ? t('directory.statVendors') : t('directory.statVendorsPlural')}</span></div>
        <div className="stat-item"><strong>{categories.length}</strong><span>{categories.length === 1 ? t('directory.statCategory') : t('directory.statCategoriesPlural')}</span></div>
        <div className="stat-item"><strong>{residentCount}</strong><span>{t('directory.statResidentRecommended')}</span></div>
        {lastAdded ? <div className="stat-item"><strong>{relativeTime(lastAdded)}</strong><span>{t('directory.statLastAdded')}</span></div> : null}
      </div>

      <div className="controls controls-compact">
        <div className="search-box search-box-compact">
          <input type="text" placeholder={t('directory.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="status-toggle">
          {['All', 'Verified', 'Unknown'].map((s) => (
            <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>{t(`directory.status${s}`)}</button>
          ))}
        </div>
      </div>
      <div className="chip-row">
        {['All', ...categories].map((c) => (
          <span key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c !== 'All' ? <span className="chip-dot" style={{ background: colorForCategory(categories, c) }} /> : null}
            {c === 'All' ? t('directory.statusAll') : c}
          </span>
        ))}
      </div>
      <div className="count-row-with-action">
        <div className="count-row">
          {t(vendors.length === 1 ? 'directory.showingOne' : 'directory.showingOther', { shown: filtered.length, total: vendors.length })}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>{t('directory.emptyNothingYetTitle')}</strong>
          {vendors.length === 0 ? t('directory.emptyNothingYetNoVendors') : t('directory.emptyNothingYetNoMatch')}
        </div>
      ) : (
        <div className={`grid ${view === 'list' ? 'list-view' : ''}`}>
          {pageItems.map((v) => <VendorCard key={v.id} vendor={v} categories={categories} isAdmin={false} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

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
