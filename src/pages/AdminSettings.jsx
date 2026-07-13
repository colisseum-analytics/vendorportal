import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useNeighborhoodAccess } from '../hooks/useNeighborhoodAccess.js'

export default function AdminSettings() {
  const { slug } = useParams()
  const { user, authLoading, neighborhood, isAdmin, loading, notFound, reload } = useNeighborhoodAccess(slug)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [categoriesText, setCategoriesText] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!neighborhood) return
    setName(neighborhood.name || '')
    setTagline(neighborhood.tagline || '')
    setCategoriesText((neighborhood.categories || []).join(', '))
  }, [neighborhood])

  if (authLoading || loading) return <div className="wrap"><div className="empty" style={{ marginTop: 60 }}>Loading…</div></div>

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Admin login required</h1>
          <p className="sub">Log in to edit this neighborhood's settings.</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/admin/settings`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: 60 }}>
          <strong>Neighborhood not found</strong>
          <Link to="/">← Back to all neighborhoods</Link>
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>No admin access</h1>
          <p className="sub">You're logged in as {user.email}, but you're not an admin of {neighborhood.name}.</p>
          <Link className="btn-ghost" to={`/n/${slug}`}>← View the public directory</Link>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give this neighborhood a name.')
      return
    }
    setSaving(true)
    setError('')
    setSaved(false)
    const categories = categoriesText.split(',').map((c) => c.trim()).filter(Boolean)
    const { error } = await supabase
      .from('neighborhoods')
      .update({ name: name.trim(), tagline: tagline.trim(), categories })
      .eq('id', neighborhood.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    reload()
  }

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <p className="eyebrow"><Link to={`/n/${slug}/admin`}>{neighborhood.name}</Link> · Settings</p>
          <h1>Directory settings</h1>
          <p className="tagline">These changes are visible to everyone browsing the public directory.</p>
        </div>
      </div>

      <div className="auth-card" style={{ maxWidth: 520 }}>
        {error ? <div className="error-msg">{error}</div> : null}
        {saved ? <div className="success-msg">Saved.</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Neighborhood name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>One-line description</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="field">
            <label>Vendor categories</label>
            <input type="text" value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} />
            <div className="hint">Comma-separated. Renaming or removing a category doesn't change existing vendors' saved category — update those individually if needed.</div>
          </div>
          <div className="field">
            <label>Web address</label>
            <input type="text" value={slug} disabled style={{ opacity: 0.6 }} />
            <div className="hint">yoursite.com/n/{slug} — not editable here, since changing it would break any links people already have. Ask a developer to change it directly in Supabase if you really need to.</div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 20 }}><Link className="btn-ghost" to={`/n/${slug}/admin`}>← Back to manage vendors</Link></p>
    </div>
  )
}
