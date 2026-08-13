import { useState } from 'react'
import { supabase } from '../supabaseClient'

const SECTIONS = [
  { key: 'hoa_contacts', label: 'Association Contacts' },
  { key: 'community_services', label: 'Community Services' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'faq', label: 'Community FAQ' },
]

export default function ImportInfoItemsModal({ neighborhood, onCancel, onImported }) {
  const [fileName, setFileName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [rows, setRows] = useState(null) // null until a document has been analyzed
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const updateRow = (i, key) => (e) => {
    const value = e.target.value
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  }
  const toggleRow = (i) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)))
  }
  const removeRow = (i) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setAnalyzeError('')
    setAnalyzing(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('neighborhood_id', neighborhood.id)
    formData.append('categories', JSON.stringify(neighborhood.categories || []))
    const { data, error } = await supabase.functions.invoke('extract-info-items', { body: formData })
    setAnalyzing(false)
    if (error) {
      setAnalyzeError(error.message || "Couldn't analyze that document — try again.")
      return
    }
    if (!data?.items?.length) {
      setAnalyzeError("Didn't find anything to import in that document.")
      return
    }
    setRows(
      data.items.map((item) => ({
        included: true,
        section: SECTIONS.some((s) => s.key === item.section) ? item.section : 'faq',
        subsection: item.subsection || '',
        title: item.title || '',
        body: item.body || '',
        phone: item.phone || '',
        email: item.email || '',
        website: item.website || '',
        category: item.category || '',
      }))
    )
  }

  const includedRows = rows ? rows.filter((r) => r.included) : []

  const commitImport = async () => {
    setImporting(true)
    setImportError('')
    const payload = includedRows.map((r) => ({
      neighborhood_id: neighborhood.id,
      section: r.section,
      subsection: r.subsection.trim() || null,
      title: r.title.trim(),
      body: r.body.trim() || null,
      phone: r.phone.trim() || null,
      email: r.email.trim() || null,
      website: r.website.trim() || null,
      category: r.category.trim() || null,
    }))
    const { error } = await supabase.from('neighborhood_info_items').insert(payload)
    setImporting(false)
    if (error) {
      setImportError(error.message)
      return
    }
    onImported(includedRows.length)
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>Import from document</h2>
        <p className="sub">Upload a PDF, Word doc, or text file — we'll pull out contacts, services, emergency numbers, and FAQ entries for you to review before anything's added.</p>

        {!rows ? (
          <>
            {analyzeError ? <div className="error-msg">{analyzeError}</div> : null}
            <div className="field">
              <label>Document</label>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFile} disabled={analyzing} />
              <div className="hint">PDF, Word (.docx), or plain text. Scanned/image-only PDFs aren't supported.</div>
            </div>
            {analyzing ? <p className="sub">Analyzing {fileName}… this can take a moment.</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="sub">{fileName} — {includedRows.length} of {rows.length} selected.</p>
            {importError ? <div className="error-msg">{importError}</div> : null}
            <div className="import-preview">
              {rows.map((r, i) => (
                <div key={i} className="import-row">
                  <div className="field-row" style={{ alignItems: 'center', marginBottom: 8 }}>
                    <label className="checkbox-label" style={{ flex: '0 0 auto' }}>
                      <input type="checkbox" checked={r.included} onChange={() => toggleRow(i)} />
                      Include
                    </label>
                    <div className="field" style={{ margin: 0, flex: 1 }}>
                      <select value={r.section} onChange={updateRow(i, 'section')}>
                        {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                    <button type="button" className="btn-ghost danger" onClick={() => removeRow(i)}>Remove</button>
                  </div>
                  <div className="field">
                    <label>{r.section === 'faq' ? 'Question' : 'Name'}</label>
                    <input type="text" value={r.title} onChange={updateRow(i, 'title')} />
                  </div>
                  <div className="field">
                    <label>{r.section === 'faq' ? 'Answer' : 'Notes'}</label>
                    <textarea value={r.body} onChange={updateRow(i, 'body')} />
                  </div>
                  {r.section !== 'faq' ? (
                    <div className="field-row">
                      <div className="field">
                        <label>Phone</label>
                        <input type="text" value={r.phone} onChange={updateRow(i, 'phone')} />
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input type="email" value={r.email} onChange={updateRow(i, 'email')} />
                      </div>
                      <div className="field">
                        <label>Website</label>
                        <input type="text" value={r.website} onChange={updateRow(i, 'website')} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setRows(null); setFileName('') }}>Choose a different file</button>
              <button type="button" className="btn-primary" disabled={includedRows.length === 0 || importing} onClick={commitImport}>
                {importing ? 'Importing…' : `Import ${includedRows.length} item${includedRows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
