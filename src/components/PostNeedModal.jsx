import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { NEED_CATEGORIES, SEVERITIES, SEVERITY_LABEL_KEY } from '../utils/needConstants'

export default function PostNeedModal({ onCancel, onSave }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: NEED_CATEGORIES[0],
    severity: 'medium',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError(t('serviceBoard.errorNeedTitle'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, title: form.title.trim(), description: form.description.trim() || null })
    } catch (err) {
      setError(err.message || "Couldn't post — try again.")
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal">
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>{t('serviceBoard.postTitle')}</h2>
        <p className="sub">{t('serviceBoard.postBody')}</p>
        {error ? <div className="error-msg">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('serviceBoard.needTitleLabel')}</label>
            <input type="text" value={form.title} onChange={update('title')} placeholder={t('serviceBoard.needTitlePlaceholder')} autoFocus />
          </div>
          <div className="field">
            <label>{t('serviceBoard.needDescriptionLabel')}</label>
            <textarea value={form.description} onChange={update('description')} placeholder={t('serviceBoard.needDescriptionPlaceholder')} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>{t('serviceBoard.needCategoryLabel')}</label>
              <select value={form.category} onChange={update('category')}>
                {NEED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t('serviceBoard.needSeverityLabel')}</label>
              <select value={form.severity} onChange={update('severity')}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{t(SEVERITY_LABEL_KEY[s])}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('serviceBoard.postSubmitting') : t('serviceBoard.postSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
