import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import ActionMenu from '../components/ActionMenu.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformUsers() {
  usePageMeta({ title: 'Platform admin · Users', noindex: true })
  const { user } = useAuth()
  const { neighborhoods, users, reloadCore } = useOutletContext()

  const [userSearch, setUserSearch] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminSending, setAdminSending] = useState(false)

  const [userError, setUserError] = useState('')
  const [userMsg, setUserMsg] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)
  const [editEmailTarget, setEditEmailTarget] = useState(null)
  const [editEmailValue, setEditEmailValue] = useState('')

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
    await reloadCore()
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
    await reloadCore()
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
    await reloadCore()
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
    await reloadCore()
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
    await reloadCore()
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
    await reloadCore()
  }

  const filteredUsers = users.filter((u) => (u.email || '').toLowerCase().includes(userSearch.toLowerCase()))
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
        <ActionMenu
          items={[
            { label: 'Edit email', onClick: () => startEditEmail(u), disabled: busyUserId === u.user_id },
            { label: 'Send sign-in code', onClick: () => sendSignInCode(u), disabled: busyUserId === u.user_id },
            { label: u.is_platform_admin ? 'Revoke platform admin' : 'Make platform admin', onClick: () => togglePlatformAdmin(u), disabled: busyUserId === u.user_id },
            { label: u.is_banned ? 'Enable account' : 'Disable account', onClick: () => toggleBanned(u), disabled: busyUserId === u.user_id || u.user_id === user.id, danger: true },
            { label: 'Delete account', onClick: () => setDeleteUserTarget(u), disabled: busyUserId === u.user_id || u.user_id === user.id, danger: true },
          ]}
        />
      </div>
    </div>
  )

  return (
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

      {filteredUsers.length === 0 ? (
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
    </div>
  )
}
