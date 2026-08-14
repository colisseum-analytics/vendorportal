import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function SiteHeader() {
  const { theme } = useTheme()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const initial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="site-header">
      <Link to="/" className="site-header-logo">
        <img src={theme === 'dark' ? logoDark : logoLight} alt="LoopListing" />
      </Link>
      <div className="site-header-actions">
        <LanguageToggle />
        <ThemeToggle />
        {user ? (
          <>
            <span className="account-badge" title={user.email}>{initial}</span>
            <button className="btn-ghost" onClick={signOut}>{t('nav.logOut')}</button>
          </>
        ) : (
          <Link className="btn-ghost" to="/login">{t('nav.logIn')}</Link>
        )}
      </div>
    </header>
  )
}
