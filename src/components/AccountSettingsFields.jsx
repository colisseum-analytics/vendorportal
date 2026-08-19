import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function AccountSettingsFields() {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [memberships, setMemberships] = useState([])
  const [unitDrafts, setUnitDrafts] = useState({})

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const nameDirty = name.trim() !== (user.user_metadata?.full_name || '')
  const emailDirty = email.trim() !== user.email
  const dirtyMemberships = memberships.filter((m) => (unitDrafts[m.id] || '').trim() !== (m.unit || ''))
  const isDirty = nameDirty || emailDirty || dirtyMemberships.length > 0

  const save = async (e) => {
    e.preventDefault()
    if (!isDirty) return
    setSaving(true)
    setError('')
    setMessage('')
    const messages = []
    const errors = []

    if (nameDirty) {
      const { error: nameError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
      if (nameError) errors.push(nameError.message)
      else messages.push(t('accountSettings.nameSaved'))
    }

    if (emailDirty) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() })
      if (emailError) errors.push(emailError.message)
      else messages.push(t('accountSettings.emailPendingConfirm', { email: email.trim() }))
    }

    if (dirtyMemberships.length > 0) {
      const results = await Promise.all(
        dirtyMemberships.map((m) =>
          supabase.from('neighborhood_members').update({ unit: unitDrafts[m.id].trim() }).eq('id', m.id)
        )
      )
      const failed = results.filter((r) => r.error)
      if (failed.length > 0) errors.push(...failed.map((r) => r.error.message))
      else messages.push(t('accountSettings.unitSaved'))
      setMemberships((list) =>
        list.map((m) => (dirtyMemberships.some((d) => d.id === m.id) ? { ...m, unit: unitDrafts[m.id].trim() } : m))
      )
    }

    setSaving(false)
    if (errors.length > 0) setError(errors.join(' '))
    if (messages.length > 0) setMessage(messages.join(' '))
  }

  return (
    <form onSubmit={save}>
      <div className="field">
        <label>{t('accountSettings.nameLabel')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('accountSettings.namePlaceholder')} />
      </div>

      <div className="field">
        <label>{t('accountSettings.emailLabel')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {memberships.length > 0 ? (
        <div className="field">
          <label>{t('accountSettings.unitLabel')}</label>
          {memberships.map((m) => (
            <div className="field-row" key={m.id} style={{ marginBottom: 8 }}>
              <div className="field" style={{ flex: 'none', width: 140, marginBottom: 0 }}>
                <input type="text" value={unitDrafts[m.id] ?? ''} onChange={(e) => setUnitDrafts((d) => ({ ...d, [m.id]: e.target.value }))} />
              </div>
              <span className="hint" style={{ flex: 1, alignSelf: 'center' }}>{m.neighborhoods?.name}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="error-msg">{error}</div> : null}
      {message ? <div className="success-msg">{message}</div> : null}
      <button type="submit" className="btn-primary" disabled={saving || !isDirty}>{saving ? t('common.sending') : t('common.save')}</button>
    </form>
  )
}
