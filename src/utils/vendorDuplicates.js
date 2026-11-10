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

// The vendor a new entry most likely duplicates *as the same business*, so it
// can be offered as a merge instead of a second card. Same phone is the strong
// signal (and wins even if another vendor shares only the name). Same name
// counts only when one side has no phone to compare — two "Alex"es with
// different phone numbers are different people.
export function findMergeCandidate(candidate, existingVendors, excludeId) {
  const name = normalizeVendorName(candidate.name)
  const phone = normalizeVendorPhone(candidate.phone)
  const others = existingVendors.filter((v) => !(excludeId && v.id === excludeId))
  if (phone) {
    const byPhone = others.find((v) => normalizeVendorPhone(v.phone) === phone)
    if (byPhone) return byPhone
  }
  if (name) {
    // Only when exactly one vendor fits — with several same-named vendors and
    // no phone to tell them apart, guessing which one to merge into is worse
    // than just showing the plain warning.
    const sameName = others.filter((v) => normalizeVendorName(v.name) === name && (!phone || !normalizeVendorPhone(v.phone)))
    return sameName.length === 1 ? sameName[0] : null
  }
  return null
}

const blank = (s) => !s || !String(s).trim()

// What to write onto the existing vendor when merging a new entry into it:
// categories are combined; every other field keeps the existing value and is
// only filled in from the new entry when the existing one is empty, so a merge
// never overwrites anything already there. Verified status and "lives here"
// are kept if either entry has them.
export function mergeVendorFields(existing, incoming) {
  const existingCats = existing.categories || []
  const categories = [...existingCats, ...(incoming.categories || []).filter((c) => !existingCats.includes(c))]
  const pick = (key) => (blank(existing[key]) ? (incoming[key] || '') : existing[key])
  return {
    categories,
    specialty: pick('specialty'),
    description: pick('description'),
    address: pick('address'),
    phone: pick('phone'),
    website: pick('website'),
    flyer_url: blank(existing.flyer_url) ? (incoming.flyer_url || null) : existing.flyer_url,
    is_resident: !!(existing.is_resident || incoming.is_resident),
    status: existing.status === 'Verified' || incoming.status === 'Verified' ? 'Verified' : (existing.status || 'Unknown'),
  }
}
