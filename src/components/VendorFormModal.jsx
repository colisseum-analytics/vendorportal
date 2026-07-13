import { useState } from 'react'

const STATUSES = ['Open', 'Closed', 'Seasonal']

export default function VendorFormModal({ categories, existing, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    category: existing?.category || categories[0] || '',
    status: existing?.status || 'Open',
    description: existing?.description || '',
    address: existing?.address || '',
    phone: existing?.phone || '',
    website: existing?.website || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Give this vendor a name before saving.")
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, name: form.name.trim() })
    } catch (err) {
      setError(err.message || "Couldn't save — try again.")
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>{existing ? 'Edit vendor' : 'Add a vendor'}</h2>
        <p className="sub">{existing ? 'Update the details neighbors see.' : 'This appears in the public directory right away.'}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Business name *</label>
            <input type="text" value={form.name} onChange={update('name')} autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Category *</label>
              <select value={form.category} onChange={update('category')}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={update('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Short description</label>
            <textarea value={form.description} onChange={update('description')} placeholder="What they do, what to know before you visit…" />
          </div>
          <div className="field">
            <label>Address</label>
            <input type="text" value={form.address} onChange={update('address')} placeholder="123 Cove Lane" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={update('phone')} placeholder="(555) 123-4567" />
            </div>
            <div className="field">
              <label>Website</label>
              <input type="text" value={form.website} onChange={update('website')} placeholder="example.com" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
