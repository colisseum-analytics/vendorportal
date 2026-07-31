import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { downloadVendorCsvTemplate } from '../utils/vendorCsvTemplate'
import CityPicker from '../components/CityPicker.jsx'
import ContactAdminModal from '../components/ContactAdminModal.jsx'

const LAUNCH_STATES = ['FL']

const DEFAULT_CATEGORIES = [
  'Home Repair & Trades',
  'Cleaning',
  'Auto & Transportation',
  'Personal Care',
  'Health & Wellness',
  'Pet Care',
  'Insurance',
  'Food',
  'Professional Services',
]
const DEFAULT_TAGLINE = 'A resident-run guide to trusted local vendors.'

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CreateNeighborhood() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE)
  const [city, setCity] = useState('')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [outOfStateContactOpen, setOutOfStateContactOpen] = useState(false)

  const onNameChange = (e) => {
    const val = e.target.value
    setName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  const toggleCategory = (c) => {
    setCategories((list) =>
      list.includes(c) ? list.filter((x) => x !== c) : DEFAULT_CATEGORIES.filter((d) => d === c || list.includes(d))
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const cleanSlug = slugify(slug)
    if (!name.trim() || !cleanSlug) {
      setError('Give your neighborhood a name.')
      return
    }
    if (!contactName.trim()) {
      setError('Add your full name.')
      return
    }
    if (!contactEmail.trim()) {
      setError("Add the email you'll use to sign in once this is approved.")
      return
    }
    if (!city.trim()) {
      setError('Add the city this neighborhood is in.')
      return
    }
    setSaving(true)
    setError('')

    const { data: existing } = await supabase.from('neighborhoods').select('id').eq('slug', cleanSlug).maybeSingle()
    if (existing) {
      setSaving(false)
      setError('That web address is already taken — try another.')
      return
    }

    const { error: insertError } = await supabase.from('neighborhood_requests').insert({
      name: name.trim(),
      slug: cleanSlug,
      tagline: tagline.trim() || null,
      city: city.trim(),
      categories,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim().toLowerCase(),
    })
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>Request submitted</h1>
          <p className="sub">
            A platform admin will review "{name}" shortly. Once approved, come back and
            {' '}<Link to={`/signup?redirect=/n/${slugify(slug)}/admin`}>create an account with {contactEmail}</Link>{' '}
            — that exact email becomes the directory's first admin automatically.
          </p>
          <p className="sub">In the meantime, you can get your vendor list ready:</p>
          <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => downloadVendorCsvTemplate(categories)}>
            Download CSV template
          </button>
          <p className="auth-switch"><Link to="/">← Back home</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>Start a directory</h1>
        <p className="sub">
          No account needed yet — submit the basics below for review. Once a platform admin
          approves it, you'll create an account and become the first admin.
        </p>
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
            <label>City *</label>
            <CityPicker value={city} onChange={setCity} restrictTo={LAUNCH_STATES} />
            <div className="hint">
              The broader city/metro area — used for cross-neighborhood city search. We're currently only onboarding
              neighborhoods in Florida.{' '}
              <button type="button" className="footer-link" onClick={() => setOutOfStateContactOpen(true)}>
                Interested in another state? Let us know.
              </button>
            </div>
          </div>
          <div className="field">
            <label>Vendor categories</label>
            <div className="category-checkbox-grid">
              {DEFAULT_CATEGORIES.map((c) => (
                <label key={c} className="category-checkbox">
                  <input type="checkbox" checked={categories.includes(c)} onChange={() => toggleCategory(c)} />
                  {c}
                </label>
              ))}
            </div>
            <div className="hint">Pick the ones that fit your neighborhood. You can change these later.</div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Your full name *</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Rodriguez" />
            </div>
            <div className="field">
              <label>Your email *</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <div className="hint" style={{ marginBottom: 14 }}>
            Once approved, sign up with this exact email to become the admin.
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Submitting…' : 'Submit for approval'}
          </button>
        </form>
        <p className="auth-switch">Already an admin somewhere? <Link to="/login">Log in</Link></p>
      </div>

      <div className="auth-card" style={{ marginTop: 16 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>Get ready to import vendors</h2>
        <p className="sub" style={{ marginBottom: 14 }}>
          See the columns we expect for a bulk vendor import — handy to fill in while your request is reviewed.
        </p>
        <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => downloadVendorCsvTemplate(categories)}>
          Download CSV template
        </button>
      </div>

      {outOfStateContactOpen ? (
        <ContactAdminModal
          title="Interested in another state?"
          description="We're focused on Florida for now, but tell us where you'd like to see this next."
          onCancel={() => setOutOfStateContactOpen(false)}
        />
      ) : null}
    </div>
  )
}
