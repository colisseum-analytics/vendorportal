import { readFileSync, writeFileSync } from 'fs'
import { parseCsv, toCsv } from '../src/utils/csv.js'

const SRC = 'Antilles Home Services  - March.csv'
const OUT = 'antilles-vendors-import.csv'

// raw category text (as it appears, singular tags) -> broad group
const GROUP = {
  'Pisos (Hardwood,Vinyl,Laminate)': 'Home Repair & Trades',
  'Remodelaciones Casa': 'Home Repair & Trades',
  'Remodelaciones Patios, Piscinas/Fence': 'Home Repair & Trades',
  'A/C Tecnico / HVAC': 'Home Repair & Trades',
  'Electricista': 'Home Repair & Trades',
  'Fence': 'Home Repair & Trades',
  'Reparacion Electrodomesticos / Appliance Repairs': 'Home Repair & Trades',
  'Alquiler Botes / Boat Rentals': 'Auto & Transportation',
  'Awning': 'Home Repair & Trades',
  'Blinds zebra': 'Home Repair & Trades',
  'Blinds Cortinas': 'Home Repair & Trades',
  'Body Shop/taller reparacion y pintura autos': 'Auto & Transportation',
  'Cantina Comida': 'Food',
  'Carpinteria y Remodelaciones': 'Home Repair & Trades',
  'Certified Home Inspector': 'Professional Services',
  'Ceviche, Pan de Masa Madre': 'Food',
  'Corredor de Seguros para casas / Insurance': 'Insurance',
  'Costurera': 'Personal Care',
  'Cuidado Gatos': 'Pet Care',
  'Cuidado Perros': 'Pet Care',
  'Driving School for Tenagers': 'Professional Services',
  'Instalacion Cargadores electricos': 'Home Repair & Trades',
  'Fumigacion / Pest Control': 'Home Repair & Trades',
  'Handyman': 'Home Repair & Trades',
  'Remover antenas directv': 'Home Repair & Trades',
  'Helado Artesanal': 'Food',
  'Home Health Aid': 'Health & Wellness',
  'Landscaping / Jardinero / Limpieza Jardin': 'Home Repair & Trades',
  'Lavado a presion': 'Cleaning',
  'Pintura/Painting Services': 'Home Repair & Trades',
  'Limpieza casas': 'Cleaning',
  'Limpieza ductos aire y secadora': 'Cleaning',
  'Limpieza y organizacion de casas/oficinas/tiendas': 'Cleaning',
  'Manicure': 'Personal Care',
  'Mecanico': 'Auto & Transportation',
  'Notary Public': 'Professional Services',
  'Office Cleaning': 'Cleaning',
  'Pasamanos escaleras': 'Home Repair & Trades',
  'Pastel de Pollo': 'Food',
  'Pavers': 'Home Repair & Trades',
  'Peluqueria / Hair Stylist': 'Personal Care',
  'Pintura tinas y gabinetes': 'Home Repair & Trades',
  'Plomero': 'Home Repair & Trades',
  'Profesor piano': 'Professional Services',
  'Sliding doors reparacion': 'Home Repair & Trades',
  'Topes y vanities/Global marble tops': 'Home Repair & Trades',
  'Tutores SAT/matematicas/ciencias': 'Professional Services',
  'Uber/Lyft/Transporte': 'Auto & Transportation',
  'Ventanas de Impacto / Impact Windows': 'Home Repair & Trades',
  'Window Tinting': 'Home Repair & Trades',
  'Window Treatment & Wallpapers': 'Home Repair & Trades',
  'Cleaning Services, homes, offices': 'Cleaning',
  'Skincare Radio frecuencia': 'Health & Wellness',
  'Lavado muebles': 'Cleaning',
  'Groomer': 'Pet Care',
  'Instalacion filtros de agua': 'Home Repair & Trades',
  'Seguros salud, vida, viajes, dental, medicare': 'Insurance',
  'Seguros salud, vida': 'Insurance',
  'Real Estate Photographer': 'Professional Services',
  'Marmol': 'Home Repair & Trades',
}

