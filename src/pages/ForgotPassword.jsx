import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('forgotPassword.checkEmailTitle')}</h1>
          <p className="sub">{t('forgotPassword.checkEmailBody', { email })}</p>
          <Link className="btn-ghost" to="/login">{t('forgotPassword.backToLogin')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('forgotPassword.title')}</h1>
        <p className="sub">{t('forgotPassword.subtitle')}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('forgotPassword.emailLabel')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="btn-primary" disabled={sending} style={{ width: '100%' }}>
            {sending ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>
        <p className="auth-switch"><Link to="/login">{t('forgotPassword.backToLogin')}</Link></p>
      </div>
    </div>
  )
}
