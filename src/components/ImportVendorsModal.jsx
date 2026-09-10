import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { parseCsv } from '../utils/csv'
import { downloadVendorCsvTemplate } from '../utils/vendorCsvTemplate'
import { findDuplicateVendor } from '../utils/vendorDuplicates'

const STATUSES = ['Verified', 'Unknown']

const HEADER_ALIASES = {
  name: 'name', 'business name': 'name', 'provider name': 'name',
  category: 'categories', categories: 'categories',
  specialty: 'specialty',
  status: 'status',
  description: 'description', services: 'description',
  address: 'address',
  phone: 'phone', 'phone number': 'phone',
  website: 'website', 'website/link': 'website',
  lives_here: 'lives_here', 'lives here': 'lives_here', resident: 'lives_here',
}

function truthy(v) {
  return ['yes', 'y', 'true', '1'].includes(String(v || '').trim().toLowerCase())
}

export default function ImportVendorsModal({ neighborhood, vendors, onCancel, onImported }) {
  const [rows, setRows] = useState(null) // parsed + validated rows
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const categories = neighborhood.categories || []
  const categoryLookup = new Map(categories.map((c) => [c.toLowerCase(), c]))

  const validateRow = (raw) => {
    const errors = []
    const name = (raw.name || '').trim()
    if (!name) errors.push('missing name')

    const rawCategories = (raw.categories || '').split(',').map((c) => c.trim()).filter(Boolean)
    const matchedCategories = []
    const unknownCategories = []
    for (const rc of rawCategories) {
      const match = categoryLookup.get(rc.toLowerCase())
      if (match) matchedCategories.push(match)
      else unknownCategories.push(rc)
    }
    if (rawCategories.length === 0) errors.push('missing categories')
    if (unknownCategories.length) errors.push(`categor${unknownCategories.length === 1 ? 'y' : 'ies'} "${unknownCategories.join(', ')}" isn't in this neighborhood's list — add it in Settings first`)

    let status = (raw.status || 'Unknown').trim()
    // legacy values from earlier relabelings all collapse to Unknown
    const STATUS_ALIASES = { open: 'Unknown', closed: 'Unknown', seasonal: 'Unknown', active: 'Unknown', inactive: 'Unknown' }
    const aliased = STATUS_ALIASES[status.toLowerCase()]
    if (aliased) status = aliased
    if (!STATUSES.some((s) => s.toLowerCase() === status.toLowerCase())) {
      errors.push(`status "${status}" must be Verified or Unknown`)
    } else {
      status = STATUSES.find((s) => s.toLowerCase() === status.toLowerCase())
    }

    return {
      name,
      categories: matchedCategories.length ? matchedCategories : rawCategories,
      specialty: (raw.specialty || '').trim(),
      status,
      description: (raw.description || '').trim(),
      address: (raw.address || '').trim(),
      phone: (raw.phone || '').trim(),
      website: (raw.website || '').trim(),
      is_resident: truthy(raw.lives_here),
      errors,
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setImportError('')
    const text = await file.text()
    const table = parseCsv(text)
    if (table.length < 2) {
      setParseError('That file has no data rows.')
      setRows(null)
      return
    }
    const headerRow = table[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] || h.trim().toLowerCase())
    if (!headerRow.includes('name') || !headerRow.includes('categories')) {
      setParseError('The file needs at least "name" and "categories" columns — download the template below to see the expected format.')
      setRows(null)
      return
    }
    const parsed = table.slice(1).map((cols) => {
      const raw = {}
      headerRow.forEach((h, i) => { raw[h] = cols[i] })
      return validateRow(raw)
    })
    // Flag likely duplicates against vendors already in the directory, and
    // against earlier rows in this same file — informational only, doesn't
    // block import, since two real vendors can legitimately share a phone.
    const seenSoFar = []
    for (const row of parsed) {
      const dup = findDuplicateVendor(row, [...(vendors || []), ...seenSoFar])
      row.duplicateOf = dup ? dup.name : null
      seenSoFar.push(row)
    }
    setRows(parsed)
  }

  const validRows = rows ? rows.filter((r) => r.errors.length === 0) : []
  const invalidRows = rows ? rows.filter((r) => r.errors.length > 0) : []
  const duplicateCount = validRows.filter((r) => r.duplicateOf).length

  const commitImport = async () => {
    setImporting(true)
    setImportError('')
    const payload = validRows.map(({ errors, ...v }) => ({ ...v, neighborhood_id: neighborhood.id }))
    const { error } = await supabase.from('vendors').insert(payload)
    setImporting(false)
    if (error) {
      setImportError(error.message)
      return
    }
    onImported(validRows.length)
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>Import vendors from CSV</h2>
        <p className="sub">Upload a spreadsheet of vendors to add them all at once.</p>

        {!rows ? (
          <>
            {parseError ? <div className="error-msg">{parseError}</div> : null}
            <div className="field">
              <label>CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={handleFile} />
              <div className="hint">
                Needs <code>name</code> and <code>categories</code> columns at minimum — a vendor doing more than one trade can list several, comma-separated, in that cell. Also recognizes <code>specialty</code>, <code>status</code>, <code>description</code>, <code>address</code>, <code>phone</code>, <code>website</code>, and <code>lives_here</code> (Yes/No).
              </div>
            </div>
            <button type="button" className="btn-ghost" onClick={() => downloadVendorCsvTemplate(categories)}>Download template CSV</button>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="sub">
              {fileName} — {validRows.length} ready to import{invalidRows.length ? `, ${invalidRows.length} need fixing` : ''}
              {duplicateCount ? `, ${duplicateCount} might already exist` : ''}.
            </p>
            {importError ? <div className="error-msg">{importError}</div> : null}
            <div className="import-preview">
              {rows.map((r, i) => (
                <div key={i} className={`import-row ${r.errors.length ? 'import-row-error' : (r.duplicateOf ? 'import-row-duplicate' : '')}`}>
                  <div className="import-row-main">
                    <strong>{r.name || '(no name)'}</strong>
                    <span className="import-row-cat">{(r.categories || []).join(', ')}{r.specialty ? ` · ${r.specialty}` : ''}</span>
                  </div>
                  {r.errors.length ? <div className="import-row-errors">{r.errors.join('; ')}</div> : null}
                  {!r.errors.length && r.duplicateOf ? (
                    <div className="import-row-duplicate-note">Might already exist as "{r.duplicateOf}" — will still be imported unless you remove it from the file.</div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setRows(null); setFileName('') }}>Choose a different file</button>
              <button type="button" className="btn-primary" disabled={validRows.length === 0 || importing} onClick={commitImport}>
                {importing ? 'Importing…' : `Import ${validRows.length} vendor${validRows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
