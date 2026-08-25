import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import AccountSettingsModal from './AccountSettingsModal.jsx'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function SiteHeader() {
  const { theme } = useTheme()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const initial = user?.email?.[0]?.toUpperCase() || '?'

  useEffect(() => {
    if (!user) { setIsPlatformAdmin(false); return }
    let active = true
    supabase.rpc('is_platform_admin').then(({ data }) => {
      if (active) setIsPlatformAdmin(!!data)
    })
    return () => { active = false }
  }, [user])

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
            <button type="button" className="account-badge" title={t('accountSettings.title')} onClick={() => setSettingsOpen(true)}>{initial}</button>
            <button className="btn-ghost" onClick={signOut}>{t('nav.logOut')}</button>
          </>
        ) : (
          <Link className="btn-ghost" to="/login">{t('nav.logIn')}</Link>
        )}
      </div>
      {settingsOpen ? <AccountSettingsModal isPlatformAdmin={isPlatformAdmin} onCancel={() => setSettingsOpen(false)} /> : null}
    </header>
  )
}
