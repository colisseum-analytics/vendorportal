import { toCsv } from './csv'

export const VENDOR_CSV_HEADERS = ['name', 'category', 'specialty', 'status', 'description', 'address', 'phone', 'website', 'lives_here']

// One blank sample row per valid category, so the downloaded file
// documents every category the importer can use instead of just one.
export function downloadVendorCsvTemplate(categories = [], filename = 'vendor-import-template.csv') {
  const rows = (categories.length ? categories : ['']).map((category) => ({
    name: '', category, specialty: '', status: 'Unknown',
    description: '', address: '', phone: '', website: '', lives_here: '',
  }))
  const csv = toCsv(VENDOR_CSV_HEADERS, rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
