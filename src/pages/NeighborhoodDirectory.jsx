import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import VendorCard from '../components/VendorCard.jsx'

export default function NeighborhoodDirectory() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [neighborhood, setNeighborhood] = useState(null)
  const [vendors, setVendors] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')

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
        const { data: admin } = await supabase
          .from('neighborhood_admins')
          .select('user_id')
          .eq('neighborhood_id', n.id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (active) setIsAdmin(!!admin)
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
        const hay = `${v.name} ${v.category} ${v.address || ''} ${v.description || ''}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      })
  }, [vendors, category, status, search])

  if (loading) return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>Loading the directory…</div></div>
  if (notFound) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: 60 }}>
          <strong>Neighborhood not found</strong>
          <Link to="/">← Back to all neighborhoods</Link>
        </div>
      </div>
    )
  }

  const categories = neighborhood.categories || []

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to="/">All neighborhoods</Link> · Vendor Directory</p>
          <h1>{neighborhood.name}</h1>
          {neighborhood.tagline ? <p className="tagline">{neighborhood.tagline}</p> : null}
        </div>
        <div className="admin-corner">
          {isAdmin ? (
            <Link className="btn-ghost" to={`/n/${slug}/admin`}>Admin dashboard</Link>
          ) : user ? (
            <Link className="btn-ghost" to={`/n/${slug}/admin`}>Request admin access</Link>
          ) : (
            <Link className="btn-ghost" to={`/login?redirect=/n/${slug}/admin`}>Admin login</Link>
          )}
        </div>
      </div>

      <div className="controls">
        <div className="search-box">
          <input type="text" placeholder="Search vendors, categories, streets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="status-toggle">
          {['All', 'Open', 'Closed', 'Seasonal'].map((s) => (
            <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="chip-row">
        {['All', ...categories].map((c) => (
          <span key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</span>
        ))}
      </div>
      <div className="count-row">Showing {filtered.length} of {vendors.length} vendor{vendors.length === 1 ? '' : 's'}</div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nothing here yet</strong>
          {vendors.length === 0 ? 'Check back soon — admins are still building this list.' : 'No vendors match your search or filters.'}
        </div>
      ) : (
        <div className="grid">
          {filtered.map((v) => <VendorCard key={v.id} vendor={v} categories={categories} isAdmin={false} />)}
        </div>
      )}

      <footer className="site-footer">Run by neighborhood volunteers. See something out of date? Ask an admin to fix it.</footer>
    </div>
  )
}
