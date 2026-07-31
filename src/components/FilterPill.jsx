import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function FilterPill({ label, options, value, onChange, renderOption }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const selectedOption = options.find((o) => (typeof o === 'string' ? o : o.value) === value)
  const selectedLabel = selectedOption
    ? renderOption
      ? renderOption(selectedOption)
      : typeof selectedOption === 'string' ? selectedOption : selectedOption.label
    : null

  return (
    <div className="filter-pill" ref={ref}>
      <button
        type="button"
        className={`filter-pill-btn ${value ? 'filter-pill-btn-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={value ? `${label}: ${selectedLabel}` : label}
      >
        {value ? (
          <>
            <span className="filter-pill-label">{label}:</span> {selectedLabel}
            <span
              className="filter-pill-clear"
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false) }}
              role="button"
              aria-label={t('filterPill.clear', { label })}
            >×</span>
          </>
        ) : (
          <>+ {label}</>
        )}
      </button>
      {open ? (
        <div className="filter-pill-menu">
          {options.length === 0 ? (
            <div className="filter-pill-empty">{t('filterPill.nothingToFilter')}</div>
          ) : (
            options.map((o) => {
              const optValue = typeof o === 'string' ? o : o.value
              const optLabel = typeof o === 'string' ? o : o.label
              return (
                <button
                  type="button"
                  key={optValue}
                  className={`filter-pill-option ${optValue === value ? 'filter-pill-option-selected' : ''}`}
                  onClick={() => { onChange(optValue); setOpen(false) }}
                  title={renderOption ? renderOption(o) : optLabel}
                >
                  {renderOption ? renderOption(o) : optLabel}
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
