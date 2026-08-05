import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'lang-preference'

function lookup(dict, key) {
  return key.split('.').reduce((obj, part) => (obj ? obj[part] : undefined), dict)
}

function detectDefault() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectDefault)

  const setLang = (next) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }

  const toggle = () => setLang(lang === 'en' ? 'es' : 'en')

  const t = (key, vars, fallback) => {
    let str = lookup(translations[lang], key) ?? lookup(translations.en, key) ?? fallback ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v)
    }
    return str
  }

  // Vendor category names are free-text data (admin-entered), not fixed
  // UI copy — only the 9 standard categories have translations. Anything
  // else falls back to the raw category string instead of an ugly
  // untranslated key path.
  const tCategory = (category) => t(`createNeighborhood.categoryLabels.${category}`, null, category)

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t, tCategory }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
