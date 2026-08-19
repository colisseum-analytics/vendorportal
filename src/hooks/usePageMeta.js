import { useEffect } from 'react'

const SITE_NAME = 'LoopListing'
const DEFAULT_TITLE = 'LoopListing • One place for local services, trusted by neighbors'
const DEFAULT_IMAGE = 'https://looplisting.com/email-logo.png'

function upsertMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Swaps document.title and the meta/OG/Twitter/canonical tags on route
// mount, since this is a plain CSR SPA with no react-helmet-style
// dependency. Every route should call this (even with just defaults) so
// nothing lingers from whatever page was previously mounted.
//
// `skip` is for layout components that only own the title in some states
// (e.g. a not-found branch) — child routes rendered via <Outlet> fire their
// own effects before the parent's, so the parent must no-op rather than
// unconditionally reset to the default title after the child already set
// its own.
export function usePageMeta({ title, description, image, noindex = false, skip = false } = {}) {
  useEffect(() => {
    if (skip) return
    const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE
    document.title = fullTitle

    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:description', description)
    }
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', window.location.href)
    upsertMeta('property', 'og:image', image || DEFAULT_IMAGE)
    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertLink('canonical', window.location.origin + window.location.pathname)
  }, [title, description, image, noindex, skip])
}
