import { useLanguage } from '../context/LanguageContext.jsx'
import { relativeTime } from '../utils/relativeTime'

export default function BroadcastBanner({ broadcast }) {
  const { t } = useLanguage()
  const b = broadcast

  return (
    <div className="message-item" style={{ marginBottom: 16, borderColor: 'var(--blue)' }}>
      <div className="message-item-head">
        <span className="message-from">📣 {b.title}</span>
        <span className="message-time">{relativeTime(b.created_at)}</span>
      </div>
      <p className="message-text">{b.message}</p>
      <p className="hint">{t('serviceBoard.officialUpdate')}</p>
    </div>
  )
}
