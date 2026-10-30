/* ===== Laceloft — API client =====
   Talks to the Django backend so the shop always reflects whatever is in
   the database. If the API can't be reached, falls back to the last
   successful response cached in localStorage, and finally to the static
   FALLBACK_PRODUCTS catalog — so the site never goes completely blank. */

import { API_BASE } from './config'
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts'

const CATALOG_CACHE_KEY = 'laceloft_catalog_cache'

let catalogPromise = null
let catalogSource = 'loading'
export const getCatalogSource = () => catalogSource

export async function fetchCatalog(force = false) {
  if (catalogPromise && !force) return catalogPromise

  catalogPromise = (async () => {
    try {
      const res = await fetch(API_BASE + '/products/')
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected catalogue response')
      catalogSource = 'live'
      try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
      return data
    } catch (err) {
      console.warn('Laceloft: could not reach the API, falling back to the offline catalog.', err)
      try {
        const cached = localStorage.getItem(CATALOG_CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length) { catalogSource = 'cached'; return parsed }
        }
      } catch { /* ignore */ }
      catalogSource = 'fallback'
      return FALLBACK_PRODUCTS
    }
  })()

  return catalogPromise
}

export async function fetchProduct(sku) {
  try {
    const res = await fetch(API_BASE + '/products/' + encodeURIComponent(sku) + '/')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch {
    const catalog = await fetchCatalog()
    return catalog.find((p) => p.sku === sku) || null
  }
}

export function fmtPrice(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}
