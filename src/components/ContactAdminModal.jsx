import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const CATEGORIES = [
  { key: 'issue', icon: '⚠' },
  { key: 'idea', icon: '💡' },
]

export default function ContactAdminModal({ neighborhood, membershipUnit, onCancel }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const location = useLocation()
  const [category, setCategory] = useState(null)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [unit, setUnit] = useState(membershipUnit || '')
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
      category,
      name: name.trim() || null,
      email: email.trim() || null,
      unit: unit.trim() || null,
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

        {!user ? (
          <>
            <h2>{t('contactModal.loginRequiredTitle')}</h2>
            <p className="sub">{t('contactModal.loginRequiredBody')}</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
              <Link className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }} to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                {t('contactModal.loginCta')}
              </Link>
            </div>
          </>
        ) : sent ? (
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
        ) : !category ? (
          <>
            <h2>{t('contactModal.categoryPrompt')}</h2>
            <p className="sub">{t('contactModal.categoryPromptSub', { name: neighborhood?.name })}</p>
            <div className="contact-category-grid">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="contact-category-card"
                  onClick={() => setCategory(c.key)}
                >
                  <span className="contact-category-icon">{c.icon}</span>
                  <span className="contact-category-label">{t(`contactModal.${c.key}Label`)}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel} style={{ width: '100%' }}>{t('common.cancel')}</button>
            </div>
          </>
        ) : (
          <>
            <h2>{t(`contactModal.${category}Title`)}</h2>
            <p className="sub">{t(`contactModal.${category}Description`, { name: neighborhood?.name })}</p>
            {error ? <div className="error-msg">{error}</div> : null}
            <form onSubmit={submit}>
              <div className="field">
                <label>{t('contactModal.messageLabel')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t(`contactModal.${category}Placeholder`)}
                  autoFocus
                  style={{ minHeight: 100 }}
                />
              </div>
              <p className="hint" style={{ margin: '-4px 0 10px' }}>{t('contactModal.verifyHint')}</p>
              <div className="field-row">
                <div className="field">
                  <label>{t('contactModal.nameLabel')}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>{t('contactModal.emailLabel')}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>{t('contactModal.unitLabel')}</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('contactModal.unitPlaceholder')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setCategory(null)}>{t('contactModal.back')}</button>
                <button type="submit" className="btn-primary" disabled={sending}>{sending ? t('common.sending') : t('common.send')}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
