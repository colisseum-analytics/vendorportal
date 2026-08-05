import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function SiteHeader() {
  const { theme } = useTheme()
  return (
    <header className="site-header">
      <Link to="/" className="site-header-logo">
        <img src={theme === 'dark' ? logoDark : logoLight} alt="LoopListing" />
      </Link>
      <div className="site-header-actions">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
