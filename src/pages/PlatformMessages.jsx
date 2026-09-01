import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function PlatformMessages() {
  usePageMeta({ title: 'Platform admin · Messages', noindex: true })
  const { neighborhoodNameById, reloadCore } = useOutletContext()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvedExpanded, setResolvedExpanded] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleMessageResolved = async (msg) => {
    const { data } = await supabase.from('contact_messages').update({ resolved: !msg.resolved }).eq('id', msg.id).select().maybeSingle()
    if (data) setMessages((list) => list.map((m) => (m.id === msg.id ? data : m)))
    await reloadCore()
  }

  const deleteMessage = async (id) => {
    await supabase.from('contact_messages').delete().eq('id', id)
    setMessages((list) => list.filter((m) => m.id !== id))
    await reloadCore()
  }

  const renderMessage = (m) => (
    <div key={m.id} className={`message-item ${m.resolved ? 'message-resolved' : ''}`}>
      <div className="message-item-head">
        <span className="message-from">
          {m.category ? <span className={`badge ${m.category === 'issue' ? 'badge-inactive' : 'badge-active'}`}>{m.category === 'issue' ? 'Issue' : 'Idea'}</span> : null}
          {' '}{m.neighborhood_id ? (neighborhoodNameById[m.neighborhood_id] || 'Unknown neighborhood') : 'General inquiry'} · {m.name || 'Anonymous'}{m.email ? ` · ${m.email}` : ''}{m.unit ? ` · Unit/Address ${m.unit}` : ''}
        </span>
        <span className="message-time">{relativeTime(m.created_at)}</span>
      </div>
      <p className="message-text">{m.message}</p>
      <div className="message-actions">
        <button className="btn-ghost" onClick={() => toggleMessageResolved(m)}>{m.resolved ? 'Reopen' : 'Mark resolved'}</button>
        <button className="btn-ghost danger" onClick={() => deleteMessage(m.id)}>Delete</button>
      </div>
    </div>
  )

  const unresolved = messages.filter((m) => !m.resolved)
  const resolved = messages.filter((m) => m.resolved)

  return (
    <div className="overview-card">
      <h2 className="section-title">Messages</h2>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : messages.length === 0 ? (
        <p className="sub">Nothing yet — suggestions and concerns submitted across every neighborhood will show up here.</p>
      ) : (
        <>
          {unresolved.length > 0 ? (
            <div className="message-list">{unresolved.map(renderMessage)}</div>
          ) : (
            <p className="sub">No unresolved messages — nice and clear.</p>
          )}

          {resolved.length > 0 ? (
            <div className="overview-subgroup" style={{ marginTop: 18 }}>
              <button type="button" className="changelog-group-toggle" onClick={() => setResolvedExpanded((v) => !v)}>
                <span className={`changelog-group-chevron ${resolvedExpanded ? 'changelog-group-chevron-open' : ''}`}>▸</span>
                <h3 className="overview-subgroup-title" style={{ margin: 0 }}>
                  Resolved <span className="badge badge-neutral">{resolved.length}</span>
                </h3>
              </button>
              {resolvedExpanded ? (
                <div className="message-list" style={{ marginTop: 8 }}>{resolved.map(renderMessage)}</div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
