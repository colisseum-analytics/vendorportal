import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Keep this list in sync with Login.jsx — see the note there for how
// to turn on social login later.
const OAUTH_PROVIDERS = []

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const submit = async (e) => {
    e.preventDefault()
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
          <h1>Check your email</h1>
          <p className="sub">We sent a confirmation link to {email}. Click it, then come back and log in.</p>
          <Link className="btn-ghost" to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Go to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="sub">You'll need this to start or manage a neighborhood directory.</p>
        {error ? <div className="error-msg">{error}</div> : null}

        {OAUTH_PROVIDERS.map((p) => (
          <button key={p.id} type="button" className="btn-oauth" onClick={() => oauth(p.id)}>{p.label}</button>
        ))}
        {OAUTH_PROVIDERS.length > 0 ? <div className="divider">or</div> : null}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <div className="hint">At least 6 characters.</div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Log in</Link></p>
      </div>
    </div>
  )
}
