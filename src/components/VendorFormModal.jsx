import { useState } from 'react'
import { findDuplicateVendor } from '../utils/vendorDuplicates'

const STATUSES = ['Verified', 'Unknown']

export default function VendorFormModal({ categories, vendors, existing, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    categories: existing?.categories?.length ? existing.categories : (existing?.category ? [existing.category] : []),
    specialty: existing?.specialty || '',
    is_resident: existing?.is_resident || false,
    status: existing?.status || 'Unknown',
    description: existing?.description || '',
    address: existing?.address || '',
    phone: existing?.phone || '',
    website: existing?.website || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDuplicate, setPendingDuplicate] = useState(null)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (key === 'name' || key === 'phone') setPendingDuplicate(null)
  }
  const updateCheckbox = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))
  const toggleCategory = (c) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Give this vendor a name before saving.")
      return
    }
    if (form.categories.length === 0) {
      setError("Pick at least one category before saving.")
      return
    }
    const duplicate = findDuplicateVendor(form, vendors || [], existing?.id)
    if (duplicate && pendingDuplicate?.id !== duplicate.id) {
      setError('')
      setPendingDuplicate(duplicate)
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
        {pendingDuplicate ? (
          <div className="warning-msg">
            "{pendingDuplicate.name}" is already in the directory{pendingDuplicate.phone && form.phone ? ' with this phone number' : ''} — click {existing ? 'Save changes' : 'Add vendor'} again to add this one anyway.
          </div>
        ) : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Business name *</label>
            <input type="text" value={form.name} onChange={update('name')} autoFocus />
          </div>
          <div className="field">
            <label>Categories * <span className="hint" style={{ display: 'inline' }}>— a vendor can do more than one</span></label>
            <div className="category-checkbox-grid">
              {categories.map((c) => (
                <label key={c} className="category-checkbox">
                  <input type="checkbox" checked={form.categories.includes(c)} onChange={() => toggleCategory(c)} />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Verified by neighbors?</label>
              <select value={form.status} onChange={update('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 9 }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.is_resident} onChange={updateCheckbox('is_resident')} />
                Lives in this neighborhood
              </label>
            </div>
          </div>
          <div className="field">
            <label>Specialty</label>
            <input type="text" value={form.specialty} onChange={update('specialty')} placeholder="e.g. Plomero, A/C Tecnico" />
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
