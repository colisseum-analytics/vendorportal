import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { relativeTime } from '../utils/relativeTime'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function AdminMessages() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { neighborhood, isAdmin } = useOutletContext()
  usePageMeta({ title: neighborhood ? `${neighborhood.name} · Messages` : 'Messages', noindex: true })

  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!neighborhood || !isAdmin) return
    let active = true
    async function load() {
      const { data } = await supabase.from('contact_messages').select('*').eq('neighborhood_id', neighborhood.id).order('created_at', { ascending: false })
      if (!active) return
      setMessages(data || [])
    }
    load()
    return () => { active = false }
  }, [neighborhood, isAdmin])

  const toggleResolved = async (msg) => {
    const { data } = await supabase.from('contact_messages').update({ resolved: !msg.resolved }).eq('id', msg.id).select().maybeSingle()
    if (data) setMessages((list) => list.map((m) => (m.id === msg.id ? data : m)))
  }

  const deleteMessage = async (id) => {
    await supabase.from('contact_messages').delete().eq('id', id)
    setMessages((list) => list.filter((m) => m.id !== id))
  }

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to view this neighborhood's messages.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin/messages`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
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

  const unresolvedCount = messages.filter((m) => !m.resolved).length

  return (
    <div className="wrap">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>
          Messages {unresolvedCount > 0 ? <span className="badge badge-inactive">{unresolvedCount} new</span> : null}
        </h1>
        <p className="tagline">Issues and ideas submitted through this neighborhood's "Contact admins" form.</p>
      </div>

      {messages.length === 0 ? (
        <div className="empty">
          <strong>Nothing here yet</strong>
          Suggestions and concerns from the public directory's "Contact admins" form will show up here.
        </div>
      ) : (
        <div className="message-list">
          {messages.map((m) => (
            <div key={m.id} className={`message-item ${m.resolved ? 'message-resolved' : ''}`}>
              <div className="message-item-head">
                <span className="message-from">
                  {m.category ? <span className={`badge ${m.category === 'issue' ? 'badge-inactive' : 'badge-active'}`}>{m.category === 'issue' ? 'Issue' : 'Idea'}</span> : null}
                  {' '}{m.name || 'Anonymous'}{m.email ? ` · ${m.email}` : ''}{m.unit ? ` · Unit ${m.unit}` : ''}
                </span>
                <span className="message-time">{relativeTime(m.created_at)}</span>
              </div>
              <p className="message-text">{m.message}</p>
              <div className="message-actions">
                <button className="btn-ghost" onClick={() => toggleResolved(m)}>{m.resolved ? 'Reopen' : 'Mark resolved'}</button>
                <button className="btn-ghost danger" onClick={() => deleteMessage(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