function stripWrappingQuote(tag) {
  const t = tag.trim()
  if (t.startsWith('"') && t.endsWith('"') && t.length > 1) return t.slice(1, -1)
  return t
}

function splitTags(rawCell) {
  let cell = rawCell.trim()
  // A few source rows wrap the whole cell in an extra literal quote pair
  // (leftover from triple-quoting in the original export).
  if (cell.startsWith('"') && cell.endsWith('"') && cell.length > 1) cell = cell.slice(1, -1)

  // Some category labels ARE one single tag that happens to contain a
  // comma (e.g. "Cleaning Services, homes, offices", "Seguros salud, vida").
  // The CSV structure alone can't tell that apart from a genuine multi-tag
  // row, so check the whole cell against the known label list first.
  if (GROUP[cell]) return [cell]

  // Otherwise split on top-level commas — not commas inside
  // "(Hardwood,Vinyl,Laminate)" or a residual quoted sub-phrase.
  const tags = []
  let depth = 0
  let inQuote = false
  let cur = ''
  for (const ch of cell) {
    if (ch === '"') inQuote = !inQuote
    if (!inQuote && ch === '(') depth++
    if (!inQuote && ch === ')') depth--
    if (ch === ',' && depth === 0 && !inQuote) { tags.push(cur.trim()); cur = '' } else { cur += ch }
  }
  if (cur.trim()) tags.push(cur.trim())
  return tags.map(stripWrappingQuote).filter(Boolean)
}

function groupFor(tag) {
  return GROUP[tag] || 'Home Repair & Trades'
}

function dominantGroup(tags) {
  const counts = {}
  for (const t of tags) {
    const g = groupFor(t)
    counts[g] = (counts[g] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

const text = readFileSync(SRC, 'utf-8')
const table = parseCsv(text)
const headerIdx = table.findIndex((r) => (r[0] || '').trim() === 'Category')
if (headerIdx === -1) throw new Error('Could not find the "Category" header row')
const dataRows = table.slice(headerIdx + 1)

const byKey = new Map() // phone -> accumulated vendor
const order = []

for (const cols of dataRows) {
  const [rawCategory, contactPerson, phoneRaw, services, providerName, livesHere] = cols
  const tags = splitTags((rawCategory || '').trim())

  let phone = (phoneRaw || '').trim()
  let description = (services || '').trim()

  // a few rows leaked a second phone number into the Services column
  if (/^\d{3}-\d{3}-\d{4}$/.test(description)) {
    description = `Alt phone: ${description}`
  }

  const name = (providerName || '').trim() || (contactPerson || '').trim() || tags.join(', ')

  const key = phone || `${name}-${tags.join(',')}`
  if (byKey.has(key)) {
    const existing = byKey.get(key)
    existing.tags.push(...tags)
    if (description && !existing.description.includes(description)) {
      existing.description = existing.description ? `${existing.description}; ${description}` : description
    }
    if (!existing.name && name) existing.name = name
    if ((livesHere || '').trim().toLowerCase() === 'yes') existing.livesHere = true
  } else {
    byKey.set(key, {
      name,
      tags: [...tags],
      description,
      phone,
      livesHere: (livesHere || '').trim().toLowerCase() === 'yes',
    })
    order.push(key)
  }
}

const rows = order.map((key) => {
  const v = byKey.get(key)
  const group = dominantGroup(v.tags)
  const specialty = [...new Set(v.tags)].join(', ')
  return {
    name: v.name,
    category: group,
    specialty,
    status: 'Open',
    description: v.description,
    address: '',
    phone: v.phone,
    website: '',
    lives_here: v.livesHere ? 'Yes' : '',
  }
})

const headers = ['name', 'category', 'specialty', 'status', 'description', 'address', 'phone', 'website', 'lives_here']
writeFileSync(OUT, toCsv(headers, rows))

console.log(`Wrote ${rows.length} vendor rows to ${OUT}`)
const groupCounts = {}
rows.forEach((r) => { groupCounts[r.category] = (groupCounts[r.category] || 0) + 1 })
console.log('By category:', groupCounts)
