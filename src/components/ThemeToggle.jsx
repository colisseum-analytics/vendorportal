import { useTheme } from '../context/ThemeContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useLanguage()
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      type="button"
      aria-label={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
      title={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
