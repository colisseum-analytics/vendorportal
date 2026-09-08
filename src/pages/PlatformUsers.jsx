import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import ActionMenu from '../components/ActionMenu.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

const BATCH_SIZE = 50

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function neighborhoodLabel(n) {
  return n.city ? `${n.name} · ${n.city}` : n.name
}

export default function PlatformUsers() {
  usePageMeta({ title: 'Platform admin · Users', noindex: true })
  const { user } = useAuth()
  const { neighborhoods, users, reloadCore } = useOutletContext()

  const [userSearch, setUserSearch] = useState('')
  const [tab, setTab] = useState('all')
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
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignNeighborhoodId, setAssignNeighborhoodId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  const [moveTarget, setMoveTarget] = useState(null) // { user, fromNeighborhood }
  const [moveNeighborhoodId, setMoveNeighborhoodId] = useState('')
  const [moveUnit, setMoveUnit] = useState('')
  const [moveRole, setMoveRole] = useState('owner')
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState(() => new Set())
  const [visibleAll, setVisibleAll] = useState(BATCH_SIZE)
  const [visibleResidents, setVisibleResidents] = useState(BATCH_SIZE)
  const [visibleNeverSignedIn, setVisibleNeverSignedIn] = useState(BATCH_SIZE)
  const [visibleNoActivity, setVisibleNoActivity] = useState(BATCH_SIZE)

  useEffect(() => {
    setVisibleAll(BATCH_SIZE)
    setVisibleResidents(BATCH_SIZE)
    setVisibleNeverSignedIn(BATCH_SIZE)
    setVisibleNoActivity(BATCH_SIZE)
  }, [userSearch, tab])

  const toggleNeighborhoodExpanded = (id) => {
    setExpandedNeighborhoods((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelected = (id) => {
    setSelectedIds((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (ids) => {
    setSelectedIds((set) => {
      const allSelected = ids.every((id) => set.has(id))
      const next = new Set(set)
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const bulkDeleteSelected = async () => {
    setBulkDeleting(true)
    setUserError('')
    const { error } = await supabase.rpc('delete_user_accounts', { p_user_ids: [...selectedIds] })
    setBulkDeleting(false)
    if (error) {
      setUserError(error.message)
      return
    }
    setConfirmBulkDelete(false)
    setSelectedIds(new Set())
    await reloadCore()
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

  const startAssign = (u) => {
    setAssignTarget(u)
    setAssignNeighborhoodId('')
    setAssignError('')
  }

  const assignToNeighborhood = async (e) => {
    e.preventDefault()
    if (!assignNeighborhoodId) return
    setAssigning(true)
    setAssignError('')
    const { error } = await supabase.rpc('add_neighborhood_admin', {
      p_neighborhood_id: assignNeighborhoodId,
      p_user_id: assignTarget.user_id,
    })
    setAssigning(false)
    if (error) {
      setAssignError(error.message)
      return
    }
    setAssignTarget(null)
    await reloadCore()
  }

  const startMove = (u, fromNeighborhood) => {
    setMoveTarget({ user: u, fromNeighborhood })
    setMoveNeighborhoodId('')
    setMoveUnit('')
    setMoveRole('owner')
    setMoveError('')
  }

  // A move only ever touches this one neighborhood_members row — it never
  // touches neighborhood_admins (a separate role) or anything the resident
  // already posted (needs, contact messages, referrals stay attached to
  // whichever neighborhood they actually happened under).
  const submitMove = async (e) => {
    e.preventDefault()
    if (!moveNeighborhoodId || !moveUnit.trim()) return
    setMoving(true)
    setMoveError('')
    const { error } = await supabase
      .from('neighborhood_members')
      .update({ neighborhood_id: moveNeighborhoodId, unit: moveUnit.trim(), role: moveRole })
      .eq('neighborhood_id', moveTarget.fromNeighborhood.id)
      .eq('user_id', moveTarget.user.user_id)
    setMoving(false)
    if (error) {
      setMoveError(
        error.code === '23505'
          ? `${moveTarget.user.email} is already a resident of that neighborhood.`
          : error.message
      )
      return
    }
    setMoveTarget(null)
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
  const neighborhoodAdminUsers = filteredUsers.filter((u) => (u.admin_of || []).length > 0)
  const usersByNeighborhood = neighborhoods
    .map((n) => ({ neighborhood: n, users: filteredUsers.filter((u) => (u.admin_of || []).some((a) => a.id === n.id)) }))
    .filter((g) => g.users.length > 0)
  const noRoleUsers = filteredUsers.filter((u) => !u.is_platform_admin && (u.admin_of || []).length === 0)
  const residentUsers = noRoleUsers.filter((u) => (u.member_of || []).length > 0)
  const neverSignedInUsers = noRoleUsers.filter((u) => (u.member_of || []).length === 0 && !u.last_sign_in_at)
  const noActivityUsers = noRoleUsers.filter((u) => (u.member_of || []).length === 0 && u.last_sign_in_at)
  const lingeringCount = neverSignedInUsers.length + noActivityUsers.length

  const TABS = [
    { key: 'all', label: `All (${filteredUsers.length})` },
    { key: 'admins', label: `Platform admins (${platformAdminUsers.length})` },
    { key: 'neighborhoods', label: `By neighborhood (${neighborhoodAdminUsers.length})` },
    { key: 'residents', label: `Residents (${residentUsers.length})` },
    { key: 'norole', label: `No role (${lingeringCount})` },
  ]

  const renderUserRow = (u, { selectable = false } = {}) => (
    <div className={`user-row ${u.is_banned ? 'user-row-banned' : ''}`} key={u.user_id}>
      {selectable ? (
        <input
          type="checkbox"
          className="user-row-checkbox"
          checked={selectedIds.has(u.user_id)}
          onChange={() => toggleSelected(u.user_id)}
          aria-label={`Select ${u.email}`}
        />
      ) : null}
      <div className="user-row-main">
        <strong>{u.email}{u.user_id === user.id ? ' (you)' : ''}</strong>
        <span className="user-row-meta">
          Joined {formatDate(u.created_at)} · {relativeTime(u.created_at)} · Last sign-in {u.last_sign_in_at ? relativeTime(u.last_sign_in_at) : 'never'}
        </span>
      </div>
      <div className="user-row-roles user-row-roles-stacked">
        {u.is_banned ? <span className="badge badge-inactive">Disabled</span> : null}
        {u.is_platform_admin ? <span className="badge badge-active">Platform admin</span> : null}
        {(u.admin_of || []).map((n) => (
          <span className="badge badge-neutral" key={n.id}>
            {neighborhoodLabel(n)}
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
        {(u.member_of || []).map((n) => (
          <span className="badge badge-neutral" key={n.id} title={`Resident of ${n.name}`}>{neighborhoodLabel(n)}</span>
        ))}
      </div>
      <div className="user-row-actions">
        <ActionMenu
          items={[
            { label: 'Edit email', onClick: () => startEditEmail(u), disabled: busyUserId === u.user_id },
            { label: 'Assign to neighborhood', onClick: () => startAssign(u), disabled: busyUserId === u.user_id },
            ...(u.admin_of || []).map((n) => ({
              label: `Remove from ${n.name}`,
              onClick: () => removeFromNeighborhood(n.id, u.user_id),
              disabled: busyUserId === u.user_id,
              danger: true,
            })),
            ...(u.member_of || []).map((n) => ({
              label: `Move from ${n.name}…`,
              onClick: () => startMove(u, n),
              disabled: busyUserId === u.user_id,
            })),
            { label: 'Send sign-in code', onClick: () => sendSignInCode(u), disabled: busyUserId === u.user_id },
            { label: u.is_platform_admin ? 'Revoke platform admin' : 'Make platform admin', onClick: () => togglePlatformAdmin(u), disabled: busyUserId === u.user_id },
            { label: u.is_banned ? 'Enable account' : 'Disable account', onClick: () => toggleBanned(u), disabled: busyUserId === u.user_id || u.user_id === user.id, danger: true },
            { label: 'Delete account', onClick: () => setDeleteUserTarget(u), disabled: busyUserId === u.user_id || u.user_id === user.id, danger: true },
          ]}
        />
      </div>
    </div>
  )

  const loadMoreRow = (remaining, onClick) =>
    remaining > 0 ? (
      <div className="load-more-row">
        <button type="button" className="btn-secondary" onClick={onClick}>
          Show {Math.min(remaining, BATCH_SIZE)} more
        </button>
      </div>
    ) : null

  return (
    <div className="overview-card">
      <h2 className="section-title">Users</h2>

      <form className="invite-row" onSubmit={addAdmin}>
        <input type="email" placeholder="Grant platform admin by email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        <button type="submit" className="btn-secondary" disabled={adminSending}>{adminSending ? 'Adding…' : 'Grant'}</button>
      </form>
      {adminError ? <div className="error-msg">{adminError}</div> : null}
      {adminMsg ? <div className="success-msg">{adminMsg}</div> : null}

      <div className="field" style={{ maxWidth: 340, marginBottom: 12 }}>
        <input type="text" placeholder="Search users by email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
      </div>
      <div className="status-toggle" style={{ flexWrap: 'wrap', width: 'fit-content', marginBottom: 18 }}>
        {TABS.map((tb) => (
          <button key={tb.key} type="button" className={tab === tb.key ? 'active' : ''} onClick={() => setTab(tb.key)}>{tb.label}</button>
        ))}
      </div>
      {userError ? <div className="error-msg">{userError}</div> : null}
      {userMsg ? <div className="success-msg">{userMsg}</div> : null}

      {filteredUsers.length === 0 ? (
        <p className="sub">No users match.</p>
      ) : tab === 'all' ? (
        <>
          <div className="user-list">{filteredUsers.slice(0, visibleAll).map((u) => renderUserRow(u))}</div>
          {loadMoreRow(filteredUsers.length - visibleAll, () => setVisibleAll((v) => v + BATCH_SIZE))}
        </>
      ) : tab === 'admins' ? (
        platformAdminUsers.length === 0 ? (
          <p className="sub">No platform admins match.</p>
        ) : (
          <div className="user-list">{platformAdminUsers.map((u) => renderUserRow(u))}</div>
        )
      ) : tab === 'neighborhoods' ? (
        usersByNeighborhood.length === 0 ? (
          <p className="sub">No neighborhood admins match.</p>
        ) : (
          usersByNeighborhood.map(({ neighborhood: n, users: group }) => {
            const expanded = expandedNeighborhoods.has(n.id)
            return (
              <div key={n.id} className="overview-subgroup">
                <button type="button" className="changelog-group-toggle" onClick={() => toggleNeighborhoodExpanded(n.id)}>
                  <span className={`changelog-group-chevron ${expanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
                  <h3 className="overview-subgroup-title" style={{ margin: 0 }}>{neighborhoodLabel(n)} <span className="badge badge-neutral">{group.length}</span></h3>
                </button>
                {expanded ? <div className="user-list" style={{ marginTop: 8 }}>{group.map((u) => renderUserRow(u))}</div> : null}
              </div>
            )
          })
        )
      ) : tab === 'residents' ? (
        residentUsers.length === 0 ? (
          <p className="sub">No residents match.</p>
        ) : (
          <>
            <div className="user-list">{residentUsers.slice(0, visibleResidents).map((u) => renderUserRow(u))}</div>
            {loadMoreRow(residentUsers.length - visibleResidents, () => setVisibleResidents((v) => v + BATCH_SIZE))}
          </>
        )
      ) : (
        <div className="overview-subgroup">
          <p className="sub" style={{ marginTop: -4, marginBottom: 12 }}>
            Verified accounts with no membership or admin role anywhere — usually someone who logged in (e.g. to leave feedback) but never followed through. Harmless, but safe to bulk-delete once they've been sitting for a while.
          </p>
          {selectedIds.size > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <button type="button" className="btn-ghost danger" onClick={() => setConfirmBulkDelete(true)}>
                Delete selected ({selectedIds.size})
              </button>
            </div>
          ) : null}
          {neverSignedInUsers.length > 0 ? (
            <div style={{ marginBottom: 14 }}>
              <label className="select-all-row">
                <input
                  type="checkbox"
                  checked={neverSignedInUsers.every((u) => selectedIds.has(u.user_id))}
                  onChange={() => toggleSelectAll(neverSignedInUsers.map((u) => u.user_id))}
                />
                Never completed sign-in <span className="badge badge-neutral">{neverSignedInUsers.length}</span>
              </label>
              <div className="user-list">{neverSignedInUsers.slice(0, visibleNeverSignedIn).map((u) => renderUserRow(u, { selectable: true }))}</div>
              {loadMoreRow(neverSignedInUsers.length - visibleNeverSignedIn, () => setVisibleNeverSignedIn((v) => v + BATCH_SIZE))}
            </div>
          ) : null}
          {noActivityUsers.length > 0 ? (
            <div>
              <label className="select-all-row">
                <input
                  type="checkbox"
                  checked={noActivityUsers.every((u) => selectedIds.has(u.user_id))}
                  onChange={() => toggleSelectAll(noActivityUsers.map((u) => u.user_id))}
                />
                Signed in, no activity <span className="badge badge-neutral">{noActivityUsers.length}</span>
              </label>
              <div className="user-list">{noActivityUsers.slice(0, visibleNoActivity).map((u) => renderUserRow(u, { selectable: true }))}</div>
              {loadMoreRow(noActivityUsers.length - visibleNoActivity, () => setVisibleNoActivity((v) => v + BATCH_SIZE))}
            </div>
          ) : null}
        </div>
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

      {assignTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAssignTarget(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <button className="close-x" onClick={() => setAssignTarget(null)}>×</button>
            <h2>Assign {assignTarget.email} to a neighborhood</h2>
            <p className="sub">Grants admin access directly — works for accounts that already exist, and a user can be an admin of more than one neighborhood.</p>
            {assignError ? <div className="error-msg">{assignError}</div> : null}
            {(() => {
              const alreadyAssigned = new Set((assignTarget.admin_of || []).map((n) => n.id))
              const available = neighborhoods.filter((n) => !alreadyAssigned.has(n.id))
              if (available.length === 0) {
                return <p className="sub">Already an admin of every neighborhood.</p>
              }
              return (
                <form onSubmit={assignToNeighborhood}>
                  <div className="field">
                    <label>Neighborhood</label>
                    <select value={assignNeighborhoodId} onChange={(e) => setAssignNeighborhoodId(e.target.value)} autoFocus>
                      <option value="" disabled>Choose one…</option>
                      {available.map((n) => <option key={n.id} value={n.id}>{neighborhoodLabel(n)}</option>)}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={!assignNeighborhoodId || assigning}>
                      {assigning ? 'Assigning…' : 'Assign'}
                    </button>
                  </div>
                </form>
              )
            })()}
          </div>
        </div>
      ) : null}

      {moveTarget ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setMoveTarget(null) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setMoveTarget(null)}>×</button>
            <h2>Move {moveTarget.user.email}</h2>
            <p className="sub">
              Moves their residency from {moveTarget.fromNeighborhood.name} to another neighborhood. Doesn't affect
              admin access, or anything they've already posted there.
            </p>
            {moveError ? <div className="error-msg">{moveError}</div> : null}
            {(() => {
              const available = neighborhoods.filter((n) => n.id !== moveTarget.fromNeighborhood.id)
              if (available.length === 0) {
                return <p className="sub">No other neighborhood to move them to.</p>
              }
              return (
                <form onSubmit={submitMove}>
                  <div className="field">
                    <label>Move to</label>
                    <select value={moveNeighborhoodId} onChange={(e) => setMoveNeighborhoodId(e.target.value)} autoFocus>
                      <option value="" disabled>Choose one…</option>
                      {available.map((n) => <option key={n.id} value={n.id}>{neighborhoodLabel(n)}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>New unit/address</label>
                    <input type="text" value={moveUnit} onChange={(e) => setMoveUnit(e.target.value)} placeholder="e.g. 4B" />
                  </div>
                  <div className="field">
                    <label>Role there</label>
                    <select value={moveRole} onChange={(e) => setMoveRole(e.target.value)}>
                      <option value="owner">Owner</option>
                      <option value="renter">Renter</option>
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setMoveTarget(null)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={!moveNeighborhoodId || !moveUnit.trim() || moving}>
                      {moving ? 'Moving…' : 'Move'}
                    </button>
                  </div>
                </form>
              )
            })()}
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

      {confirmBulkDelete ? (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmBulkDelete(false) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-x" onClick={() => setConfirmBulkDelete(false)}>×</button>
            <h2>Delete {selectedIds.size} account{selectedIds.size === 1 ? '' : 's'}?</h2>
            <p className="sub">This permanently deletes the selected accounts. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--red)' }} disabled={bulkDeleting} onClick={bulkDeleteSelected}>
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
