import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const CATEGORIES = [
  { key: 'issue', icon: '⚠' },
  { key: 'idea', icon: '💡' },
]

export default function ContactAdminModal({ neighborhood, membershipUnit, isMember, isAdmin, reloadNeighborhood, onCancel }) {
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

  const [joinName, setJoinName] = useState(user?.user_metadata?.full_name || '')
  const [joinUnit, setJoinUnit] = useState('')
  const [joinRole, setJoinRole] = useState('owner')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const join = async (e) => {
    e.preventDefault()
    if (!joinName.trim()) {
      setJoinError(t('serviceBoard.errorName'))
      return
    }
    if (!joinUnit.trim()) return
    setJoining(true)
    setJoinError('')
    if (joinName.trim() !== (user.user_metadata?.full_name || '')) {
      await supabase.auth.updateUser({ data: { full_name: joinName.trim() } })
    }
    const { error: joinInsertError } = await supabase
      .from('neighborhood_members')
      .insert({ neighborhood_id: neighborhood.id, user_id: user.id, unit: joinUnit.trim(), role: joinRole })
    setJoining(false)
    if (joinInsertError) {
      setJoinError(joinInsertError.message)
      return
    }
    reloadNeighborhood()
  }

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
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>{t('common.cancel')}</button>
              <Link className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }} to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                {t('contactModal.loginCta')}
              </Link>
            </div>
          </>
        ) : neighborhood && !isMember && !isAdmin ? (
          <>
            <h2>{t('serviceBoard.joinTitle')}</h2>
            <p className="sub">{t('serviceBoard.joinBody')}</p>
            {joinError ? <div className="error-msg">{joinError}</div> : null}
            <form onSubmit={join}>
              <div className="field">
                <label>{t('serviceBoard.nameLabel')}</label>
                <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder={t('serviceBoard.namePlaceholder')} autoFocus />
              </div>
              <div className="field">
                <label>{t('serviceBoard.unitLabel')}</label>
                <input type="text" value={joinUnit} onChange={(e) => setJoinUnit(e.target.value)} placeholder={t('serviceBoard.unitPlaceholder')} />
              </div>
              <div className="field">
                <label>{t('serviceBoard.roleLabel')}</label>
                <select value={joinRole} onChange={(e) => setJoinRole(e.target.value)}>
                  <option value="owner">{t('serviceBoard.roleOwner')}</option>
                  <option value="renter">{t('serviceBoard.roleRenter')}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary" disabled={joining}>
                  {joining ? t('serviceBoard.joinSubmitting') : t('serviceBoard.joinSubmit')}
                </button>
              </div>
            </form>
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
