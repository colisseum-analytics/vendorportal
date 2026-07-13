const CATEGORY_COLORS = ['#3C6E8F', '#D89A2E', '#4C7A54', '#B14A3D', '#7A5C9E', '#3C8F84']

function colorForCategory(categories, cat) {
  const idx = categories.indexOf(cat)
  return CATEGORY_COLORS[(idx >= 0 ? idx : cat.length) % CATEGORY_COLORS.length]
}

function normalizeUrl(u) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

export default function VendorCard({ vendor, categories, isAdmin, onEdit, onDelete }) {
  const v = vendor
  return (
    <div className="card">
      <span className="pin" style={{ background: colorForCategory(categories, v.category) }} />
      <div className="card-top">
        <div>
          <h3>{v.name}</h3>
          <div className="category">{v.category}</div>
        </div>
        <span className={`status-tag status-${(v.status || 'open').toLowerCase()}`}>{v.status || 'Open'}</span>
      </div>
      {v.description ? <p className="desc">{v.description}</p> : null}
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
      {isAdmin ? (
        <div className="card-admin-actions">
          <button onClick={() => onEdit(v)}>Edit</button>
          <button className="danger" onClick={() => onDelete(v)}>Delete</button>
        </div>
      ) : null}
    </div>
  )
}
