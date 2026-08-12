import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import CityPicker from '../components/CityPicker.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformAdmin() {
  const { user, loading: authLoading } = useAuth()
  usePageMeta({ title: 'Platform admin', noindex: true })
  const [checked, setChecked] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const [neighborhoods, setNeighborhoods] = useState([])
  const [vendorCounts, setVendorCounts] = useState({})
  const [lastVendorAdded, setLastVendorAdded] = useState({})
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [renaming, setRenaming] = useState(null) // neighborhood being edited
  const [renameValue, setRenameValue] = useState('')
  const [renameCityValue, setRenameCityValue] = useState('')
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
  const [userMsg, setUserMsg] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)
  const [editEmailTarget, setEditEmailTarget] = useState(null)
  const [editEmailValue, setEditEmailValue] = useState('')

  const [messages, setMessages] = useState([])

  const [changelog, setChangelog] = useState([])
  const [backupLog, setBackupLog] = useState([])
  const [changelogVersion, setChangelogVersion] = useState('')
  const [changelogSummary, setChangelogSummary] = useState('')
  const [changelogError, setChangelogError] = useState('')
  const [changelogSaving, setChangelogSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

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
    const [{ data: n }, { data: v }, { data: u }, { data: r }, { data: m }, { data: cl }, { data: bl }] = await Promise.all([
      supabase.from('neighborhoods').select('*').order('name'),
      supabase.from('vendors').select('neighborhood_id, created_at'),
      supabase.rpc('list_all_users'),
      supabase.from('neighborhood_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('app_changelog').select('*').order('created_at', { ascending: false }),
      supabase.from('backup_log').select('*').order('created_at', { ascending: false }).limit(5),
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
    setChangelog(cl || [])
    setBackupLog(bl || [])
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

  const startRename = (n) => { setRenaming(n); setRenameValue(n.name); setRenameCityValue(n.city || '') }

  const saveRename = async (e) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    setBusyId(renaming.id)
    await supabase.from('neighborhoods').update({ name: renameValue.trim(), city: renameCityValue.trim() || null }).eq('id', renaming.id)
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

  const sendSignInCode = async (u) => {
    setBusyUserId(u.user_id)
    setUserError('')
    setUserMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: u.email,
      options: { shouldCreateUser: false },
    })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      return
    }
    setUserMsg(`Sign-in code sent to ${u.email}.`)
  }

  const toggleBanned = async (u) => {
    setBusyUserId(u.user_id)
    setUserError('')
    const { error } = await supabase.rpc('set_user_banned', { p_user_id: u.user_id, p_banned: !u.is_banned })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      return
    }
    await loadAll()
  }

  const startEditEmail = (u) => { setEditEmailTarget(u); setEditEmailValue(u.email) }

  const saveEditEmail = async (e) => {
    e.preventDefault()
    if (!editEmailValue.trim()) return
    setBusyUserId(editEmailTarget.user_id)
    setUserError('')
    const { error } = await supabase.rpc('admin_update_user_email', {
      p_user_id: editEmailTarget.user_id,
      p_new_email: editEmailValue.trim(),
    })
    setBusyUserId(null)
    if (error) {
      setUserError(error.message)
      return
    }
    setEditEmailTarget(null)
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

  const addChangelogEntry = async (e) => {
    e.preventDefault()
    setChangelogError('')
    if (!changelogVersion.trim() || !changelogSummary.trim()) return
    setChangelogSaving(true)
    const { error } = await supabase.from('app_changelog').insert({
      version: changelogVersion.trim(),
      summary: changelogSummary.trim(),
      created_by: user.id,
    })
    setChangelogSaving(false)
    if (error) {
      setChangelogError(error.message)
      return
    }
    setChangelogVersion('')
    setChangelogSummary('')
    await loadAll()
  }

  const deleteChangelogEntry = async (id) => {
    await supabase.from('app_changelog').delete().eq('id', id)
    setChangelog((list) => list.filter((c) => c.id !== id))
  }

  const exportBackup = async () => {
    setExporting(true)
    setExportError('')
    const { data, error } = await supabase.rpc('export_platform_backup')
    setExporting(false)
    if (error) {
      setExportError(error.message)
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `looplisting-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
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

  const neighborhoodsByCity = (() => {
    const groups = {}
    neighborhoods.forEach((n) => {
      const city = n.city || 'No city set'
      if (!groups[city]) groups[city] = []
      groups[city].push(n)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'No city set') return 1
      if (b === 'No city set') return -1
      return a.localeCompare(b)
    })
  })()

  const platformAdminUsers = filteredUsers.filter((u) => u.is_platform_admin)
  const usersByNeighborhood = neighborhoods
    .map((n) => ({ neighborhood: n, users: filteredUsers.filter((u) => (u.admin_of || []).some((a) => a.id === n.id)) }))
    .filter((g) => g.users.length > 0)
  const unassignedUsers = filteredUsers.filter((u) => !u.is_platform_admin && (u.admin_of || []).length === 0)

  const renderUserRow = (u) => (
    <div className={`user-row ${u.is_banned ? 'user-row-banned' : ''}`} key={u.user_id}>
      <div className="user-row-main">
        <strong>{u.email}{u.user_id === user.id ? ' (you)' : ''}</strong>
        <span className="user-row-meta">
          Joined {relativeTime(u.created_at)} · Last sign-in {u.last_sign_in_at ? relativeTime(u.last_sign_in_at) : 'never'}
        </span>
      </div>
      <div className="user-row-roles">
        {u.is_banned ? <span className="badge badge-inactive">Disabled</span> : null}
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
        <button className="btn-ghost" disabled={busyUserId === u.user_id} onClick={() => startEditEmail(u)}>
          Edit email
        </button>
        <button className="btn-ghost" disabled={busyUserId === u.user_id} onClick={() => sendSignInCode(u)}>
          Send sign-in code
        </button>
        <button className="btn-ghost" disabled={busyUserId === u.user_id} onClick={() => togglePlatformAdmin(u)}>
          {u.is_platform_admin ? 'Revoke platform admin' : 'Make platform admin'}
        </button>
        <button
          className="btn-ghost danger"
          disabled={busyUserId === u.user_id || u.user_id === user.id}
          onClick={() => toggleBanned(u)}
        >
          {u.is_banned ? 'Enable account' : 'Disable account'}
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
  )

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
          <p className="eyebrow"><Link to="/">LoopListing</Link> · Platform Admin</p>
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

      <div className="overview-grid">
        <div className="overview-card" id="platform-messages">
          <h2 className="section-title">
            Messages {unresolvedMessageCount > 0 ? <span className="badge badge-inactive">{unresolvedMessageCount} new</span> : null}
          </h2>
          {messages.length === 0 ? (
            <p className="sub">Nothing yet — suggestions and concerns submitted across every neighborhood will show up here.</p>
          ) : (
            <div className="message-list">
              {messages.map((m) => (
                <div key={m.id} className={`message-item ${m.resolved ? 'message-resolved' : ''}`}>
                  <div className="message-item-head">
                    <span className="message-from">
                      {m.neighborhood_id ? (neighborhoodNameById[m.neighborhood_id] || 'Unknown neighborhood') : 'General inquiry'} · {m.name || 'Anonymous'}{m.email ? ` · ${m.email}` : ''}
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
        </div>

        <div className="overview-card">
          <h2 className="section-title">
            Pending requests {requests.length > 0 ? <span className="badge badge-inactive">{requests.length}</span> : null}
          </h2>
          {requestError ? <div className="error-msg">{requestError}</div> : null}
          {loading ? null : requests.length === 0 ? (
            <p className="sub">No new directory requests right now.</p>
          ) : (
            <div className="message-list">
              {requests.map((r) => (
                <div key={r.id} className="message-item">
                  <div className="message-item-head">
                    <span className="message-from">{r.name} · /n/{r.slug}{r.city ? ` · ${r.city}` : ''}</span>
                    <span className="message-time">{relativeTime(r.created_at)}</span>
                  </div>
                  {r.tagline ? <p className="message-text" style={{ marginBottom: 4 }}>{r.tagline}</p> : null}
                  <p className="message-text" style={{ marginBottom: 4 }}>
                    Categories: {(r.categories || []).join(', ') || '(none given)'}
                  </p>
                  <p className="message-text">
                    Contact: {r.contact_name ? `${r.contact_name} — ` : ''}{r.contact_email}
                    {' '}
                    <span className={`badge ${r.email_verified ? 'badge-active' : 'badge-inactive'}`}>
                      {r.email_verified ? 'Email verified' : 'Awaiting email verification'}
                    </span>
                  </p>
                  <div className="message-actions">
                    <button
                      className="btn-secondary"
                      disabled={busyRequestId === r.id || !r.email_verified}
                      title={r.email_verified ? undefined : "Can't approve until the requester verifies their email"}
                      onClick={() => approveRequest(r)}
                    >
                      {busyRequestId === r.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button className="btn-ghost danger" disabled={busyRequestId === r.id} onClick={() => { setRejectTarget(r); setRejectNote('') }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overview-card">
          <h2 className="section-title">Neighborhoods by city</h2>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : neighborhoods.length === 0 ? (
            <div className="empty"><strong>No neighborhoods yet</strong></div>
          ) : (
            neighborhoodsByCity.map(([city, group]) => (
              <div key={city} className="overview-subgroup">
                <h3 className="overview-subgroup-title">{city} <span className="badge badge-neutral">{group.length}</span></h3>
                <div className="user-list">
                  {group.map((n) => (
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
                        <button className="btn-ghost" disabled={busyId === n.id} onClick={() => startRename(n)}>Edit</button>
                        <button className="btn-ghost" disabled={busyId === n.id} onClick={() => toggleActive(n)}>
                          {n.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn-ghost danger" disabled={busyId === n.id} onClick={() => setDeleteTarget(n)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="overview-card">
          <h2 className="section-title">Users by neighborhood</h2>
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
          {userMsg ? <div className="success-msg">{userMsg}</div> : null}

          {loading ? null : filteredUsers.length === 0 ? (
            <p className="sub">No users match.</p>
          ) : (
            <>
              {platformAdminUsers.length > 0 ? (
                <div className="overview-subgroup">
                  <h3 className="overview-subgroup-title">Platform admins <span className="badge badge-neutral">{platformAdminUsers.length}</span></h3>
                  <div className="user-list">{platformAdminUsers.map(renderUserRow)}</div>
                </div>
              ) : null}
              {usersByNeighborhood.map(({ neighborhood: n, users: group }) => (
                <div key={n.id} className="overview-subgroup">
                  <h3 className="overview-subgroup-title">{n.name} <span className="badge badge-neutral">{group.length}</span></h3>
                  <div className="user-list">{group.map(renderUserRow)}</div>
                </div>
              ))}
              {unassignedUsers.length > 0 ? (
                <div className="overview-subgroup">
                  <h3 className="overview-subgroup-title">No neighborhood <span className="badge badge-neutral">{unassignedUsers.length}</span></h3>
                  <div className="user-list">{unassignedUsers.map(renderUserRow)}</div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="overview-grid">
        <div className="overview-card">
          <h2 className="section-title">Disaster recovery backup</h2>
          <p className="sub">Exports every table on the platform as one JSON file you can store off-site.</p>
          {exportError ? <div className="error-msg">{exportError}</div> : null}
          <button type="button" className="btn-primary" disabled={exporting} onClick={exportBackup}>
            {exporting ? 'Exporting…' : 'Export full backup (JSON)'}
          </button>
          {backupLog.length > 0 ? (
            <div className="user-list" style={{ marginTop: 16 }}>
              {backupLog.map((b) => (
                <div className="user-row" key={b.id}>
                  <div className="user-row-main">
                    <strong>{relativeTime(b.created_at)}</strong>
                    <span className="user-row-meta">
                      {Object.entries(b.row_counts || {}).map(([k, v]) => `${v} ${k}`).join(' · ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="sub" style={{ marginTop: 12 }}>No backups taken yet.</p>
          )}
        </div>

        <div className="overview-card">
          <h2 className="section-title">Version history</h2>
          <p className="sub">Track what shipped and when, for your own reference.</p>
          <form className="invite-row" onSubmit={addChangelogEntry} style={{ flexWrap: 'wrap' }}>
            <input type="text" placeholder="Version (e.g. 1.4.0)" value={changelogVersion} onChange={(e) => setChangelogVersion(e.target.value)} style={{ maxWidth: 140 }} />
            <input type="text" placeholder="What changed…" value={changelogSummary} onChange={(e) => setChangelogSummary(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <button type="submit" className="btn-secondary" disabled={changelogSaving}>{changelogSaving ? 'Adding…' : 'Add entry'}</button>
          </form>
          {changelogError ? <div className="error-msg">{changelogError}</div> : null}
          {changelog.length === 0 ? (
            <p className="sub" style={{ marginTop: 12 }}>No entries yet.</p>
          ) : (
            <div className="message-list" style={{ marginTop: 12 }}>
              {changelog.map((c) => (
                <div key={c.id} className="message-item">
                  <div className="message-item-head">
                    <span className="message-from">v{c.version}</span>
                    <span className="message-time">{relativeTime(c.created_at)}</span>
                  </div>
                  <p className="message-text">{c.summary}</p>
                  <div className="message-actions">
                    <button className="btn-ghost danger" onClick={() => deleteChangelogEntry(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editEmailTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditEmailTarget(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <button className="close-x" onClick={() => setEditEmailTarget(null)}>×</button>
            <h2>Edit email</h2>
            <p className="sub">Changes take effect immediately — no confirmation email is sent.</p>
            <form onSubmit={saveEditEmail}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={editEmailValue} onChange={(e) => setEditEmailValue(e.target.value)} autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditEmailTarget(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={busyUserId === editEmailTarget.user_id}>
                  {busyUserId === editEmailTarget.user_id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
            <h2>Edit neighborhood</h2>
            <form onSubmit={saveRename}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>City</label>
                <CityPicker value={renameCityValue} onChange={setRenameCityValue} />
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
