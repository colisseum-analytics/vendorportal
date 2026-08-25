import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { colorForCategory } from '../utils/categoryColor'
import VendorCard from '../components/VendorCard.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import FilterPill from '../components/FilterPill.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import { useVendorView } from '../hooks/useVendorView.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

const BATCH_SIZE = 50

export default function BrowseVendors() {
  const { t, tCategory } = useLanguage()
  usePageMeta({ title: t('browse.title'), description: t('browse.subtitle') })
  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState(null)
  const [category, setCategory] = useState(null)
  const [status, setStatus] = useState(null)
  const [neighborhoodFilter, setNeighborhoodFilter] = useState(null)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [view, setView] = useVendorView()

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data: n } = await supabase
        .from('neighborhoods')
        .select('id, name, slug, city')
        .order('name')
      if (!active) return
      const neighborhoodList = n || []
      setNeighborhoods(neighborhoodList)

      const ids = neighborhoodList.map((row) => row.id)
      if (ids.length === 0) {
        setVendors([])
        setLoading(false)
        return
      }
      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .in('neighborhood_id', ids)
        .order('name')
      if (!active) return
      setVendors(v || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const neighborhoodById = useMemo(
    () => Object.fromEntries(neighborhoods.map((n) => [n.id, n])),
    [neighborhoods]
  )

  const cityOptions = useMemo(() => {
    const relevant = neighborhoodFilter
      ? neighborhoods.filter((n) => n.id === neighborhoodFilter)
      : neighborhoods
    return [...new Set(relevant.map((n) => n.city).filter(Boolean))].sort()
  }, [neighborhoods, neighborhoodFilter])
  const categoryOptions = useMemo(
    () => [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort(),
    [vendors]
  )
  const statusOptions = ['Verified', 'Unknown']
  const neighborhoodOptions = useMemo(() => {
    const relevant = city ? neighborhoods.filter((n) => n.city === city) : neighborhoods
    return relevant.map((n) => ({ value: n.id, label: n.name }))
  }, [neighborhoods, city])

  const renderCategoryOption = (cat) => (
    <>
      <span className="filter-pill-dot" style={{ background: colorForCategory(categoryOptions, cat) }} />
      {tCategory(cat)}
    </>
  )

  const filtered = useMemo(() => {
    return vendors
      .filter((v) => !status || (v.status || 'Unknown') === status)
      .filter((v) => !category || v.category === category)
      .filter((v) => !city || neighborhoodById[v.neighborhood_id]?.city === city)
      .filter((v) => !neighborhoodFilter || v.neighborhood_id === neighborhoodFilter)
      .filter((v) => {
        if (!search) return true
        const n = neighborhoodById[v.neighborhood_id]
        const hay = `${v.name} ${v.category} ${v.specialty || ''} ${v.description || ''} ${n?.name || ''} ${n?.city || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [vendors, status, category, city, neighborhoodFilter, search, neighborhoodById])

  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [status, category, city, neighborhoodFilter, search])

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const remaining = filtered.length - visibleItems.length

  const cityCount = new Set(neighborhoods.map((n) => n.city).filter(Boolean)).size

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to="/">{t('common.backToAllNeighborhoods')}</Link> · {t('browse.eyebrow')}</p>
          <h1>{t('browse.title')}</h1>
          <p className="tagline">{t('browse.subtitle')}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>{vendors.length}</strong><span>{t('browse.statVendors')}</span></div>
        <div className="stat-item"><strong>{neighborhoods.length}</strong><span>{t('browse.statNeighborhoods')}</span></div>
        <div className="stat-item"><strong>{cityCount}</strong><span>{t('browse.statCities')}</span></div>
      </div>

      <div className="controls controls-compact">
        <div className="search-box search-box-compact">
          <input
            type="text"
            placeholder={t('browse.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pill-row">
          <FilterPill label={t('browse.filterCategory')} options={categoryOptions} value={category} onChange={setCategory} renderOption={renderCategoryOption} />
          <FilterPill label={t('browse.filterNeighborhood')} options={neighborhoodOptions} value={neighborhoodFilter} onChange={setNeighborhoodFilter} />
          <FilterPill label={t('browse.filterCity')} options={cityOptions} value={city} onChange={setCity} />
          <FilterPill label={t('browse.filterStatus')} options={statusOptions} value={status} onChange={setStatus} renderOption={(o) => t(`directory.status${o}`)} />
          {status || city || category || neighborhoodFilter ? (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => { setStatus(null); setCity(null); setCategory(null); setNeighborhoodFilter(null) }}
            >
              {t('browse.reset')} ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="count-row-with-action">
        <div className="count-row">
          {t(vendors.length === 1 ? 'browse.showingOne' : 'browse.showingOther', { shown: filtered.length, total: vendors.length })}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {loading ? (
        <div className="empty">{t('browse.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <strong>{t('browse.emptyTitle')}</strong>
          {vendors.length === 0 ? t('browse.emptyNoVendors') : t('browse.emptyNoMatch')}
        </div>
      ) : (
        <div className={`grid ${view === 'list' ? 'list-view' : ''}`}>
          {visibleItems.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              categories={categoryOptions}
              isAdmin={false}
              neighborhood={neighborhoodById[v.neighborhood_id]}
            />
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <div className="load-more-row">
          <button type="button" className="btn-secondary" onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}>
            {t('browse.loadMore', { count: Math.min(remaining, BATCH_SIZE) })}
          </button>
        </div>
      ) : null}

      <footer className="site-footer">
        {t('footer.tagline')}
        <FooterExtras />
      </footer>
    </div>
  )
}
