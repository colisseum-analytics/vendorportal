import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// To turn on Google / Apple / Microsoft login once you've enabled the
// provider in Supabase Dashboard → Authentication → Providers, just
// add its entry here — no other code changes needed.
// Example: { id: 'google', label: 'Continue with Google' }
const OAUTH_PROVIDERS = []

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
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
        <h1>Log in</h1>
        <p className="sub">Log in to manage vendors for your neighborhood.</p>
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">New here? <Link to={`/signup?redirect=${encodeURIComponent(redirectTo)}`}>Create an account</Link></p>
      </div>
    </div>
  )
}
