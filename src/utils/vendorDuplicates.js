// A vendor is treated as a likely duplicate of another when they share a
// normalized name or a normalized phone number — not enforced as a hard
// constraint (two real vendors can legitimately share a phone, e.g. a
// franchise), just surfaced so whoever's adding the vendor can catch a
// mistake before it goes live.
export function normalizeVendorName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalizeVendorPhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

export function findDuplicateVendor(candidate, existingVendors, excludeId) {
  const name = normalizeVendorName(candidate.name)
  const phone = normalizeVendorPhone(candidate.phone)
  return (
    existingVendors.find((v) => {
      if (excludeId && v.id === excludeId) return false
      if (name && normalizeVendorName(v.name) === name) return true
      if (phone && normalizeVendorPhone(v.phone) === phone) return true
      return false
    }) || null
  )
}
