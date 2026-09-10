import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { findDuplicateVendor } from '../utils/vendorDuplicates'

const STATUSES = ['Verified', 'Unknown']

export default function VendorFormModal({ categories, vendors, neighborhood, existing, onCancel, onSave }) {
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
    flyer_url: existing?.flyer_url || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDuplicate, setPendingDuplicate] = useState(null)
  const [flyerUploading, setFlyerUploading] = useState(false)
  const [flyerError, setFlyerError] = useState('')

  const uploadFlyer = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFlyerError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFlyerError('Image is too large — please use one under 5MB.')
      return
    }
    setFlyerError('')
    setFlyerUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${neighborhood.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('vendor-flyers').upload(path, file, { cacheControl: '3600' })
    if (uploadError) {
      setFlyerUploading(false)
      setFlyerError(uploadError.message)
      return
    }
    const { data: pub } = supabase.storage.from('vendor-flyers').getPublicUrl(path)
    setForm((f) => ({ ...f, flyer_url: pub.publicUrl }))
    setFlyerUploading(false)
  }

  const removeFlyer = () => setForm((f) => ({ ...f, flyer_url: '' }))

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
      await onSave({ ...form, name: form.name.trim(), flyer_url: form.flyer_url || null })
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
          <div className="field">
            <label>Flyer (optional)</label>
            {flyerError ? <div className="error-msg">{flyerError}</div> : null}
            <div className="logo-row">
              {form.flyer_url ? (
                <img src={form.flyer_url} alt="" className="logo-preview" />
              ) : null}
              <div className="logo-actions">
                <label className="btn-secondary logo-upload-btn">
                  {flyerUploading ? 'Uploading…' : form.flyer_url ? 'Replace' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={uploadFlyer} disabled={flyerUploading} hidden />
                </label>
                {form.flyer_url ? (
                  <button type="button" className="btn-ghost" onClick={removeFlyer} disabled={flyerUploading}>Remove</button>
                ) : null}
              </div>
            </div>
            <div className="hint">Shown to residents as a tappable flyer icon on this vendor's card — handy if they already have a promotional image.</div>
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
