import { useState } from 'react'

const STORAGE_KEY = 'vendor-view-pref' // 'grid' | 'list'

export function useVendorView() {
  const [view, setView] = useState(() => localStorage.getItem(STORAGE_KEY) || 'grid')

  const update = (next) => {
    localStorage.setItem(STORAGE_KEY, next)
    setView(next)
  }

  return [view, update]
}
