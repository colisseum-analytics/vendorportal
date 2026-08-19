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

  return (
    <div className="overview-card">
      <h2 className="section-title">Messages</h2>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : messages.length === 0 ? (
        <p className="sub">Nothing yet — suggestions and concerns submitted across every neighborhood will show up here.</p>
      ) : (
        <div className="message-list">
          {messages.map((m) => (
            <div key={m.id} className={`message-item ${m.resolved ? 'message-resolved' : ''}`}>
              <div className="message-item-head">
                <span className="message-from">
                  {m.category ? <span className={`badge ${m.category === 'issue' ? 'badge-inactive' : 'badge-active'}`}>{m.category === 'issue' ? 'Issue' : 'Idea'}</span> : null}
                  {' '}{m.neighborhood_id ? (neighborhoodNameById[m.neighborhood_id] || 'Unknown neighborhood') : 'General inquiry'} · {m.name || 'Anonymous'}{m.email ? ` · ${m.email}` : ''}{m.unit ? ` · Unit ${m.unit}` : ''}
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
  )
}
