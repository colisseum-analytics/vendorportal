import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VendorCard from '../components/VendorCard.jsx'
import VendorFormModal from '../components/VendorFormModal.jsx'
import ImportVendorsModal from '../components/ImportVendorsModal.jsx'
import { downloadVendorsCsv } from '../utils/vendorCsvExport'
import ViewToggle from '../components/ViewToggle.jsx'
import FilterPill from '../components/FilterPill.jsx'
import { useVendorView } from '../hooks/useVendorView.js'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

const STATUS_OPTIONS = ['Verified', 'Unknown']

export default function AdminDashboard() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { neighborhood, isAdmin } = useOutletContext()
  usePageMeta({ title: neighborhood ? `${neighborhood.name} · Admin` : 'Admin', noindex: true })

  const [vendors, setVendors] = useState([])
  const [invites, setInvites] = useState([])
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [currentAdmins, setCurrentAdmins] = useState([])
  const [adminsError, setAdminsError] = useState('')
  const [busyAdminId, setBusyAdminId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [view, setView] = useVendorView()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [status, setStatus] = useState(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    let active = true
    async function loadExtras() {
      const [{ data: v }, { data: inv }, { count: unresolved }, { data: adm }] = await Promise.all([
        supabase.from('vendors').select('*').eq('neighborhood_id', neighborhood.id).order('name'),
        supabase.from('admin_invites').select('*').eq('neighborhood_id', neighborhood.id).order('created_at'),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('neighborhood_id', neighborhood.id).eq('resolved', false),
        supabase.rpc('list_neighborhood_admins', { p_neighborhood_id: neighborhood.id }),
      ])
      if (!active) return
      setVendors(v || [])
      setInvites(inv || [])
      setUnresolvedCount(unresolved || 0)
      setCurrentAdmins(adm || [])
    }
    loadExtras()
    return () => { active = false }
  }, [neighborhood, isAdmin])

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

  const refreshVendors = async () => {
    const { data } = await supabase.from('vendors').select('*').eq('neighborhood_id', neighborhood.id).order('name')
    setVendors(data || [])
  }

  const saveVendor = async (form) => {
    if (editingVendor) {
      const { error } = await supabase.from('vendors').update(form).eq('id', editingVendor.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('vendors').insert({ ...form, neighborhood_id: neighborhood.id })
      if (error) throw error
    }
    setModalOpen(false)
    setEditingVendor(null)
    await refreshVendors()
  }

  const confirmDelete = async () => {
    await supabase.from('vendors').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    await refreshVendors()
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    setInviteMsg('')
    setInviteError('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviteSending(true)
    const { data, error } = await supabase.functions.invoke('invite-admin', {
      body: {
        neighborhood_id: neighborhood.id,
        neighborhood_slug: slug,
        neighborhood_name: neighborhood.name,
        email,
      },
    })
    setInviteSending(false)
    if (error) {
      setInviteError(error.message || "Couldn't send that invite. Try again in a moment.")
      return
    }
    if (data?.status === 'added') {
      setInviteMsg(`${email} already had an account, so they're an admin now — we emailed them the link.`)
    } else {
      setInviteMsg(
        data?.emailSent
          ? `Invited. We emailed ${email} — they'll become an admin as soon as they create an account with that address.`
          : `Invited. ${email} will become an admin as soon as they create an account with that address. (No email was sent — see the invite-admin function's RESEND_API_KEY setup in the README.)`
      )
    }
    setInviteEmail('')
    const { data: inv } = await supabase.from('admin_invites').select('*').eq('neighborhood_id', neighborhood.id).order('created_at')
    setInvites(inv || [])
  }

  const revokeInvite = async (id) => {
    await supabase.from('admin_invites').delete().eq('id', id)
    setInvites((list) => list.filter((i) => i.id !== id))
  }

  const removeAdmin = async (userId) => {
    setBusyAdminId(userId)
    setAdminsError('')
    const { error } = await supabase.rpc('remove_neighborhood_admin', { p_neighborhood_id: neighborhood.id, p_user_id: userId })
    setBusyAdminId(null)
    if (error) {
      setAdminsError(error.message)
      return
    }
    setCurrentAdmins((list) => list.filter((a) => a.user_id !== userId))
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to manage vendors for this neighborhood.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>No admin access — yet</h1>
          <p className="sub">
            You're logged in as {user.email}, but you're not an admin of {neighborhood.name}.
            Ask an existing admin to invite this email from their dashboard, then refresh this page.
          </p>
          <Link className="btn-ghost" to={`/n/${slug}`}>← View the public directory</Link>
        </div>
      </div>
    )
  }

  const categories = neighborhood.categories || []
  const residentCount = vendors.filter((v) => v.is_resident).length
  const lastAdded = vendors.reduce((max, v) => (!max || v.created_at > max ? v.created_at : max), null)

  return (
    <div className="wrap">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>Manage vendors</h1>
        <p className="tagline">Changes here appear on the public directory immediately.</p>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>{vendors.length}</strong><span>Vendor{vendors.length === 1 ? '' : 's'}</span></div>
        <div className="stat-item"><strong>{categories.length}</strong><span>Categor{categories.length === 1 ? 'y' : 'ies'}</span></div>
        <div className="stat-item"><strong>{residentCount}</strong><span>Neighbor-recommended</span></div>
        {lastAdded ? <div className="stat-item"><strong>{relativeTime(lastAdded)}</strong><span>Last added</span></div> : null}
        {unresolvedCount > 0 ? (
          <Link to={`/n/${slug}/admin/messages`} className="stat-item stat-alert stat-item-clickable">
            <strong>{unresolvedCount}</strong><span>New message{unresolvedCount === 1 ? '' : 's'}</span>
          </Link>
        ) : null}
      </div>

      <div className="controls controls-compact">
        <div className="search-box search-box-compact">
          <input type="text" placeholder="Search vendors, categories, streets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-pill-row">
          <FilterPill label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <FilterPill label="Category" options={categories} value={category} onChange={setCategory} />
          {status || category ? (
            <button type="button" className="filter-reset-btn" onClick={() => { setStatus(null); setCategory(null) }}>
              Reset ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="count-row-with-action">
        <div className="count-row">Showing {filtered.length} of {vendors.length} vendor{vendors.length === 1 ? '' : 's'}</div>
        <div className="count-row-actions">
          <ViewToggle view={view} onChange={setView} />
          <button
            className="btn-ghost"
            disabled={vendors.length === 0}
            onClick={() => downloadVendorsCsv(vendors, `${slug}-vendors.csv`)}
          >
            Export CSV
          </button>
          <button className="btn-ghost" onClick={() => { setImportMsg(''); setImportOpen(true) }}>Import CSV</button>
        </div>
      </div>
      {importMsg ? <div className="success-msg">{importMsg}</div> : null}

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Nothing here yet</strong>
          {vendors.length === 0 ? 'Add your first vendor with the button in the corner, or import a CSV.' : 'No vendors match your search or filters.'}
        </div>
      ) : (
        <div className={`grid ${view === 'list' ? 'list-view' : ''}`}>
          {filtered.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              categories={categories}
              isAdmin
              onEdit={(vv) => { setEditingVendor(vv); setModalOpen(true) }}
              onDelete={(vv) => setDeleteTarget(vv)}
            />
          ))}
        </div>
      )}

      <h2 className="section-title">Admins</h2>
      {adminsError ? <div className="error-msg">{adminsError}</div> : null}
      {currentAdmins.length > 0 ? (
        <ul className="admin-list">
          {currentAdmins.map((a) => (
            <li key={a.user_id}>
              {a.email}{a.user_id === user.id ? ' (you)' : ''}{' '}
              {currentAdmins.length > 1 ? (
                <button
                  className="btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 10 }}
                  disabled={busyAdminId === a.user_id}
                  onClick={() => removeAdmin(a.user_id)}
                >
                  remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <h2 className="section-title">Invite a co-admin</h2>
      <form className="invite-row" onSubmit={sendInvite}>
        <input type="email" placeholder="neighbor@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
        <button type="submit" className="btn-secondary" disabled={inviteSending}>{inviteSending ? 'Sending…' : 'Invite'}</button>
      </form>
      {inviteError ? <div className="error-msg">{inviteError}</div> : null}
      {inviteMsg ? <div className="success-msg">{inviteMsg}</div> : null}
      {invites.length > 0 ? (
        <ul className="admin-list">
          {invites.map((i) => (
            <li key={i.id}>
              {i.email} — pending{' '}
              <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => revokeInvite(i.id)}>revoke</button>
            </li>
          ))}
        </ul>
      ) : null}

      <button className="fab" onClick={() => { setEditingVendor(null); setModalOpen(true) }}>+ Add vendor</button>

      {modalOpen ? (
        <VendorFormModal
          categories={categories}
          existing={editingVendor}
          onCancel={() => { setModalOpen(false); setEditingVendor(null) }}
          onSave={saveVendor}
        />
      ) : null}

      {importOpen ? (
        <ImportVendorsModal
          neighborhood={neighborhood}
          onCancel={() => setImportOpen(false)}
          onImported={async (count) => {
            setImportOpen(false)
            setImportMsg(`Imported ${count} vendor${count === 1 ? '' : 's'}.`)
            await refreshVendors()
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <button className="close-x" onClick={() => setDeleteTarget(null)}>×</button>
            <h2>Remove {deleteTarget.name}?</h2>
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
