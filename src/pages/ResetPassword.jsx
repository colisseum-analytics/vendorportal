import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PASSWORD_RULES, isPasswordValid } from '../utils/passwordPolicy'

export default function ResetPassword() {
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
      setError('Your password needs to meet all the requirements below.')
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
          <h1>Password updated</h1>
          <p className="sub">Taking you home…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Reset your password</h1>
          <p className="sub">
            Waiting for the reset link to verify — if you opened this page directly instead of from the
            email, request a new link.
          </p>
          <Link className="btn-ghost" to="/forgot-password">Request a reset link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <p className="sub">Choose a new password for your account.</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>New password</label>
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
            {saving ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
