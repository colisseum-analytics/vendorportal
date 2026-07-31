import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PASSWORD_RULES, isPasswordValid } from '../utils/passwordPolicy'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ResetPassword() {
  const { t } = useLanguage()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Clicking the emailed link redirects here with a recovery token in the
    // URL; supabase-js exchanges it for a session automatically and fires
    // this event once that's done.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isPasswordValid(password)) {
      setError(t('resetPassword.errorPasswordRules'))
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/'), 1500)
  }

  if (done) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('resetPassword.doneTitle')}</h1>
          <p className="sub">{t('resetPassword.doneBody')}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('resetPassword.waitingTitle')}</h1>
          <p className="sub">{t('resetPassword.waitingBody')}</p>
          <Link className="btn-ghost" to="/forgot-password">{t('resetPassword.requestNewLink')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('resetPassword.title')}</h1>
        <p className="sub">{t('resetPassword.subtitle')}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('resetPassword.newPasswordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              required
              autoFocus
            />
            <ul className="password-rules">
              {PASSWORD_RULES.map((r) => {
                const met = r.test(password)
                return (
                  <li key={r.key} className={met ? 'rule-met' : touched ? 'rule-unmet' : ''}>
                    <span className="rule-mark">{met ? '✓' : '·'}</span>{r.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
