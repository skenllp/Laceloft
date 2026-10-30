import { useEffect } from 'react'

const DEFAULT_TITLE = 'Laceloft | Find Your Next Sole'

/** Sets the document title (and optionally description) for the current page. */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Laceloft` : DEFAULT_TITLE
    const meta = document.querySelector('meta[name="description"]')
    const prev = meta?.getAttribute('content')
    if (meta && description) meta.setAttribute('content', description)
    return () => {
      document.title = DEFAULT_TITLE
      if (meta && prev) meta.setAttribute('content', prev)
    }
  }, [title, description])
}
