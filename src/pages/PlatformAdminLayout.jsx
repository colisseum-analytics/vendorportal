import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import PlatformAdminSidebar from '../components/PlatformAdminSidebar.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformAdminLayout() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  usePageMeta({ title: 'Platform admin', noindex: true })
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendorCounts, setVendorCounts] = useState({})
  const [lastVendorAdded, setLastVendorAdded] = useState({})
  const [users, setUsers] = useState([])
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [unresolvedMessageCount, setUnresolvedMessageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setChecked(true); return }
    let active = true
    supabase.rpc('is_platform_admin').then(({ data }) => {
      if (!active) return
      setIsPlatformAdmin(!!data)
      setChecked(true)
    })
    return () => { active = false }
  }, [user, authLoading])

  const reloadCore = async () => {
    const [{ data: n }, { data: v }, { data: u }, { count: pending }, { count: unresolved }] = await Promise.all([
      supabase.from('neighborhoods').select('*').order('name'),
      supabase.from('vendors').select('neighborhood_id, created_at'),
      supabase.rpc('list_all_users'),
      supabase.from('neighborhood_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('resolved', false),
    ])
    setNeighborhoods(n || [])
    const counts = {}
    const lastAdded = {}
    ;(v || []).forEach((row) => {
      counts[row.neighborhood_id] = (counts[row.neighborhood_id] || 0) + 1
      if (!lastAdded[row.neighborhood_id] || row.created_at > lastAdded[row.neighborhood_id]) {
        lastAdded[row.neighborhood_id] = row.created_at
      }
    })
    setVendorCounts(counts)
    setLastVendorAdded(lastAdded)
    setUsers(u || [])
    setPendingRequestCount(pending || 0)
    setUnresolvedMessageCount(unresolved || 0)
  }

  useEffect(() => {
    if (!checked || !isPlatformAdmin) return
    let active = true
    async function load() {
      setLoading(true)
      await reloadCore()
      if (!active) return
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [checked, isPlatformAdmin])

  const adminCounts = {}
  users.forEach((u) => {
    ;(u.admin_of || []).forEach((n) => { adminCounts[n.id] = (adminCounts[n.id] || 0) + 1 })
  })
  const activeCount = neighborhoods.filter((n) => n.active).length
  const neighborhoodNameById = Object.fromEntries(neighborhoods.map((n) => [n.id, n.name]))

  if (authLoading || !checked) {
    return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>Loading…</div></div>
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Platform admin login required</h1>
          <p className="sub">Log in with a platform admin account to oversee every neighborhood.</p>
          <Link className="btn-primary" to="/login?redirect=/platform-admin" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Access restricted</h1>
          <p className="sub">You're logged in as {user.email}, but this account isn't a platform admin.</p>
          <Link className="btn-ghost" to="/">← Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="neighborhood-shell">
      <PlatformAdminSidebar />
      <div className="neighborhood-shell-content">
        <div className="wrap">
          <div className="masthead">
            <div>
              <p className="eyebrow"><Link to="/">LoopListing</Link> · Platform Admin</p>
              <h1>Platform overview</h1>
              <p className="tagline">Review new directory requests and oversee every directory already on the platform.</p>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-item"><strong>{neighborhoods.length}</strong><span>Neighborhoods</span></div>
            <div className="stat-item"><strong>{activeCount} / {neighborhoods.length - activeCount}</strong><span>Active / Inactive</span></div>
            <div className="stat-item"><strong>{users.length}</strong><span>Users</span></div>
            <div className="stat-item"><strong>{pendingRequestCount}</strong><span>Pending requests</span></div>
            {unresolvedMessageCount > 0 ? (
              <button type="button" className="stat-item stat-alert stat-item-clickable" onClick={() => navigate('/platform-admin')}>
                <strong>{unresolvedMessageCount}</strong><span>New message{unresolvedMessageCount === 1 ? '' : 's'}</span>
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="empty" style={{ marginTop: 20 }}>Loading…</div>
          ) : (
            <Outlet context={{ neighborhoods, vendorCounts, lastVendorAdded, users, adminCounts, neighborhoodNameById, reloadCore }} />
          )}
        </div>
      </div>
    </div>
  )
}
