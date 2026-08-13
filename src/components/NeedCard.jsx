import { useLanguage } from '../context/LanguageContext.jsx'
import { colorForCategory } from '../utils/categoryColor'
import { relativeTime } from '../utils/relativeTime'
import { NEED_CATEGORIES, SEVERITY_LABEL_KEY, SEVERITY_BADGE_CLASS, STATUS_LABEL_KEY, STATUS_BADGE_CLASS } from '../utils/needConstants'

export default function NeedCard({ need, supportCount = 0, supported = false, onToggleSupport }) {
  const { t } = useLanguage()
  const n = need

  return (
    <div className="card">
      <span className="pin" style={{ background: colorForCategory(NEED_CATEGORIES, n.category) }} />
      <div className="card-top">
        <div className="card-top-name">
          <h3 title={n.description || undefined}>{n.title}</h3>
          <div className="category">{n.category}</div>
        </div>
        <div className="card-top-actions">
          <span className={`badge ${SEVERITY_BADGE_CLASS[n.severity] || 'badge-neutral'}`}>{t(SEVERITY_LABEL_KEY[n.severity])}</span>
          <span className={`badge ${STATUS_BADGE_CLASS[n.status] || 'badge-neutral'}`}>{t(STATUS_LABEL_KEY[n.status])}</span>
        </div>
      </div>
      {n.description ? <p className="desc" title={n.description}>{n.description}</p> : null}
      <div className="meta">
        {n.unit ? <div className="row"><span className="icon">⌂</span><span>{t('serviceBoard.unitPrefix')} {n.unit}</span></div> : null}
        <div className="row"><span className="icon">🕐</span><span>{relativeTime(n.created_at)}</span></div>
      </div>
      <div className="card-admin-actions">
        <button
          type="button"
          className={`support-btn ${supported ? 'supported' : ''}`}
          onClick={() => onToggleSupport(n.id)}
        >
          <span>▲ {supportCount}</span>
          <span>{t('serviceBoard.supportButton')}</span>
        </button>
      </div>
    </div>
  )
}
