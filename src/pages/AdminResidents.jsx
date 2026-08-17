import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

const MEMBER_ROLES = ['owner', 'renter', 'board_member']
const MEMBER_ROLE_LABELS = { owner: 'Owner', renter: 'Renter', board_member: 'Board Member' }

export default function AdminResidents() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { neighborhood, isAdmin } = useOutletContext()
  usePageMeta({ title: neighborhood ? `${neighborhood.name} · Residents` : 'Residents', noindex: true })

  const [members, setMembers] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [unitDrafts, setUnitDrafts] = useState({})

  const [addEmail, setAddEmail] = useState('')
  const [addUnit, setAddUnit] = useState('')
  const [addRole, setAddRole] = useState('owner')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [addMsg, setAddMsg] = useState('')

  const loadMembers = async () => {
    const { data, error } = await supabase.rpc('list_neighborhood_members', { p_neighborhood_id: neighborhood.id })
    if (!error) {
      const rows = data || []
      setMembers(rows)
      setUnitDrafts(Object.fromEntries(rows.map((m) => [m.user_id, m.unit || ''])))
    }
  }

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    loadMembers()
  }, [neighborhood, isAdmin])

  const updateMemberRole = async (userId, role) => {
    setBusyId(userId)
    await supabase.from('neighborhood_members').update({ role }).eq('neighborhood_id', neighborhood.id).eq('user_id', userId)
    setBusyId(null)
    await loadMembers()
  }

  const updateMemberUnit = async (userId) => {
    const unit = (unitDrafts[userId] || '').trim()
    if (!unit) return
    setBusyId(userId)
    await supabase.from('neighborhood_members').update({ unit }).eq('neighborhood_id', neighborhood.id).eq('user_id', userId)
    setBusyId(null)
    await loadMembers()
  }

  const removeMember = async (userId) => {
    setBusyId(userId)
    await supabase.from('neighborhood_members').delete().eq('neighborhood_id', neighborhood.id).eq('user_id', userId)
    setBusyId(null)
    await loadMembers()
  }

  const addResident = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddMsg('')
    if (!addEmail.trim() || !addUnit.trim()) {
      setAddError('Give this resident an email and unit.')
      return
    }
    setAddSaving(true)
    const { error } = await supabase.rpc('admin_add_resident', {
      p_neighborhood_id: neighborhood.id,
      p_email: addEmail.trim(),
      p_unit: addUnit.trim(),
      p_role: addRole,
    })
    setAddSaving(false)
    if (error) {
      setAddError(error.message)
      return
    }
    setAddMsg(`Added ${addEmail.trim()}.`)
    setAddEmail('')
    setAddUnit('')
    setAddRole('owner')
    await loadMembers()
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to manage this neighborhood's residents.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin/residents`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>No admin access</h1>
          <p className="sub">You're logged in as {user.email}, but you're not an admin of {neighborhood.name}.</p>
          <Link className="btn-ghost" to={`/n/${slug}`}>← View the public directory</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>Residents</h1>
        <p className="tagline">The Service Board roster — who's a resident, their unit, and role.</p>
      </div>

      <div className="auth-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>Add a resident</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Only works for an email that already has an account — they need to sign up first if they don't.</p>
        {addError ? <div className="error-msg">{addError}</div> : null}
        {addMsg ? <div className="success-msg">{addMsg}</div> : null}
        <form onSubmit={addResident} className="invite-row" style={{ flexWrap: 'wrap' }}>
          <input type="email" placeholder="resident@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} style={{ flex: 2, minWidth: 180 }} />
          <input type="text" placeholder="Unit" value={addUnit} onChange={(e) => setAddUnit(e.target.value)} style={{ flex: 1, minWidth: 90 }} />
          <select value={addRole} onChange={(e) => setAddRole(e.target.value)}>
            {MEMBER_ROLES.map((r) => <option key={r} value={r}>{MEMBER_ROLE_LABELS[r]}</option>)}
          </select>
          <button type="submit" className="btn-secondary" disabled={addSaving}>{addSaving ? 'Adding…' : 'Add'}</button>
        </form>
      </div>

      {members.length === 0 ? (
        <div className="empty"><strong>No residents yet</strong>Residents who join the Service Board — or that you add above — will show up here.</div>
      ) : (
        <div className="user-list">
          {members.map((m) => (
            <div className="user-row" key={m.user_id}>
              <div className="user-row-main">
                <strong>{m.email}</strong>
                <span className="user-row-meta">Joined {relativeTime(m.created_at)}</span>
              </div>
              <div className="user-row-roles">
                <input
                  type="text"
                  style={{ width: 90 }}
                  value={unitDrafts[m.user_id] ?? ''}
                  onChange={(e) => setUnitDrafts((d) => ({ ...d, [m.user_id]: e.target.value }))}
                />
                <button
                  className="btn-ghost"
                  disabled={busyId === m.user_id || (unitDrafts[m.user_id] || '').trim() === m.unit}
                  onClick={() => updateMemberUnit(m.user_id)}
                >
                  Save unit
                </button>
                {m.is_admin ? (
                  <span className="badge badge-active">Admin</span>
                ) : (
                  <select value={m.role} disabled={busyId === m.user_id} onChange={(e) => updateMemberRole(m.user_id, e.target.value)}>
                    {MEMBER_ROLES.map((r) => <option key={r} value={r}>{MEMBER_ROLE_LABELS[r]}</option>)}
                  </select>
                )}
              </div>
              <div className="user-row-actions">
                <button className="btn-ghost danger" disabled={busyId === m.user_id} onClick={() => removeMember(m.user_id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
