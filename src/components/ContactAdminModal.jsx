import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ContactAdminModal({ neighborhood, title, description, onCancel }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Let the admins know what this is about.')
      return
    }
    setSending(true)
    setError('')
    const { error: insertError } = await supabase.from('contact_messages').insert({
      neighborhood_id: neighborhood ? neighborhood.id : null,
      name: name.trim() || null,
      email: email.trim() || null,
      message: message.trim(),
    })
    setSending(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <button className="close-x" onClick={onCancel}>×</button>
        {sent ? (
          <>
            <h2>Message sent</h2>
            <p className="sub">{neighborhood ? `Thanks — an admin of ${neighborhood.name} will see this.` : 'Thanks — a platform admin will see this.'}</p>
            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={onCancel} style={{ width: '100%' }}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h2>{title || 'Contact the admins'}</h2>
            <p className="sub">{description || `Suggest a vendor, report an update, or flag a concern with ${neighborhood?.name}.`}</p>
            {error ? <div className="error-msg">{error}</div> : null}
            <form onSubmit={submit}>
              <div className="field">
                <label>Message *</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's this about?" autoFocus style={{ minHeight: 100 }} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Name (optional)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Email (optional)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="If you want a reply" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
