import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { colorForCategory } from '../utils/categoryColor'
import { useLanguage } from '../context/LanguageContext.jsx'

function normalizeUrl(u) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function buildShareText(v, link) {
  const lines = [v.name]
  const sub = [(v.categories || []).join(', '), v.specialty].filter(Boolean).join(' · ')
  if (sub) lines.push(sub)
  if (v.description) lines.push(v.description)
  if (v.address) lines.push(`Address: ${v.address}`)
  if (v.phone) lines.push(`Phone: ${v.phone}`)
  if (v.website) lines.push(`Website: ${normalizeUrl(v.website)}`)
  if (link) lines.push('', link)
  return lines.join('\n')
}

// Lands the recipient on the community page with the search box already
// filled in for this vendor, so a shared message doubles as an invitation.
function vendorLink(slug, name) {
  return `${window.location.origin}/n/${slug}?q=${encodeURIComponent(name)}`
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.93 9.93 0 0 0-8.5 15.1L2 22l5-1.5A9.94 9.94 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .88.9-2.9-.2-.3a8.2 8.2 0 1 1 6.8 3.65Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.09-.4-.12-.56.12-.17.25-.65.8-.8.97-.14.17-.29.18-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.57c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  )
}

export default function VendorCard({ vendor, categories, isAdmin, addedByEmail, onEdit, onDelete, neighborhood, shareSlug, rating, onToggleRating }) {
  const v = vendor
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [flyerOpen, setFlyerOpen] = useState(false)
  const slug = neighborhood?.slug || shareSlug
  const link = slug ? vendorLink(slug, v.name) : null
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(buildShareText(v, link))}`

  const copy = async (e) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(buildShareText(v, link))
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
          {link ? (
            <a className="copy-btn" href={whatsappHref} target="_blank" rel="noopener noreferrer" title={t('vendorCard.shareWhatsApp')} aria-label={t('vendorCard.shareWhatsApp')}>
              <WhatsAppIcon />
            </a>
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
      {rating && onToggleRating ? (
        <div className="rating-row">
          <button
            type="button"
            className={`rating-btn ${rating.mine ? 'on' : ''}`}
            onClick={() => onToggleRating(v.id)}
            aria-pressed={rating.mine}
            title={t('vendorCard.recommendHint')}
          >
            👍 {rating.mine ? t('vendorCard.recommended') : t('vendorCard.recommend')}{rating.total > 0 ? ` · ${rating.total}` : ''}
          </button>
          {rating.neighbors > 0 ? (
            <span className="rating-neighbors" title={t('vendorCard.neighborsHint')}>
              {t(rating.neighbors === 1 ? 'vendorCard.neighborsOne' : 'vendorCard.neighborsOther', { count: rating.neighbors })}
            </span>
          ) : null}
        </div>
      ) : null}
      {v.is_resident ? <div className="resident-badge">{t('vendorCard.neighborRecommended')}</div> : null}
      {isAdmin && addedByEmail ? <div className="added-by-note">Added by {addedByEmail}</div> : null}
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
