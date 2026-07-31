import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ContactAdminModal({ neighborhood, title, description, onCancel }) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      setError(t('contactModal.needsMessage'))
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
            <h2>{t('contactModal.sentTitle')}</h2>
            <p className="sub">
              {neighborhood
                ? t('contactModal.sentBodyNeighborhood', { name: neighborhood.name })
                : t('contactModal.sentBodyGeneral')}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={onCancel} style={{ width: '100%' }}>{t('common.done')}</button>
            </div>
          </>
        ) : (
          <>
            <h2>{title || t('contactModal.titleNeighborhood')}</h2>
            <p className="sub">{description || t('contactModal.descriptionNeighborhood', { name: neighborhood?.name })}</p>
            {error ? <div className="error-msg">{error}</div> : null}
            <form onSubmit={submit}>
              <div className="field">
                <label>{t('contactModal.messageLabel')}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('contactModal.messagePlaceholder')} autoFocus style={{ minHeight: 100 }} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t('contactModal.nameLabel')}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>{t('contactModal.emailLabel')}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('contactModal.emailHint')} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={sending}>{sending ? t('common.sending') : t('common.send')}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
