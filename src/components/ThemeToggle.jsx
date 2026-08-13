import { useTheme } from '../context/ThemeContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

// Cycles system -> light -> dark -> system. The icon reflects the
// *current* mode; the tooltip describes what clicking switches to next
// (matches the old light/dark-only toggle's convention).
const NEXT = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: '🖥', light: '☀', dark: '☾' }
const LABEL_KEY = { system: 'nav.switchToLight', light: 'nav.switchToDark', dark: 'nav.switchToSystem' }

export default function ThemeToggle() {
  const { isSystem, theme, setTheme } = useTheme()
  const { t } = useLanguage()
  const mode = isSystem ? 'system' : theme
  const label = t(LABEL_KEY[mode])
  const next = NEXT[mode]

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(next === 'system' ? null : next)}
      type="button"
      aria-label={label}
      title={label}
    >
      {ICON[mode]}
    </button>
  )
}
