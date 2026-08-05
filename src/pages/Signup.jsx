import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PASSWORD_RULES, isPasswordValid } from '../utils/passwordPolicy'
import { useLanguage } from '../context/LanguageContext.jsx'

// Keep this list in sync with Login.jsx — see the note there for how
// to turn on social login later.
const OAUTH_PROVIDERS = []

export default function Signup() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!isPasswordValid(password)) {
      setError(t('signup.errorPasswordRules'))
      return
    }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // If email confirmation is on (the default), there's no session yet.
    if (data.session) {
      navigate(redirectTo)
    } else {
      setDone(true)
    }
  }

  const oauth = (provider) => {
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + redirectTo } })
  }

  if (done) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('signup.checkEmailTitle')}</h1>
          <p className="sub">{t('signup.checkEmailBody', { email })}</p>
          <Link className="btn-ghost" to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>{t('signup.goToLogin')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('signup.title')}</h1>
        <p className="sub">{t('signup.subtitle')}</p>
        <p className="hint" style={{ marginBottom: 14 }}>{t('signup.verifyNotice')}</p>
        {error ? <div className="error-msg">{error}</div> : null}

        {OAUTH_PROVIDERS.map((p) => (
          <button key={p.id} type="button" className="btn-oauth" onClick={() => oauth(p.id)}>{p.label}</button>
        ))}
        {OAUTH_PROVIDERS.length > 0 ? <div className="divider">or</div> : null}

        <form onSubmit={submit}>
          <div className="field">
            <label>{t('signup.emailLabel')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>{t('signup.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              required
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
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>
        <p className="auth-switch">{t('signup.alreadyHaveAccount')} <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>{t('signup.logIn')}</Link></p>
      </div>
    </div>
  )
}
