import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

// To turn on Google / Apple / Microsoft login once you've enabled the
// provider in Supabase Dashboard → Authentication → Providers, just
// add its entry here — no other code changes needed.
// Example: { id: 'google', label: 'Continue with Google' }
const OAUTH_PROVIDERS = []

export default function Login() {
  const { t } = useLanguage()
  usePageMeta({ title: t('login.title'), description: t('login.subtitle'), noindex: true })
  const [step, setStep] = useState('email') // email | code
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const sendCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('code')
  }

  const submitCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setLoading(false)
    if (error) {
      setError(t('login.errorInvalidCode'))
      return
    }
    navigate(redirectTo)
  }

  const oauth = (provider) => {
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + redirectTo } })
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('login.title')}</h1>
        <p className="sub">{t('login.subtitle')}</p>
        {error ? <div className="error-msg">{error}</div> : null}

        {step === 'email' ? (
          <>
            {OAUTH_PROVIDERS.map((p) => (
              <button key={p.id} type="button" className="btn-oauth" onClick={() => oauth(p.id)}>{p.label}</button>
            ))}
            {OAUTH_PROVIDERS.length > 0 ? <div className="divider">or</div> : null}

            <form onSubmit={sendCode}>
              <div className="field">
                <label>{t('login.emailLabel')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? t('login.emailSubmitting') : t('login.emailSubmit')}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={submitCode}>
            <p className="hint" style={{ marginBottom: 14 }}>{t('login.codeHint', { email })}</p>
            <div className="field">
              <label>{t('login.codeLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('login.codeSubmitting') : t('login.codeSubmit')}
            </button>
            <p className="auth-switch">
              <button type="button" className="link-btn" onClick={sendCode} disabled={loading}>{t('login.resendCode')}</button>
              {' · '}
              <button type="button" className="link-btn" onClick={() => { setStep('email'); setCode(''); setError('') }}>{t('login.changeEmail')}</button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
