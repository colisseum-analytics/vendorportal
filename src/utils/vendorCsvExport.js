import { toCsv } from './csv'
import { VENDOR_CSV_HEADERS } from './vendorCsvTemplate'

// Mirrors the import template's columns 1:1 so an exported file can be
// edited and re-imported without remapping anything.
export function downloadVendorsCsv(vendors, filename = 'vendors-export.csv') {
  const rows = vendors.map((v) => ({
    name: v.name,
    category: v.category,
    specialty: v.specialty || '',
    status: v.status || 'Unknown',
    description: v.description || '',
    address: v.address || '',
    phone: v.phone || '',
    website: v.website || '',
    lives_here: v.is_resident ? 'Yes' : 'No',
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
