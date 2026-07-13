import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VendorCard from '../components/VendorCard.jsx'
import VendorFormModal from '../components/VendorFormModal.jsx'
import { useNeighborhoodAccess } from '../hooks/useNeighborhoodAccess.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminDashboard() {
  const { slug } = useParams()
  const { user, authLoading, neighborhood, isAdmin, loading, notFound } = useNeighborhoodAccess(slug)
  const { signOut } = useAuth()

  const [vendors, setVendors] = useState([])
  const [invites, setInvites] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    let active = true
    async function loadExtras() {
      const [{ data: v }, { data: inv }] = await Promise.all([
        supabase.from('vendors').select('*').eq('neighborhood_id', neighborhood.id).order('name'),
        supabase.from('admin_invites').select('*').eq('neighborhood_id', neighborhood.id).order('created_at'),
      ])
      if (!active) return
      setVendors(v || [])
      setInvites(inv || [])
    }
    loadExtras()
    return () => { active = false }
  }, [neighborhood, isAdmin])

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

  if (authLoading || loading) return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>Loading…</div></div>

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

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to={`/n/${slug}`}>{neighborhood.name}</Link> · Admin</p>
          <h1>Manage vendors</h1>
          <p className="tagline">Changes here appear on the public directory immediately.</p>
        </div>
        <div className="admin-corner">
          <div className="admin-pill"><span className="dot" />{user.email}</div><br />
          <Link className="btn-ghost" to={`/n/${slug}/admin/settings`}>Settings</Link>{' '}
          <button className="btn-ghost" onClick={signOut}>Log out</button>
        </div>
      </div>

      <div className="count-row">{vendors.length} vendor{vendors.length === 1 ? '' : 's'} listed</div>

      {vendors.length === 0 ? (
        <div className="empty">
          <strong>Nothing here yet</strong>
          Add your first vendor with the button in the corner.
        </div>
      ) : (
        <div className="grid">
          {vendors.map((v) => (
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
