import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL } from '../lib/config'

const DEFAULT_TITLE = 'Laceloft | Find Your Next Sole'

function setHeadTag(selector, create, value) {
  let el = document.head.querySelector(selector)
  if (value === null) { el?.remove(); return }
  if (!el) { el = create(); document.head.appendChild(el) }
  el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', value)
}

/** Sets the document title, description, canonical URL and, for pages that
 *  should stay out of search results, a noindex tag. */
export function usePageMeta(title, description, { noindex = false } = {}) {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = title ? `${title} | Laceloft` : DEFAULT_TITLE
    const meta = document.querySelector('meta[name="description"]')
    const prev = meta?.getAttribute('content')
    if (meta && description) meta.setAttribute('content', description)
    setHeadTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), SITE_URL + pathname)
    setHeadTag('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), noindex ? 'noindex' : null)
    return () => {
      document.title = DEFAULT_TITLE
      if (meta && prev) meta.setAttribute('content', prev)
      setHeadTag('meta[name="robots"]', null, null)
    }
  }, [title, description, noindex, pathname])
}
