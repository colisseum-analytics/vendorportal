import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

const DEFAULT_CATEGORIES = ['Food & Drink', 'Home & Repair', 'Health & Wellness', 'Shops & Services', 'Kids & Pets', 'Professional']

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CreateNeighborhood() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [tagline, setTagline] = useState('')
  const [categoriesText, setCategoriesText] = useState(DEFAULT_CATEGORIES.join(', '))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (authLoading) return null

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Start a directory</h1>
          <p className="sub">Create an account first — you'll automatically become the directory's first admin.</p>
          <Link className="btn-primary" to="/signup?redirect=/new" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Create an account</Link>
          <p className="auth-switch">Already have one? <Link to="/login?redirect=/new">Log in</Link></p>
        </div>
      </div>
    )
  }

  const onNameChange = (e) => {
    const val = e.target.value
    setName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  const submit = async (e) => {
    e.preventDefault()
    const cleanSlug = slugify(slug)
    if (!name.trim() || !cleanSlug) {
      setError('Give your neighborhood a name.')
      return
    }
    setSaving(true)
    setError('')
    const categories = categoriesText.split(',').map((c) => c.trim()).filter(Boolean)
    const { data, error } = await supabase.rpc('create_neighborhood', {
      p_name: name.trim(),
      p_slug: cleanSlug,
      p_tagline: tagline.trim(),
      p_categories: categories,
    })
    setSaving(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'That web address is already taken — try another.' : error.message)
      return
    }
    navigate(`/n/${cleanSlug}/admin`)
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>Start a directory</h1>
        <p className="sub">You'll be the first admin. You can invite neighbors to help manage it once it's live.</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Neighborhood name *</label>
            <input type="text" value={name} onChange={onNameChange} placeholder="Sandpiper Cove" autoFocus />
          </div>
          <div className="field">
            <label>Web address</label>
            <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }} placeholder="sandpiper-cove" />
            <div className="hint">yoursite.com/n/{slug || 'your-neighborhood'}</div>
          </div>
          <div className="field">
            <label>One-line description</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A resident-run guide to local businesses" />
          </div>
          <div className="field">
            <label>Vendor categories</label>
            <input type="text" value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} />
            <div className="hint">Comma-separated. You can change these later.</div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Creating…' : 'Create directory'}
          </button>
        </form>
      </div>
    </div>
  )
}
