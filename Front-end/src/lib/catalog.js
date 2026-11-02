/* Small helpers that derive homepage/shop data from the live catalogue,
   so nothing on the storefront is hardcoded or invented. */

export const hasImage = (p) => Array.isArray(p.images) && p.images.length > 0 && !!p.images[0]

/** Categories actually present in the catalogue, biggest first, each with a cover product. */
export function getCategories(products) {
  const map = new Map()
  products.forEach((p) => {
    ;(p.cats || []).forEach((c) => {
      if (!map.has(c)) map.set(c, { name: c, count: 0, cover: null })
      const entry = map.get(c)
      entry.count += 1
      if (!entry.cover || (!hasImage(entry.cover) && hasImage(p)) || (p.isNew && !entry.cover.isNew && hasImage(p))) entry.cover = p
    })
  })
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Featured products curated from the existing Laceloft catalogue.
 *  Choose clean-background sneaker photography first; if a SKU is absent,
 *  fill with other photographed catalogue products without inventing listings.
 */
export const FEATURED_HERO_SKUS = ['AD-SMB-BRN', 'NB-9060-NRG', 'AJ4-SB-PINE', 'OT-MX66-CRM']

export function pickHeroProducts(products, count = 4) {
  const pool = products.filter(hasImage)
  const picked = FEATURED_HERO_SKUS
    .map((sku) => pool.find((p) => p.sku === sku))
    .filter(Boolean)
    .slice(0, count)
  const ranked = [...pool.filter((p) => p.isNew), ...pool.filter((p) => !p.isNew)]
  for (const p of ranked) {
    if (picked.length >= count) break
    if (!picked.some((x) => x.sku === p.sku)) picked.push(p)
  }
  return picked
}

export const inStockSizes = (p) =>
  p.stockTracked === false || !Array.isArray(p.sizesInStock)
    ? (p.sizes || [])
    : p.sizesInStock

/** Display brand: products created under the old label are shown as
    Laceloft, and placeholder values like "Unbranded / Brand Not Verified"
    are hidden (empty string) rather than printed on the storefront. */
export const brandLabel = (b) => {
  const name = (b || '').trim()
  if (!name || /unbranded|not verified/i.test(name)) return ''
  return /^eleven$/i.test(name) ? 'Laceloft' : name
}

/** Canonical product URL. The trailing slash matters: the static host only
    serves the per-product share page (scripts/postbuild.mjs) at
    /product/<sku>/ — without it the SPA rewrite wins and link previews
    fall back to the generic site card. */
export const productPath = (sku) => `/product/${encodeURIComponent(sku)}/`
