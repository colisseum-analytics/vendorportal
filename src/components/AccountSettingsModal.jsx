import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function AccountSettingsModal({ onCancel }) {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [nameError, setNameError] = useState('')

  const [email, setEmail] = useState(user?.email || '')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailError, setEmailError] = useState('')

  const [memberships, setMemberships] = useState([])
  const [unitDrafts, setUnitDrafts] = useState({})
  const [unitSavingId, setUnitSavingId] = useState(null)
  const [unitMsg, setUnitMsg] = useState('')
  const [unitError, setUnitError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('neighborhood_members')
        .select('id, neighborhood_id, unit, neighborhoods ( name, slug )')
        .eq('user_id', user.id)
      if (!active) return
      const rows = data || []
      setMemberships(rows)
      setUnitDrafts(Object.fromEntries(rows.map((m) => [m.id, m.unit || ''])))
    }
    load()
    return () => { active = false }
  }, [user.id])

  const saveName = async (e) => {
    e.preventDefault()
    setNameSaving(true)
    setNameError('')
    setNameMsg('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setNameSaving(false)
    if (error) {
      setNameError(error.message)
      return
    }
    setNameMsg(t('accountSettings.nameSaved'))
  }

  const saveEmail = async (e) => {
    e.preventDefault()
    if (email.trim() === user.email) return
    setEmailSaving(true)
    setEmailError('')
    setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    setEmailSaving(false)
    if (error) {
      setEmailError(error.message)
      return
    }
    setEmailMsg(t('accountSettings.emailPendingConfirm', { email: email.trim() }))
  }

  const saveUnit = async (membership) => {
    const nextUnit = (unitDrafts[membership.id] || '').trim()
    if (!nextUnit) {
      setUnitError(t('accountSettings.unitRequired'))
      return
    }
    setUnitSavingId(membership.id)
    setUnitError('')
    setUnitMsg('')
    const { error } = await supabase.from('neighborhood_members').update({ unit: nextUnit }).eq('id', membership.id)
    setUnitSavingId(null)
    if (error) {
      setUnitError(error.message)
      return
    }
    setMemberships((list) => list.map((m) => (m.id === membership.id ? { ...m, unit: nextUnit } : m)))
    setUnitMsg(t('accountSettings.unitSaved'))
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>{t('accountSettings.title')}</h2>
        <p className="sub">{t('accountSettings.subtitle')}</p>

        <form onSubmit={saveName} style={{ marginBottom: 20 }}>
          <div className="field">
            <label>{t('accountSettings.nameLabel')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('accountSettings.namePlaceholder')} />
          </div>
          {nameError ? <div className="error-msg">{nameError}</div> : null}
          {nameMsg ? <div className="success-msg">{nameMsg}</div> : null}
          <button type="submit" className="btn-secondary" disabled={nameSaving}>{nameSaving ? t('common.sending') : t('common.save')}</button>
        </form>

        <form onSubmit={saveEmail} style={{ marginBottom: 20 }}>
          <div className="field">
            <label>{t('accountSettings.emailLabel')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {emailError ? <div className="error-msg">{emailError}</div> : null}
          {emailMsg ? <div className="success-msg">{emailMsg}</div> : null}
          <button type="submit" className="btn-secondary" disabled={emailSaving || email.trim() === user.email}>{emailSaving ? t('common.sending') : t('common.save')}</button>
        </form>

        {memberships.length > 0 ? (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>
              {t('accountSettings.unitLabel')}
            </label>
            {memberships.map((m) => (
              <div className="field-row" key={m.id} style={{ marginBottom: 8 }}>
                <div className="field" style={{ flex: 'none', width: 140, marginBottom: 0 }}>
                  <input type="text" value={unitDrafts[m.id] ?? ''} onChange={(e) => setUnitDrafts((d) => ({ ...d, [m.id]: e.target.value }))} />
                </div>
                <span className="hint" style={{ flex: 1, alignSelf: 'center' }}>{m.neighborhoods?.name}</span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={unitSavingId === m.id || (unitDrafts[m.id] || '').trim() === m.unit}
                  onClick={() => saveUnit(m)}
                >
                  {unitSavingId === m.id ? t('common.sending') : t('common.save')}
                </button>
              </div>
            ))}
            {unitError ? <div className="error-msg">{unitError}</div> : null}
            {unitMsg ? <div className="success-msg">{unitMsg}</div> : null}
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onCancel} style={{ width: '100%' }}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
