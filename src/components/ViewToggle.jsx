import { useLanguage } from '../context/LanguageContext.jsx'

export default function ViewToggle({ view, onChange }) {
  const { t } = useLanguage()
  return (
    <div className="view-toggle" role="group" aria-label={t('viewToggle.group')}>
      <button
        type="button"
        className={view === 'grid' ? 'active' : ''}
        onClick={() => onChange('grid')}
        title={t('viewToggle.grid')}
        aria-label={t('viewToggle.grid')}
      >
        ▦
      </button>
      <button
        type="button"
        className={view === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        title={t('viewToggle.list')}
        aria-label={t('viewToggle.list')}
      >
        ☰
      </button>
    </div>
  )
}
