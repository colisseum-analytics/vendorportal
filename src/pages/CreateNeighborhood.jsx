import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { downloadVendorCsvTemplate } from '../utils/vendorCsvTemplate'
import CityPicker from '../components/CityPicker.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

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
  const { t } = useLanguage()
  usePageMeta({ title: t('createNeighborhood.title'), description: t('createNeighborhood.subtitle') })
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
      setError(t('createNeighborhood.errorNeedName'))
      return
    }
    if (!contactName.trim()) {
      setError(t('createNeighborhood.errorNeedFullName'))
      return
    }
    if (!contactEmail.trim()) {
      setError(t('createNeighborhood.errorNeedEmail'))
      return
    }
    if (!city.trim()) {
      setError(t('createNeighborhood.errorNeedCity'))
      return
    }
    setSaving(true)
    setError('')

    const { data: existing } = await supabase.from('neighborhoods').select('id').eq('slug', cleanSlug).maybeSingle()
    if (existing) {
      setSaving(false)
      setError(t('createNeighborhood.errorSlugTaken'))
      return
    }

    const cleanEmail = contactEmail.trim().toLowerCase()
    const { error: insertError } = await supabase.from('neighborhood_requests').insert({
      name: name.trim(),
      slug: cleanSlug,
      tagline: tagline.trim() || null,
      city: city.trim(),
      categories,
      contact_name: contactName.trim() || null,
      contact_email: cleanEmail,
    })
    if (insertError) {
      setSaving(false)
      setError(insertError.message)
      return
    }

    // Sends a magic-link email (via Supabase's built-in email sender) that
    // both confirms this is really their inbox and creates their account —
    // approval later grants that account admin rights directly, no
    // separate signup step needed.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/verify-request` },
    })
    setSaving(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('createNeighborhood.submittedTitle')}</h1>
          <p className="sub">{t('createNeighborhood.submittedBody1', { name, email: contactEmail })}</p>
          <p className="sub">{t('createNeighborhood.submittedBody2')}</p>
          <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => downloadVendorCsvTemplate(categories)}>
            {t('createNeighborhood.downloadTemplateButton')}
          </button>
          <p className="auth-switch"><Link to="/">{t('createNeighborhood.backHome')}</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div className="auth-card">
        <h1>{t('createNeighborhood.title')}</h1>
        <p className="sub">{t('createNeighborhood.subtitle')}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('createNeighborhood.nameLabel')}</label>
            <input type="text" value={name} onChange={onNameChange} placeholder={t('createNeighborhood.namePlaceholder')} autoFocus />
          </div>
          <div className="field">
            <label>{t('createNeighborhood.webAddressLabel')}</label>
            <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }} placeholder="sandpiper-cove" />
            <div className="hint">yoursite.com/n/{slug || 'your-neighborhood'}</div>
          </div>
          <div className="field">
            <label>{t('createNeighborhood.taglineLabel')}</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder={DEFAULT_TAGLINE} />
          </div>
          <div className="field">
            <label>{t('createNeighborhood.cityLabel')}</label>
            <CityPicker value={city} onChange={setCity} />
            <div className="hint">{t('createNeighborhood.cityHint')}</div>
          </div>
          <div className="field">
            <label>{t('createNeighborhood.categoriesLabel')}</label>
            <div className="category-checkbox-grid">
              {DEFAULT_CATEGORIES.map((c) => (
                <label key={c} className="category-checkbox">
                  <input type="checkbox" checked={categories.includes(c)} onChange={() => toggleCategory(c)} />
                  {t(`createNeighborhood.categoryLabels.${c}`)}
                </label>
              ))}
            </div>
            <div className="hint">{t('createNeighborhood.categoriesHint')}</div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>{t('createNeighborhood.yourFullName')}</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t('createNeighborhood.yourFullNamePlaceholder')} />
            </div>
            <div className="field">
              <label>{t('createNeighborhood.yourEmail')}</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <div className="hint" style={{ marginBottom: 14 }}>
            {t('createNeighborhood.onceApproved')}
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? t('createNeighborhood.submitting') : t('createNeighborhood.submit')}
          </button>
        </form>
        <p className="auth-switch">{t('createNeighborhood.alreadyAdmin')} <Link to="/login">{t('createNeighborhood.logIn')}</Link></p>
      </div>

      <div className="auth-card" style={{ marginTop: 16 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>{t('createNeighborhood.downloadTemplateTitle')}</h2>
        <p className="sub" style={{ marginBottom: 14 }}>{t('createNeighborhood.downloadTemplateBody')}</p>
        <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => downloadVendorCsvTemplate(categories)}>
          {t('createNeighborhood.downloadTemplateButton')}
        </button>
      </div>
    </div>
  )
}
