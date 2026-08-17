import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import CityPicker from '../components/CityPicker.jsx'
import CategoryManager from '../components/CategoryManager.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function AdminSettings() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { neighborhood, isAdmin, reloadNeighborhood: reload } = useOutletContext()
  usePageMeta({ title: neighborhood ? `${neighborhood.name} · Configuration` : 'Configuration', noindex: true })

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    if (!neighborhood) return
    setName(neighborhood.name || '')
    setTagline(neighborhood.tagline || '')
    setCity(neighborhood.city || '')
  }, [neighborhood])

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoError('Image is too large — please use one under 3MB.')
      return
    }
    setLogoError('')
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${neighborhood.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('neighborhood-logos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (uploadError) {
      setLogoUploading(false)
      setLogoError(uploadError.message)
      return
    }
    const { data: pub } = supabase.storage.from('neighborhood-logos').getPublicUrl(path)
    const logo_url = `${pub.publicUrl}?v=${Date.now()}`
    const { error: dbError } = await supabase.from('neighborhoods').update({ logo_url }).eq('id', neighborhood.id)
    setLogoUploading(false)
    if (dbError) {
      setLogoError(dbError.message)
      return
    }
    reload()
  }

  const removeLogo = async () => {
    setLogoUploading(true)
    await supabase.from('neighborhoods').update({ logo_url: null }).eq('id', neighborhood.id)
    setLogoUploading(false)
    reload()
  }

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
    const { error } = await supabase
      .from('neighborhoods')
      .update({ name: name.trim(), tagline: tagline.trim(), city: city.trim() || null })
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
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>Directory configuration</h1>
        <p className="tagline">These changes are visible to everyone browsing the public directory.</p>
      </div>

      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="field logo-field">
          <label>Neighborhood logo</label>
          <div className="logo-row">
            {neighborhood.logo_url ? (
              <img src={neighborhood.logo_url} alt="" className="logo-preview" />
            ) : (
              <div className="logo-preview logo-placeholder">{neighborhood.name?.[0]?.toUpperCase() || '?'}</div>
            )}
            <div className="logo-actions">
              <label className="btn-secondary logo-upload-btn">
                {logoUploading ? 'Uploading…' : neighborhood.logo_url ? 'Replace' : 'Upload image'}
                <input type="file" accept="image/*" onChange={uploadLogo} disabled={logoUploading} hidden />
              </label>
              {neighborhood.logo_url ? (
                <button type="button" className="btn-ghost" onClick={removeLogo} disabled={logoUploading}>Remove</button>
              ) : null}
            </div>
          </div>
          {logoError ? <div className="error-msg">{logoError}</div> : null}
          <div className="hint">Square images work best. Shown next to the neighborhood name across the site.</div>
        </div>

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
            <label>City</label>
            <CityPicker value={city} onChange={setCity} />
            <div className="hint">The broader city/metro area — used for cross-neighborhood city search.</div>
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

      <div className="auth-card" style={{ maxWidth: 520, marginTop: 16 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>Vendor categories</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Changes here save immediately.</p>
        <CategoryManager neighborhood={neighborhood} onChanged={reload} />
      </div>
    </div>
  )
}
