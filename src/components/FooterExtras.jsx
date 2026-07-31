import { useLanguage } from '../context/LanguageContext.jsx'

export default function FooterExtras() {
  const { t } = useLanguage()
  return (
    <>
      <p className="footer-credit">{t('footer.builtWith')}</p>
      <p className="footer-disclaimer">{t('footer.disclaimer')}</p>
    </>
  )
}
