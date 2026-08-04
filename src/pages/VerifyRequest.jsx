import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PASSWORD_RULES, isPasswordValid } from '../utils/passwordPolicy'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function VerifyRequest() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | ready | error | done
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function verify() {
      const { error } = await supabase.rpc('verify_my_pending_request')
      if (!active) return
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
        return
      }
      setStatus('ready')
    }

    // Clicking the emailed magic link redirects here with a token in the
    // URL; supabase-js exchanges it for a session automatically and fires
    // this event once that's done — mirrors ResetPassword.jsx's pattern
    // for the recovery-link flow.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') verify()
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) verify()
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isPasswordValid(password)) {
      setErrorMsg(t('verifyRequest.errorPasswordRules'))
      return
    }
    setSaving(true)
    setErrorMsg('')
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setStatus('done')
  }

  if (status === 'verifying') {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('verifyRequest.verifyingTitle')}</h1>
          <p className="sub">{t('verifyRequest.verifyingBody')}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('verifyRequest.errorTitle')}</h1>
          <p className="sub">{errorMsg || t('verifyRequest.errorBody')}</p>
          <Link className="btn-ghost" to="/new">{t('verifyRequest.backToStart')}</Link>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('verifyRequest.doneTitle')}</h1>
          <p className="sub">{t('verifyRequest.doneBody')}</p>
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>
            {t('verifyRequest.doneContinue')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('verifyRequest.readyTitle')}</h1>
        <p className="sub">{t('verifyRequest.readyBody')}</p>
        {errorMsg ? <div className="error-msg">{errorMsg}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('verifyRequest.passwordLabel')}</label>
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
            {saving ? t('verifyRequest.submitting') : t('verifyRequest.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
