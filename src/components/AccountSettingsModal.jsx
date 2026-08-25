import { useLanguage } from '../context/LanguageContext.jsx'
import AccountSettingsFields from './AccountSettingsFields.jsx'

export default function AccountSettingsModal({ onCancel }) {
  const { t } = useLanguage()

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <button className="close-x" onClick={onCancel}>×</button>
        <h2>{t('accountSettings.title')}</h2>
        <p className="sub">{t('accountSettings.subtitle')}</p>

        <AccountSettingsFields />

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onCancel} style={{ width: '100%' }}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
