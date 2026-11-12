// One house style for vendor phone numbers: 786-361-8563.
// Only touches numbers it can read as a US number (10 digits, or 11 with a
// leading 1). Anything else — extensions, international, partial — is kept as
// typed (minus invisible characters) so nothing is silently mangled.
export function formatVendorPhone(phone) {
  const raw = (phone || '').replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').trim()
  if (!raw) return ''
  if (/[a-zA-Z]|ext|x\d/i.test(raw)) return raw
  const digits = raw.replace(/\D/g, '')
  const ten = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (ten.length !== 10) return raw
  return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`
}
