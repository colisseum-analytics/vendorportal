import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import { colorForCategory } from '../utils/categoryColor'
import VendorCard from '../components/VendorCard.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import FilterPill from '../components/FilterPill.jsx'
import { useVendorView } from '../hooks/useVendorView.js'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

const STATUS_OPTIONS = ['Verified', 'Unknown']

// The og-logo proxy URL is otherwise stable per neighborhood, so nothing
// signals to our own CDN or a social platform's own preview cache that the
// logo changed after a re-upload — both would keep serving stale bytes
// indefinitely. Baking a token derived from the current logo_url into the
// URL forces a fresh fetch whenever it actually changes.
function versionToken(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

export default function NeighborhoodDirectory() {
  const { neighborhood } = useOutletContext()
  const { t, tCategory } = useLanguage()
  const metaDescriptionKey = neighborhood.community_type === 'hoa'
    ? 'directory.metaDescriptionFallbackHoa'
    : neighborhood.community_type === 'condo'
    ? 'directory.metaDescriptionFallbackCondo'
    : 'directory.metaDescriptionFallback'
  usePageMeta({
    title: neighborhood.name,
    description: neighborhood.tagline || t(metaDescriptionKey, { name: neighborhood.name }),
    // Proxied through our own domain — Supabase Storage's CDN sends
    // X-Robots-Tag: none, which link-preview bots treat as "don't use this
    // as an image" and silently ignore.
    image: neighborhood.logo_url ? `https://looplisting.com/api/og-logo?slug=${neighborhood.slug}&v=${versionToken(neighborhood.logo_url)}` : undefined,
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(() => searchParams.get('category') || null)
  const [status, setStatus] = useState(null)
  const [view, setView] = useVendorView()

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .eq('neighborhood_id', neighborhood.id)
        .order('name')
      if (!active) return
      setVendors(v || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [neighborhood.id])

  const filtered = useMemo(() => {
    return vendors
      .filter((v) => !category || v.category === category)
      .filter((v) => !status || v.status === status)
      .filter((v) => {
        if (!search) return true
        const hay = `${v.name} ${v.category} ${v.specialty || ''} ${v.address || ''} ${v.description || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [vendors, category, status, search])

  const categories = neighborhood.categories || []
  const residentCount = vendors.filter((v) => v.is_resident).length
  const lastAdded = vendors.reduce((max, v) => (!max || v.created_at > max ? v.created_at : max), null)

  const renderCategoryOption = (cat) => (
    <>
      <span className="filter-pill-dot" style={{ background: colorForCategory(categories, cat) }} />
      {tCategory(cat)}
    </>
  )

  if (loading) return <div className="empty" style={{ marginTop: 20 }}>{t('directory.loadingDirectory')}</div>

  return (
    <div>
      <div className="controls controls-compact">
        <div className="search-box search-box-compact">
          <input type="text" placeholder={t('directory.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pill-row">
          <FilterPill label={t('browse.filterCategory')} options={categories} value={category} onChange={setCategory} renderOption={renderCategoryOption} />
          <FilterPill label={t('browse.filterStatus')} options={STATUS_OPTIONS} value={status} onChange={setStatus} renderOption={(o) => t(`directory.status${o}`)} />
          {status || category ? (
            <button type="button" className="filter-reset-btn" onClick={() => { setStatus(null); setCategory(null) }}>
              {t('browse.reset')} ×
            </button>
          ) : null}
        </div>
        <div className="stats-compact stats-compact-inline">
          <span><strong>{vendors.length}</strong> {vendors.length === 1 ? t('directory.statVendors') : t('directory.statVendorsPlural')}</span>
          <span><strong>{categories.length}</strong> {categories.length === 1 ? t('directory.statCategory') : t('directory.statCategoriesPlural')}</span>
          <span><strong>{residentCount}</strong> {t('directory.statResidentRecommended')}</span>
          {lastAdded ? <span><strong>{relativeTime(lastAdded)}</strong> {t('directory.statLastAdded')}</span> : null}
        </div>
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
          {filtered.map((v) => <VendorCard key={v.id} vendor={v} categories={categories} isAdmin={false} />)}
        </div>
      )}
    </div>
  )
}
