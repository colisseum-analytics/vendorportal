import { useEffect, useState } from 'react'
import { US_STATES, CITIES_BY_STATE, stateForCity } from '../utils/usCities'
import { useLanguage } from '../context/LanguageContext.jsx'

// Cascading State -> City selects, populated from a static list of US
// cities with population over ~100k, so directory creators pick a
// consistent city name instead of typing one (avoids typos and near-duplicates
// like "Miami" vs "miami " vs "Miami, FL"). Only the city name is stored —
// the state selector is just a filter to narrow the city list.
export default function CityPicker({ value, onChange, restrictTo }) {
  const { t } = useLanguage()
  const [state, setState] = useState(() => stateForCity(value))

  useEffect(() => {
    const matched = stateForCity(value)
    if (matched && matched !== state) setState(matched)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const cities = CITIES_BY_STATE[state] || []

  return (
    <div className="city-picker">
      <select
        value={state}
        onChange={(e) => {
          setState(e.target.value)
          onChange('')
        }}
      >
        <option value="">{t('cityPicker.state')}</option>
        {US_STATES.map((s) => (
          <option key={s.code} value={s.code} disabled={restrictTo ? !restrictTo.includes(s.code) : false}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!state}
      >
        <option value="">{state ? (cities.length ? t('cityPicker.city') : t('cityPicker.noCities')) : t('cityPicker.chooseStateFirst')}</option>
        {cities.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
