import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ReferVendorModal({ vendors, onCancel, onSave }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    vendor_id: vendors[0]?.id || '',
    estimated_cost: '',
    rating: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.vendor_id) {
      setError(t('serviceBoard.errorPickVendor'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        vendor_id: form.vendor_id,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        rating: form.rating ? Number(form.rating) : null,
        notes: form.notes.trim() || null,
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
        <h2>{t('serviceBoard.referModalTitle')}</h2>
        <p className="sub">{t('serviceBoard.referModalBody')}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        {vendors.length === 0 ? (
          <p className="sub">{t('serviceBoard.noVendorsToRefer')}</p>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('serviceBoard.referVendorLabel')}</label>
              <select value={form.vendor_id} onChange={update('vendor_id')}>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.category ? ` · ${v.category}` : ''}</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>{t('serviceBoard.referCostLabel')}</label>
                <input type="number" min="0" step="1" value={form.estimated_cost} onChange={update('estimated_cost')} placeholder="400" />
              </div>
              <div className="field">
                <label>{t('serviceBoard.referRatingLabel')}</label>
                <select value={form.rating} onChange={update('rating')}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>{t('serviceBoard.referNotesLabel')}</label>
              <textarea value={form.notes} onChange={update('notes')} placeholder={t('serviceBoard.referNotesPlaceholder')} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('serviceBoard.referSubmitting') : t('serviceBoard.referSubmit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
