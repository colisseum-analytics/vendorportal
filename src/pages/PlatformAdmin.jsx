import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'

export default function PlatformAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendorCounts, setVendorCounts] = useState({})
  const [lastVendorAdded, setLastVendorAdded] = useState({})
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [renaming, setRenaming] = useState(null) // neighborhood being renamed
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const [adminEmail, setAdminEmail] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminSending, setAdminSending] = useState(false)

  const [requestError, setRequestError] = useState('')
  const [busyRequestId, setBusyRequestId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const [userError, setUserError] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)

  const [messages, setMessages] = useState([])

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

  const loadAll = async () => {
    setLoading(true)
    const [{ data: n }, { data: v }, { data: u }, { data: r }, { data: m }] = await Promise.all([
      supabase.from('neighborhoods').select('*').order('name'),
      supabase.from('vendors').select('neighborhood_id, created_at'),
      supabase.rpc('list_all_users'),
      supabase.from('neighborhood_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
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
    setRequests(r || [])
    setMessages(m || [])
    setLoading(false)
  }

  const toggleMessageResolved = async (msg) => {
    const { data } = await supabase.from('contact_messages').update({ resolved: !msg.resolved }).eq('id', msg.id).select().maybeSingle()
    if (data) setMessages((list) => list.map((m) => (m.id === msg.id ? data : m)))
  }

  const deleteMessage = async (id) => {
    await supabase.from('contact_messages').delete().eq('id', id)
    setMessages((list) => list.filter((m) => m.id !== id))
  }

  const approveRequest = async (req) => {
    setBusyRequestId(req.id)
    setRequestError('')
    const { error } = await supabase.rpc('approve_neighborhood_request', { p_request_id: req.id })
    setBusyRequestId(null)
    if (error) {
      setRequestError(error.message)
      return
    }
    await loadAll()
  }

  const rejectRequest = async (e) => {
    e.preventDefault()
    setBusyRequestId(rejectTarget.id)
    setRequestError('')
    const { error } = await supabase.rpc('reject_neighborhood_request', { p_request_id: rejectTarget.id, p_note: rejectNote.trim() || null })
    setBusyRequestId(null)
    if (error) {
      setRequestError(error.message)
      return
    }
    setRejectTarget(null)
    setRejectNote('')
    await loadAll()
  }

  useEffect(() => {
    if (checked && isPlatformAdmin) loadAll()
  }, [checked, isPlatformAdmin])

  const toggleActive = async (n) => {
    setBusyId(n.id)
    await supabase.from('neighborhoods').update({ active: !n.active }).eq('id', n.id)
    await loadAll()
    setBusyId(null)
  }

  const startRename = (n) => { setRenaming(n); setRenameValue(n.name) }

  const saveRename = async (e) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    setBusyId(renaming.id)
    await supabase.from('neighborhoods').update({ name: renameValue.trim() }).eq('id', renaming.id)
    setRenaming(null)
    await loadAll()
    setBusyId(null)
  }

  const confirmDelete = async () => {
    setBusyId(deleteTarget.id)
    await supabase.from('neighborhoods').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    await loadAll()
    setBusyId(null)
  }

  const addAdmin = async (e) => {
    e.preventDefault()
    setAdminMsg('')
    setAdminError('')
    const email = adminEmail.trim().toLowerCase()
    if (!email) return
    setAdminSending(true)
    const { error } = await supabase.rpc('add_platform_admin', { p_email: email })
    setAdminSending(false)
    if (error) {
      setAdminError(error.message)
      return
    }
    setAdminMsg(`${email} is now a platform admin.`)
    setAdminEmail('')
    await loadAll()
  }

  const togglePlatformAdmin = async (u) => {
    setBusyUserId(u.user_id)
    setUserError('')
    const { error } = u.is_platform_admin
      ? await supabase.rpc('remove_platform_admin', { p_user_id: u.user_id })
      : await supabase.rpc('add_platform_admin', { p_email: u.email })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      return
    }
    await loadAll()
  }

  const removeFromNeighborhood = async (neighborhoodId, userId) => {
    setBusyUserId(userId)
    setUserError('')
    const { error } = await supabase.rpc('remove_neighborhood_admin', { p_neighborhood_id: neighborhoodId, p_user_id: userId })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      return
    }
    await loadAll()
  }

  const confirmDeleteUser = async () => {
    setBusyUserId(deleteUserTarget.user_id)
    setUserError('')
    const { error } = await supabase.rpc('delete_user_account', { p_user_id: deleteUserTarget.user_id })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      setDeleteUserTarget(null)
      return
    }
    setDeleteUserTarget(null)
    await loadAll()
  }

  const filteredUsers = users.filter((u) => (u.email || '').toLowerCase().includes(userSearch.toLowerCase()))
  const unresolvedMessageCount = messages.filter((m) => !m.resolved).length
  const neighborhoodNameById = Object.fromEntries(neighborhoods.map((n) => [n.id, n.name]))
  const adminCounts = {}
  users.forEach((u) => {
    ;(u.admin_of || []).forEach((n) => { adminCounts[n.id] = (adminCounts[n.id] || 0) + 1 })
  })
  const activeCount = neighborhoods.filter((n) => n.active).length

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
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to="/">Neighborhood Directory</Link> · Platform Admin</p>
          <h1>Platform overview</h1>
          <p className="tagline">Review new directory requests and oversee every directory already on the platform.</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-item"><strong>{neighborhoods.length}</strong><span>Neighborhoods</span></div>
        <div className="stat-item"><strong>{activeCount} / {neighborhoods.length - activeCount}</strong><span>Active / Inactive</span></div>
        <div className="stat-item"><strong>{users.length}</strong><span>Users</span></div>
        <div className="stat-item"><strong>{requests.length}</strong><span>Pending requests</span></div>
        {unresolvedMessageCount > 0 ? (
          <button
            type="button"
            className="stat-item stat-alert stat-item-clickable"
            onClick={() => document.getElementById('platform-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <strong>{unresolvedMessageCount}</strong><span>New message{unresolvedMessageCount === 1 ? '' : 's'}</span>
          </button>
        ) : null}
      </div>

      <h2 className="section-title">
        Pending requests {requests.length > 0 ? <span className="badge badge-inactive">{requests.length}</span> : null}
      </h2>
      {requestError ? <div className="error-msg">{requestError}</div> : null}
      {loading ? null : requests.length === 0 ? (
        <p className="sub" style={{ marginBottom: 26 }}>No new directory requests right now.</p>
      ) : (
        <div className="message-list" style={{ marginBottom: 26 }}>
          {requests.map((r) => (
            <div key={r.id} className="message-item">
              <div className="message-item-head">
                <span className="message-from">{r.name} · /n/{r.slug}</span>
                <span className="message-time">{relativeTime(r.created_at)}</span>
              </div>
              {r.tagline ? <p className="message-text" style={{ marginBottom: 4 }}>{r.tagline}</p> : null}
              <p className="message-text" style={{ marginBottom: 4 }}>
                Categories: {(r.categories || []).join(', ') || '(none given)'}
              </p>
              <p className="message-text">
                Contact: {r.contact_name ? `${r.contact_name} — ` : ''}{r.contact_email}
              </p>
              <div className="message-actions">
                <button className="btn-secondary" disabled={busyRequestId === r.id} onClick={() => approveRequest(r)}>
                  {busyRequestId === r.id ? 'Approving…' : 'Approve'}
                </button>
                <button className="btn-ghost danger" disabled={busyRequestId === r.id} onClick={() => { setRejectTarget(r); setRejectNote('') }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">All neighborhoods</h2>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : neighborhoods.length === 0 ? (
        <div className="empty"><strong>No neighborhoods yet</strong></div>
      ) : (
        <div className="user-list" style={{ marginBottom: 26 }}>
          {neighborhoods.map((n) => (
            <div className="user-row" key={n.id}>
              <div className="user-row-main">
                <strong>
                  <Link to={`/n/${n.slug}`} className="platform-name">{n.name}</Link>
                </strong>
                <span className="user-row-meta">
                  /n/{n.slug} · Created {relativeTime(n.created_at)}
                  {n.updated_at && n.updated_at !== n.created_at ? ` · Updated ${relativeTime(n.updated_at)}` : ''}
                  {lastVendorAdded[n.id] ? ` · Last vendor added ${relativeTime(lastVendorAdded[n.id])}` : ''}
                </span>
              </div>
              <div className="user-row-roles">
                <span className={`badge ${n.active ? 'badge-active' : 'badge-inactive'}`}>{n.active ? 'Active' : 'Inactive'}</span>
                <span className="badge badge-neutral">{vendorCounts[n.id] || 0} vendor{(vendorCounts[n.id] || 0) === 1 ? '' : 's'}</span>
                <span className="badge badge-neutral">{(n.categories || []).length} categor{(n.categories || []).length === 1 ? 'y' : 'ies'}</span>
                <span className="badge badge-neutral">{adminCounts[n.id] || 0} admin{(adminCounts[n.id] || 0) === 1 ? '' : 's'}</span>
              </div>
              <div className="user-row-actions">
                <button className="btn-ghost" disabled={busyId === n.id} onClick={() => startRename(n)}>Rename</button>
                <button className="btn-ghost" disabled={busyId === n.id} onClick={() => toggleActive(n)}>
                  {n.active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn-ghost danger" disabled={busyId === n.id} onClick={() => setDeleteTarget(n)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Users</h2>
      <form className="invite-row" onSubmit={addAdmin}>
        <input type="email" placeholder="Grant platform admin by email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        <button type="submit" className="btn-secondary" disabled={adminSending}>{adminSending ? 'Adding…' : 'Grant'}</button>
      </form>
      {adminError ? <div className="error-msg">{adminError}</div> : null}
      {adminMsg ? <div className="success-msg">{adminMsg}</div> : null}

      <div className="field" style={{ maxWidth: 340 }}>
        <input type="text" placeholder="Search users by email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
      </div>
      {userError ? <div className="error-msg">{userError}</div> : null}

      {loading ? null : filteredUsers.length === 0 ? (
        <p className="sub">No users match.</p>
      ) : (
        <div className="user-list">
          {filteredUsers.map((u) => (
            <div className="user-row" key={u.user_id}>
              <div className="user-row-main">
                <strong>{u.email}{u.user_id === user.id ? ' (you)' : ''}</strong>
                <span className="user-row-meta">
                  Joined {relativeTime(u.created_at)} · Last sign-in {u.last_sign_in_at ? relativeTime(u.last_sign_in_at) : 'never'}
                </span>
              </div>
              <div className="user-row-roles">
                {u.is_platform_admin ? <span className="badge badge-active">Platform admin</span> : null}
                {(u.admin_of || []).map((n) => (
                  <span className="badge badge-neutral" key={n.id}>
                    {n.name}
                    <button
                      type="button"
                      className="badge-remove"
                      disabled={busyUserId === u.user_id}
                      onClick={() => removeFromNeighborhood(n.id, u.user_id)}
                      title={`Remove admin access to ${n.name}`}
                      aria-label={`Remove admin access to ${n.name}`}
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="user-row-actions">
                <button className="btn-ghost" disabled={busyUserId === u.user_id} onClick={() => togglePlatformAdmin(u)}>
                  {u.is_platform_admin ? 'Revoke platform admin' : 'Make platform admin'}
                </button>
                <button
                  className="btn-ghost danger"
                  disabled={busyUserId === u.user_id || u.user_id === user.id}
                  onClick={() => setDeleteUserTarget(u)}
                >
                  Delete account
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" id="platform-messages">
        Messages {unresolvedMessageCount > 0 ? <span className="badge badge-inactive">{unresolvedMessageCount} new</span> : null}
      </h2>
      {messages.length === 0 ? (
        <p className="sub">Nothing yet — suggestions and concerns submitted across every neighborhood will show up here.</p>
      ) : (
        <div className="message-list" style={{ marginBottom: 26 }}>
          {messages.map((m) => (
            <div key={m.id} className={`message-item ${m.resolved ? 'message-resolved' : ''}`}>
              <div className="message-item-head">
                <span className="message-from">
                  {neighborhoodNameById[m.neighborhood_id] || 'Unknown neighborhood'} · {m.name || 'Anonymous'}{m.email ? ` · ${m.email}` : ''}
                </span>
                <span className="message-time">{relativeTime(m.created_at)}</span>
              </div>
              <p className="message-text">{m.message}</p>
              <div className="message-actions">
                <button className="btn-ghost" onClick={() => toggleMessageResolved(m)}>{m.resolved ? 'Reopen' : 'Mark resolved'}</button>
                <button className="btn-ghost danger" onClick={() => deleteMessage(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteUserTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteUserTarget(null) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setDeleteUserTarget(null)}>×</button>
            <h2>Delete {deleteUserTarget.email}?</h2>
            <p className="sub">
              This permanently deletes their account and any admin access it holds.
              {(deleteUserTarget.admin_of || []).length > 0
                ? ` They admin ${(deleteUserTarget.admin_of || []).map((n) => n.name).join(', ')} — make sure another admin exists there first.`
                : ''}
              {' '}This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteUserTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} onClick={confirmDeleteUser}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {renaming ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRenaming(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <button className="close-x" onClick={() => setRenaming(null)}>×</button>
            <h2>Rename neighborhood</h2>
            <form onSubmit={saveRename}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setRenaming(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRejectTarget(null) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setRejectTarget(null)}>×</button>
            <h2>Reject "{rejectTarget.name}"?</h2>
            <p className="sub">Optionally leave a note for your own records — the requester isn't notified automatically.</p>
            <form onSubmit={rejectRequest}>
              <div className="field">
                <label>Note (optional)</label>
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--red)' }} disabled={busyRequestId === rejectTarget.id}>
                  {busyRequestId === rejectTarget.id ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setDeleteTarget(null)}>×</button>
            <h2>Delete {deleteTarget.name}?</h2>
            <p className="sub">This permanently removes the neighborhood, its vendors, admins, and pending invites. This can't be undone.</p>
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
