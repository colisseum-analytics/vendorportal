import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { colorForCategory } from '../utils/categoryColor'
import { useLanguage } from '../context/LanguageContext.jsx'

function normalizeUrl(u) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function buildShareText(v) {
  const lines = [v.name]
  const sub = [(v.categories || []).join(', '), v.specialty].filter(Boolean).join(' · ')
  if (sub) lines.push(sub)
  if (v.description) lines.push(v.description)
  if (v.address) lines.push(`Address: ${v.address}`)
  if (v.phone) lines.push(`Phone: ${v.phone}`)
  if (v.website) lines.push(`Website: ${normalizeUrl(v.website)}`)
  return lines.join('\n')
}

export default function VendorCard({ vendor, categories, isAdmin, onEdit, onDelete, neighborhood }) {
  const v = vendor
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [flyerOpen, setFlyerOpen] = useState(false)

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

  const cats = v.categories || []
  const shownCats = cats.slice(0, 3)
  const extraCount = cats.length - shownCats.length

  return (
    <div className="card">
      <span className="pin" style={{ background: colorForCategory(categories, cats[0]) }} />
      <div className="card-top">
        <div className="card-top-name">
          <h3 title={v.description || undefined}>{v.name}</h3>
          <div className="category">
            {shownCats.join(', ')}{extraCount > 0 ? ` +${extraCount} more` : ''}{v.specialty ? ` · ${v.specialty}` : ''}
            {neighborhood ? (
              <>
                {' · '}
                <Link to={`/n/${neighborhood.slug}`} className="vendor-neighborhood-link" onClick={(e) => e.stopPropagation()}>
                  {neighborhood.city ? `${neighborhood.name}, ${neighborhood.city}` : neighborhood.name}
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <div className="card-top-actions">
          {v.flyer_url ? (
            <button className="copy-btn" onClick={() => setFlyerOpen(true)} title={t('vendorCard.viewFlyer')} aria-label={t('vendorCard.viewFlyer')}>
              🪧
            </button>
          ) : null}
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy} title={t('vendorCard.copyToShare')} aria-label={t('vendorCard.copyToShare')}>
            {copied ? '✓' : '⧉'}
          </button>
          <span className={`status-tag status-${(v.status || 'unknown').toLowerCase()}`}>
            {t(`directory.status${v.status || 'Unknown'}`)}
          </span>
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
      {v.is_resident ? <div className="resident-badge">{t('vendorCard.neighborRecommended')}</div> : null}
      {isAdmin ? (
        <div className="card-admin-actions">
          <button onClick={() => onEdit(v)}>{t('vendorCard.edit')}</button>
          <button className="danger" onClick={() => onDelete(v)}>{t('vendorCard.delete')}</button>
        </div>
      ) : null}
      {flyerOpen ? createPortal(
        // Rendered into document.body, not here — an ancestor .card has a
        // hover transform, and a transformed ancestor turns this overlay's
        // position:fixed into "fixed relative to that ancestor" instead of
        // the viewport, which otherwise pins the lightbox to the card.
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setFlyerOpen(false) }}>
          <div className="flyer-lightbox">
            <button className="close-x" onClick={() => setFlyerOpen(false)}>×</button>
            <img src={v.flyer_url} alt={`${v.name} flyer`} />
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )
}
