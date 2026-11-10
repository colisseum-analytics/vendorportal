// Message shared to WhatsApp / copied for a filtered vendor list. Count and
// link only — no vendor names or phone numbers, so the link is how a
// recipient sees who the vendors are. Used by the directory and the chat.
export function buildShareListText({ t, slug, neighborhoodName, label, count, category, search }) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search && search.trim()) params.set('q', search.trim())
  const qs = params.toString()
  const link = `${window.location.origin}/n/${slug}${qs ? `?${qs}` : ''}`
  return [
    t('directory.shareListHeading', { label, count, name: neighborhoodName }),
    '',
    t('directory.shareListCta'),
    link,
  ].join('\n')
}

export function whatsappHref(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
