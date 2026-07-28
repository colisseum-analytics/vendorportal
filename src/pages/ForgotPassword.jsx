import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ForgotPassword() {
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
          <h1>Check your email</h1>
          <p className="sub">If an account exists for {email}, we sent a link to reset the password.</p>
          <Link className="btn-ghost" to="/login">← Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p className="sub">Enter your account email and we'll send you a link to set a new password.</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="btn-primary" disabled={sending} style={{ width: '100%' }}>
            {sending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="auth-switch"><Link to="/login">← Back to login</Link></p>
      </div>
    </div>
  )
}
