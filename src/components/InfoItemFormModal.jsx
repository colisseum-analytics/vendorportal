import { useState } from 'react'

const SUGGESTED_SUBSECTIONS = {
  hoa_contacts: ['Management office', 'Board members', 'ARC committee', 'Security'],
  community_services: ['Cable provider', 'Internet', 'Water', 'Electric', 'Trash schedule'],
  emergency: ['After-hours maintenance', 'Security company', 'Irrigation emergency', 'Water leak'],
}

export default function InfoItemFormModal({ section, categories, existing, onCancel, onSave }) {
  const isFaq = section === 'faq'
  const suggestions = SUGGESTED_SUBSECTIONS[section] || []

  const [form, setForm] = useState({
    subsection: existing?.subsection || '',
    title: existing?.title || '',
    body: existing?.body || '',
    phone: existing?.phone || '',
    email: existing?.email || '',
    website: existing?.website || '',
    category: existing?.category || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError(isFaq ? 'Add a question before saving.' : 'Give this entry a name before saving.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        subsection: form.subsection.trim() || null,
        title: form.title.trim(),
        body: form.body.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        category: form.category || null,
      })
    } catch (err) {
      setError(err.message || "Couldn't save — try again.")
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>{existing ? 'Edit entry' : 'Add entry'}</h2>
        <p className="sub">Changes appear on the public directory immediately.</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          {!isFaq ? (
            <div className="field">
              <label>Subsection (e.g. {suggestions[0] || 'a group'})</label>
              <input type="text" list="subsection-suggestions" value={form.subsection} onChange={update('subsection')} placeholder={suggestions.join(', ')} />
              <datalist id="subsection-suggestions">
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          ) : null}
          <div className="field">
            <label>{isFaq ? 'Question *' : 'Name *'}</label>
            <input type="text" value={form.title} onChange={update('title')} autoFocus placeholder={isFaq ? 'How do I reserve the clubhouse?' : 'e.g. Jane Doe, Comcast'} />
          </div>
          <div className="field">
            <label>{isFaq ? 'Answer' : 'Notes'}</label>
            <textarea value={form.body} onChange={update('body')} placeholder={isFaq ? 'Contact the management office at least 2 weeks in advance…' : 'Anything residents should know'} />
          </div>
          {isFaq ? (
            <div className="field">
              <label>Link to a vendor category (optional)</label>
              <select value={form.category} onChange={update('category')}>
                <option value="">— None —</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div className="field-row">
              <div className="field">
                <label>Phone</label>
                <input type="text" value={form.phone} onChange={update('phone')} placeholder="(555) 123-4567" />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={update('email')} />
              </div>
            </div>
          )}
          {!isFaq ? (
            <div className="field">
              <label>Website</label>
              <input type="text" value={form.website} onChange={update('website')} placeholder="example.com" />
            </div>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
