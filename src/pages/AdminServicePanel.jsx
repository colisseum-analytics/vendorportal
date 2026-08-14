import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'
import { relativeTime } from '../utils/relativeTime'
import { SEVERITIES, STATUSES } from '../utils/needConstants'

const SECTIONS = [
  { key: 'needs', label: 'Needs' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'members', label: 'Members' },
]

const MEMBER_ROLES = ['owner', 'renter', 'board_member']
const SEVERITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', emergency: 'Emergency' }
const STATUS_LABELS = { open: 'Open', under_review: 'Under Review', resolved: 'Resolved' }
const MEMBER_ROLE_LABELS = { owner: 'Owner', renter: 'Renter', board_member: 'Board Member' }

export default function AdminServicePanel() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { neighborhood, isAdmin } = useOutletContext()
  usePageMeta({ title: neighborhood ? `${neighborhood.name} · Service Board Admin` : 'Service Board Admin', noindex: true })

  const [activeSection, setActiveSection] = useState('needs')
  const [needs, setNeeds] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [members, setMembers] = useState([])
  const [busyId, setBusyId] = useState(null)

  const [broadcastForm, setBroadcastForm] = useState({ need_id: '', title: '', message: '' })
  const [broadcastSaving, setBroadcastSaving] = useState(false)
  const [broadcastError, setBroadcastError] = useState('')

  const loadNeeds = async () => {
    const { data } = await supabase.from('needs').select('*').eq('neighborhood_id', neighborhood.id).order('created_at', { ascending: false })
    setNeeds(data || [])
  }
  const loadBroadcasts = async () => {
    const { data } = await supabase.from('broadcasts').select('*').eq('neighborhood_id', neighborhood.id).order('created_at', { ascending: false })
    setBroadcasts(data || [])
  }
  const loadMembers = async () => {
    const { data, error } = await supabase.rpc('list_neighborhood_members', { p_neighborhood_id: neighborhood.id })
    if (!error) setMembers(data || [])
  }

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    loadNeeds()
    loadBroadcasts()
    loadMembers()
  }, [neighborhood, isAdmin])

  const updateNeedField = async (needId, field, value) => {
    setBusyId(needId)
    await supabase.from('needs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', needId)
    setBusyId(null)
    await loadNeeds()
  }

  const deleteNeed = async (needId) => {
    await supabase.from('needs').delete().eq('id', needId)
    await loadNeeds()
  }

  const postBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      setBroadcastError('Give this update a title and message.')
      return
    }
    setBroadcastSaving(true)
    setBroadcastError('')
    const { error } = await supabase.from('broadcasts').insert({
      neighborhood_id: neighborhood.id,
      need_id: broadcastForm.need_id || null,
      title: broadcastForm.title.trim(),
      message: broadcastForm.message.trim(),
      posted_by: user.id,
    })
    setBroadcastSaving(false)
    if (error) {
      setBroadcastError(error.message)
      return
    }
    setBroadcastForm({ need_id: '', title: '', message: '' })
    await loadBroadcasts()
  }

  const deleteBroadcast = async (id) => {
    await supabase.from('broadcasts').delete().eq('id', id)
    await loadBroadcasts()
  }

  const updateMemberRole = async (userId, role) => {
    setBusyId(userId)
    await supabase.from('neighborhood_members').update({ role }).eq('neighborhood_id', neighborhood.id).eq('user_id', userId)
    setBusyId(null)
    await loadMembers()
  }

  const removeMember = async (userId) => {
    setBusyId(userId)
    await supabase.from('neighborhood_members').delete().eq('neighborhood_id', neighborhood.id).eq('user_id', userId)
    setBusyId(null)
    await loadMembers()
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to manage this neighborhood's Service Board.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin/board`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
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

  return (
    <div className="wrap">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>Service Board</h1>
        <p className="tagline">Manage resident-posted needs, broadcast official updates, and the member roster.</p>
      </div>

      <div className="neighborhood-nav">
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

      {activeSection === 'needs' ? (
        needs.length === 0 ? (
          <div className="empty"><strong>No needs posted yet</strong>Residents haven't posted anything to the Service Board yet.</div>
        ) : (
          <div className="user-list">
            {needs.map((n) => (
              <div className="user-row" key={n.id}>
                <div className="user-row-main">
                  <strong>{n.title}</strong>
                  <span className="user-row-meta">{n.category} · Unit {n.unit || '—'} · {relativeTime(n.created_at)}</span>
                </div>
                <div className="user-row-actions">
                  <select value={n.severity} disabled={busyId === n.id} onChange={(e) => updateNeedField(n.id, 'severity', e.target.value)}>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                  </select>
                  <select value={n.status} disabled={busyId === n.id} onChange={(e) => updateNeedField(n.id, 'status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <button className="btn-ghost danger" onClick={() => deleteNeed(n.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {activeSection === 'broadcast' ? (
        <>
          <div className="auth-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>📣 Post an official update</h2>
            <p className="sub" style={{ marginBottom: 14 }}>Broadcasts appear at the top of the Service Board, optionally attached to one need.</p>
            {broadcastError ? <div className="error-msg">{broadcastError}</div> : null}
            <form onSubmit={postBroadcast}>
              <div className="field">
                <label>Attach to</label>
                <select value={broadcastForm.need_id} onChange={(e) => setBroadcastForm((f) => ({ ...f, need_id: e.target.value }))}>
                  <option value="">Community-wide (no specific need)</option>
                  {needs.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input type="text" value={broadcastForm.title} onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea value={broadcastForm.message} onChange={(e) => setBroadcastForm((f) => ({ ...f, message: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary" disabled={broadcastSaving} style={{ width: '100%' }}>
                {broadcastSaving ? 'Posting…' : 'Post update'}
              </button>
            </form>
          </div>

          {broadcasts.length === 0 ? (
            <p className="sub">No updates posted yet.</p>
          ) : (
            <div className="message-list">
              {broadcasts.map((b) => (
                <div key={b.id} className="message-item">
                  <div className="message-item-head">
                    <span className="message-from">📣 {b.title}{b.need_id ? ' · attached to a need' : ''}</span>
                    <span className="message-time">{relativeTime(b.created_at)}</span>
                  </div>
                  <p className="message-text">{b.message}</p>
                  <div className="message-actions">
                    <button className="btn-ghost danger" onClick={() => deleteBroadcast(b.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {activeSection === 'members' ? (
        members.length === 0 ? (
          <div className="empty"><strong>No members yet</strong>Residents who join the Service Board will show up here.</div>
        ) : (
          <div className="user-list">
            {members.map((m) => (
              <div className="user-row" key={m.user_id}>
                <div className="user-row-main">
                  <strong>{m.email}</strong>
                  <span className="user-row-meta">Unit {m.unit} · Joined {relativeTime(m.created_at)}</span>
                </div>
                <div className="user-row-roles">
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
        )
      ) : null}
    </div>
  )
}
