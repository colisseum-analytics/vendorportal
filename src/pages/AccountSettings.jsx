import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import AccountSettingsFields from '../components/AccountSettingsFields.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function AccountSettings() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  usePageMeta({ title: t('accountSettings.title'), noindex: true })

  if (!user) {
    return (
      <div className="wrap-narrow">
        <div className="auth-card">
          <h1>{t('accountSettings.loginRequiredTitle')}</h1>
          <p className="sub">{t('accountSettings.loginRequiredBody')}</p>
          <Link className="btn-primary" to={`/login?redirect=/n/${slug}/settings`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>{t('nav.logIn')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap-narrow">
      <div style={{ margin: '20px 0 10px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: '0 0 4px' }}>{t('accountSettings.title')}</h1>
        <p className="tagline">{t('accountSettings.subtitle')}</p>
      </div>
      <div className="auth-card">
        <AccountSettingsFields />
      </div>
    </div>
  )
}
