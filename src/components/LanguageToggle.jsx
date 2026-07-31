import { useLanguage } from '../context/LanguageContext.jsx'

export default function LanguageToggle() {
  const { lang, toggle, t } = useLanguage()
  return (
    <button
      className="lang-toggle"
      onClick={toggle}
      type="button"
      aria-label={lang === 'en' ? t('nav.switchToSpanish') : t('nav.switchToEnglish')}
      title={lang === 'en' ? t('nav.switchToSpanish') : t('nav.switchToEnglish')}
    >
      {lang === 'en' ? 'ES' : 'EN'}
    </button>
  )
}
