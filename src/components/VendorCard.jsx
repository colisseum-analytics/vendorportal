import { useState } from 'react'
import { colorForCategory } from '../utils/categoryColor'

function normalizeUrl(u) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function buildShareText(v) {
  const lines = [v.name]
  const sub = [v.category, v.specialty].filter(Boolean).join(' · ')
  if (sub) lines.push(sub)
  if (v.description) lines.push(v.description)
  if (v.address) lines.push(`Address: ${v.address}`)
  if (v.phone) lines.push(`Phone: ${v.phone}`)
  if (v.website) lines.push(`Website: ${normalizeUrl(v.website)}`)
  return lines.join('\n')
}

export default function VendorCard({ vendor, categories, isAdmin, onEdit, onDelete }) {
  const v = vendor
  const [copied, setCopied] = useState(false)

  const copy = async (e) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(buildShareText(v))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (e.g. insecure context) — fail silently
    }
  }

  return (
    <div className="card">
      <span className="pin" style={{ background: colorForCategory(categories, v.category) }} />
      <div className="card-top">
        <div className="card-top-name">
          <h3 title={v.description || undefined}>{v.name}</h3>
          <div className="category">{v.category}{v.specialty ? ` · ${v.specialty}` : ''}</div>
        </div>
        <div className="card-top-actions">
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy} title="Copy details to share" aria-label="Copy details to share">
            {copied ? '✓' : '⧉'}
          </button>
          <span className={`status-tag status-${(v.status || 'active').toLowerCase()}`}>{v.status || 'Active'}</span>
        </div>
      </div>
      {v.description ? <p className="desc" title={v.description}>{v.description}</p> : null}
      <div className="meta">
        {v.address ? (
          <div className="row"><span className="icon">⌂</span><span>{v.address}</span></div>
        ) : null}
        {v.phone ? (
          <div className="row"><span className="icon">☏</span><span>{v.phone}</span></div>
        ) : null}
        {v.website ? (
          <div className="row">
            <span className="icon">↗</span>
            <a href={normalizeUrl(v.website)} target="_blank" rel="noopener noreferrer">
              {v.website.replace(/^https?:\/\//i, '')}
            </a>
          </div>
        ) : null}
      </div>
      {v.is_resident ? <div className="resident-badge">★ Neighbor</div> : null}
      {isAdmin ? (
        <div className="card-admin-actions">
          <button onClick={() => onEdit(v)}>Edit</button>
          <button className="danger" onClick={() => onDelete(v)}>Delete</button>
        </div>
      ) : null}
    </div>
  )
}
