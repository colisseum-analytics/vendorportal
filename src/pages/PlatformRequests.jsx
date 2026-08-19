import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformRequests() {
  usePageMeta({ title: 'Platform admin · Pending Requests', noindex: true })
  const { reloadCore } = useOutletContext()

  const [requests, setRequests] = useState([])
  const [reviewedRequests, setReviewedRequests] = useState([])
  const [reviewedExpanded, setReviewedExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requestError, setRequestError] = useState('')
  const [busyRequestId, setBusyRequestId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const load = async () => {
    const [{ data: pending }, { data: reviewed }] = await Promise.all([
      supabase.from('neighborhood_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('neighborhood_requests').select('*').neq('status', 'pending').order('reviewed_at', { ascending: false }),
    ])
    setRequests(pending || [])
    setReviewedRequests(reviewed || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approveRequest = async (req) => {
    setBusyRequestId(req.id)
    setRequestError('')
    const { error } = await supabase.rpc('approve_neighborhood_request', { p_request_id: req.id })
    setBusyRequestId(null)
    if (error) {
      setRequestError(error.message)
      return
    }
    await load()
    await reloadCore()
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
    await load()
    await reloadCore()
  }

  return (
    <div className="overview-card">
      <h2 className="section-title">
        Pending requests {requests.length > 0 ? <span className="badge badge-inactive">{requests.length}</span> : null}
      </h2>
      {requestError ? <div className="error-msg">{requestError}</div> : null}
      {loading ? (
        <div className="empty">Loading…</div>
      ) : requests.length === 0 ? (
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

      {reviewedRequests.length > 0 ? (
        <div className="overview-subgroup" style={{ marginTop: 18 }}>
          <button type="button" className="changelog-group-toggle" onClick={() => setReviewedExpanded((v) => !v)}>
            <span className={`changelog-group-chevron ${reviewedExpanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
            <h3 className="overview-subgroup-title" style={{ margin: 0 }}>
              Reviewed <span className="badge badge-neutral">{reviewedRequests.length}</span>
            </h3>
          </button>
          {reviewedExpanded ? (
            <div className="message-list" style={{ marginTop: 8 }}>
              {reviewedRequests.map((r) => (
                <div key={r.id} className="message-item">
                  <div className="message-item-head">
                    <span className="message-from">
                      <span className={`badge ${r.status === 'approved' ? 'badge-active' : 'badge-inactive'}`}>
                        {r.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                      {' '}{r.name} · /n/{r.slug}{r.city ? ` · ${r.city}` : ''}
                    </span>
                    <span className="message-time">{relativeTime(r.reviewed_at || r.created_at)}</span>
                  </div>
                  {r.review_note ? <p className="message-text">Note: {r.review_note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
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
    </div>
  )
}
