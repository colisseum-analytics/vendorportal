import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import InfoItemFormModal from '../components/InfoItemFormModal.jsx'
import { useNeighborhoodAccess } from '../hooks/useNeighborhoodAccess.js'
import { useAuth } from '../context/AuthContext.jsx'

const SECTIONS = [
  { key: 'hoa_contacts', label: 'HOA Contacts' },
  { key: 'community_services', label: 'Community Services' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'faq', label: 'Community FAQ' },
]

function groupBySubsection(items) {
  const groups = []
  const byKey = {}
  for (const item of items) {
    const key = item.subsection || ''
    if (!byKey[key]) {
      byKey[key] = { subsection: item.subsection, items: [] }
      groups.push(byKey[key])
    }
    byKey[key].items.push(item)
  }
  return groups
}

export default function AdminCommunityInfo() {
  const { slug } = useParams()
  const { user, authLoading, neighborhood, isAdmin, loading, notFound } = useNeighborhoodAccess(slug)
  const { signOut } = useAuth()

  const [activeSection, setActiveSection] = useState('hoa_contacts')
  const [items, setItems] = useState([])
  const [vendors, setVendors] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    let active = true
    async function load() {
      const [{ data: i }, { data: v }] = await Promise.all([
        supabase.from('neighborhood_info_items').select('*').eq('neighborhood_id', neighborhood.id).order('subsection').order('sort_order'),
        supabase.from('vendors').select('id, name, category').eq('neighborhood_id', neighborhood.id).order('name'),
      ])
      if (!active) return
      setItems(i || [])
      setVendors(v || [])
    }
    load()
    return () => { active = false }
  }, [neighborhood, isAdmin])

  const refreshItems = async () => {
    const { data } = await supabase.from('neighborhood_info_items').select('*').eq('neighborhood_id', neighborhood.id).order('subsection').order('sort_order')
    setItems(data || [])
  }

  const saveItem = async (form) => {
    if (editingItem) {
      const { error } = await supabase.from('neighborhood_info_items').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingItem.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('neighborhood_info_items').insert({ ...form, neighborhood_id: neighborhood.id, section: activeSection })
      if (error) throw error
    }
    setModalOpen(false)
    setEditingItem(null)
    await refreshItems()
  }

  const confirmDelete = async () => {
    await supabase.from('neighborhood_info_items').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    await refreshItems()
  }

  if (authLoading || loading) return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>Loading…</div></div>

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to manage this neighborhood's community info.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin/info`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    )
  }

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

  if (isAdmin === false) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>No admin access — yet</h1>
          <p className="sub">You're logged in as {user.email}, but you're not an admin of {neighborhood.name}.</p>
          <Link className="btn-ghost" to={`/n/${slug}`}>← View the public directory</Link>
        </div>
      </div>
    )
  }

  const sectionItems = items.filter((i) => i.section === activeSection)
  const groups = groupBySubsection(sectionItems)

  return (
    <div className="wrap">
      <div className="masthead">
        <div className="masthead-with-logo">
          {neighborhood.logo_url ? <img src={neighborhood.logo_url} alt="" className="masthead-logo" /> : null}
          <div>
            <p className="eyebrow"><Link to={`/n/${slug}/admin`}>{neighborhood.name} · Admin</Link></p>
            <h1>Community info</h1>
            <p className="tagline">HOA contacts, community services, emergency numbers, and FAQ — shown on the left nav of the public directory.</p>
          </div>
        </div>
        <div className="admin-corner">
          <div className="admin-pill"><span className="dot" />{user.email}</div><br />
          <Link className="btn-ghost" to={`/n/${slug}/admin`}>Vendors</Link>{' '}
          <button className="btn-ghost" onClick={signOut}>Log out</button>
        </div>
      </div>

      <div className="neighborhood-nav" style={{ marginBottom: 22, flexDirection: 'row', flexWrap: 'wrap', position: 'static' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`neighborhood-nav-link ${activeSection === s.key ? 'neighborhood-nav-link-active' : ''}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sectionItems.length === 0 ? (
        <div className="empty">
          <strong>Nothing here yet</strong>
          Add your first entry with the button in the corner.
        </div>
      ) : activeSection === 'faq' ? (
        <div className="message-list">
          {sectionItems.map((item) => (
            <div key={item.id} className="message-item">
              <div className="message-item-head">
                <span className="message-from">{item.title}</span>
              </div>
              {item.body ? <p className="message-text">{item.body}</p> : null}
              {item.vendor_id ? (
                <p className="message-text">Linked vendor: {vendors.find((v) => v.id === item.vendor_id)?.name || '(removed)'}</p>
              ) : null}
              <div className="message-actions">
                <button className="btn-ghost" onClick={() => { setEditingItem(item); setModalOpen(true) }}>Edit</button>
                <button className="btn-ghost danger" onClick={() => setDeleteTarget(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.subsection || 'general'} className="overview-subgroup">
            <h3 className="overview-subgroup-title">{group.subsection || 'General'} <span className="badge badge-neutral">{group.items.length}</span></h3>
            <div className="user-list">
              {group.items.map((item) => (
                <div className="user-row" key={item.id}>
                  <div className="user-row-main">
                    <strong>{item.title}</strong>
                    <span className="user-row-meta">
                      {[item.phone, item.email, item.website].filter(Boolean).join(' · ') || item.body || '—'}
                    </span>
                  </div>
                  <div className="user-row-actions">
                    <button className="btn-ghost" onClick={() => { setEditingItem(item); setModalOpen(true) }}>Edit</button>
                    <button className="btn-ghost danger" onClick={() => setDeleteTarget(item)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={() => { setEditingItem(null); setModalOpen(true) }}>+ Add entry</button>

      {modalOpen ? (
        <InfoItemFormModal
          section={activeSection}
          vendors={vendors}
          existing={editingItem}
          onCancel={() => { setModalOpen(false); setEditingItem(null) }}
          onSave={saveItem}
        />
      ) : null}

      {deleteTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <button className="close-x" onClick={() => setDeleteTarget(null)}>×</button>
            <h2>Remove "{deleteTarget.title}"?</h2>
            <p className="sub">This takes it out of the public directory right away. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
