import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import VendorCard from '../components/VendorCard.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import Pagination from '../components/Pagination.jsx'
import FilterPill from '../components/FilterPill.jsx'
import { useVendorView } from '../hooks/useVendorView.js'
import { relativeTime } from '../utils/relativeTime'

const STATUS_OPTIONS = ['Verified', 'Unknown']

const PAGE_SIZE = 25

export default function NeighborhoodDirectory() {
  const { neighborhood } = useOutletContext()
  const { t, tCategory } = useLanguage()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [status, setStatus] = useState(null)
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    setPage(1)
  }, [category, status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const categories = neighborhood.categories || []
  const residentCount = vendors.filter((v) => v.is_resident).length
  const lastAdded = vendors.reduce((max, v) => (!max || v.created_at > max ? v.created_at : max), null)

  if (loading) return <div className="empty" style={{ marginTop: 20 }}>{t('directory.loadingDirectory')}</div>

  return (
    <div>
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
        <div className="filter-pill-row">
          <FilterPill label={t('browse.filterStatus')} options={STATUS_OPTIONS} value={status} onChange={setStatus} renderOption={(o) => t(`directory.status${o}`)} />
          <FilterPill label={t('browse.filterCategory')} options={categories} value={category} onChange={setCategory} renderOption={tCategory} />
          {status || category ? (
            <button type="button" className="filter-reset-btn" onClick={() => { setStatus(null); setCategory(null) }}>
              {t('browse.reset')} ×
            </button>
          ) : null}
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
          {pageItems.map((v) => <VendorCard key={v.id} vendor={v} categories={categories} isAdmin={false} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
