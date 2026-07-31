import { toCsv } from './csv'

export const VENDOR_CSV_HEADERS = ['name', 'category', 'specialty', 'status', 'description', 'address', 'phone', 'website', 'lives_here']

export function downloadVendorCsvTemplate(categories = [], filename = 'vendor-import-template.csv') {
  const sample = {
    name: '', category: categories[0] || '', specialty: '', status: 'Unknown',
    description: '', address: '', phone: '', website: '', lives_here: '',
  }
  const csv = toCsv(VENDOR_CSV_HEADERS, [sample])
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
