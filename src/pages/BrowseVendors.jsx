import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VendorCard from '../components/VendorCard.jsx'
import ViewToggle from '../components/ViewToggle.jsx'
import FilterPill from '../components/FilterPill.jsx'
import FooterExtras from '../components/FooterExtras.jsx'
import { useVendorView } from '../hooks/useVendorView.js'

export default function BrowseVendors() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState(null)
  const [category, setCategory] = useState(null)
  const [status, setStatus] = useState(null)
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

  const cityOptions = useMemo(
    () => [...new Set(neighborhoods.map((n) => n.city).filter(Boolean))].sort(),
    [neighborhoods]
  )
  const categoryOptions = useMemo(
    () => [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort(),
    [vendors]
  )
  const statusOptions = ['Verified', 'Unknown']

  const filtered = useMemo(() => {
    return vendors
      .filter((v) => !status || (v.status || 'Unknown') === status)
      .filter((v) => !category || v.category === category)
      .filter((v) => !city || neighborhoodById[v.neighborhood_id]?.city === city)
      .filter((v) => {
        if (!search) return true
        const n = neighborhoodById[v.neighborhood_id]
        const hay = `${v.name} ${v.category} ${v.specialty || ''} ${v.description || ''} ${n?.name || ''} ${n?.city || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [vendors, status, category, city, search, neighborhoodById])

  const cityCount = new Set(neighborhoods.map((n) => n.city).filter(Boolean)).size

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to="/">All neighborhoods</Link> · Browse Vendors</p>
          <h1>Browse all vendors</h1>
          <p className="tagline">Search vendors across every neighborhood directory on the platform.</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>{vendors.length}</strong><span>Vendors</span></div>
        <div className="stat-item"><strong>{neighborhoods.length}</strong><span>Neighborhoods</span></div>
        <div className="stat-item"><strong>{cityCount}</strong><span>Cities</span></div>
      </div>

      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search vendors, categories, neighborhoods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-pill-row" style={{ marginBottom: 16 }}>
        <FilterPill label="Status" options={statusOptions} value={status} onChange={setStatus} />
        <FilterPill label="City" options={cityOptions} value={city} onChange={setCity} />
        <FilterPill label="Category" options={categoryOptions} value={category} onChange={setCategory} />
      </div>

      <div className="count-row-with-action">
        <div className="count-row">Showing {filtered.length} of {vendors.length} vendor{vendors.length === 1 ? '' : 's'}</div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {loading ? (
        <div className="empty">Loading vendors…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <strong>No vendors match</strong>
          {vendors.length === 0 ? 'No neighborhoods have added vendors yet.' : 'Try a different search or filter.'}
        </div>
      ) : (
        <div className={`grid ${view === 'list' ? 'list-view' : ''}`}>
          {filtered.map((v) => (
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

      <footer className="site-footer">
        A directory platform run by neighbors, for neighbors.
        <FooterExtras />
      </footer>
    </div>
  )
}
