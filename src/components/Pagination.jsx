import { useLanguage } from '../context/LanguageContext.jsx'

export default function Pagination({ page, totalPages, onChange }) {
  const { t } = useLanguage()
  if (totalPages <= 1) return null
  return (
    <div className="pagination-row">
      <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('pagination.prev')}
      </button>
      <span className="pagination-status">{t('pagination.pageOf', { page, total: totalPages })}</span>
      <button type="button" className="btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {t('pagination.next')}
      </button>
    </div>
  )
}
