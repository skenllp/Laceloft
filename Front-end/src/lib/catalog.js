/* Small helpers that derive homepage/shop data from the live catalogue,
   so nothing on the storefront is hardcoded or invented. */

export const hasImage = (p) => Array.isArray(p.images) && p.images.length > 0 && !!p.images[0]

/** Grid-size photo i (small WebP from the API), falling back to the full
 *  photo — e.g. for the offline catalogue, which has no thumbs. */
export const thumbAt = (p, i = 0) => (p?.thumbs && p.thumbs[i]) || (p?.images && p.images[i]) || ''

/** Products whose first photo is a clean, light studio shot, best first.
 *  Picked by measuring each photo's background and then checked by eye;
 *  used to choose homepage/category imagery so handheld or cluttered
 *  photos stay on the product pages. Unknown SKUs simply rank lower. */
export const STUDIO_SKUS = [
  'AD-SMB-BRN', 'OT-MX66-CRM', 'AJ4-SB-PINE', 'NB-9060-NRG', 'AJ4-RED-SDE', 'AJ4-NVW-RD',
  'OT-MX66-YLW', 'AD-SMB-FLR', 'AJ4-THDR-BY', 'NB-CHK-BLK', 'AD-FRM-WHT', 'SLD-WHT', 'PM-RC-RED',
]

/** Lower is better: studio photos first, then any photo, then none. */
export const photoRank = (p) => {
  if (!hasImage(p)) return 10000
  const i = STUDIO_SKUS.indexOf(p.sku)
  return i === -1 ? 1000 : i
}

/** Categories actually present in the catalogue, biggest first. Each gets a
 *  cover product with the best available photo, and no two categories share
 *  a cover (pass `taken` to also avoid covers used elsewhere on the page). */
export function getCategories(products, taken = new Set()) {
  const map = new Map()
  products.forEach((p) => {
    ;(p.cats || []).forEach((c) => {
      if (!map.has(c)) map.set(c, { name: c, count: 0, cover: null, members: [] })
      const entry = map.get(c)
      entry.count += 1
      entry.members.push(p)
    })
  })
  const used = new Set(taken)
  const cats = Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  for (const c of cats) {
    const ranked = [...c.members].sort((a, b) => photoRank(a) - photoRank(b))
    c.cover = ranked.find((p) => !used.has(p.sku)) || ranked[0]
    if (c.cover) used.add(c.cover.sku)
    delete c.members
  }
  return cats
}

/** Best-photographed product not already shown, for feature banners. */
export const pickFeatured = (products, exclude = new Set()) =>
  [...products].filter((p) => hasImage(p) && !exclude.has(p.sku)).sort((a, b) => photoRank(a) - photoRank(b))[0]

/** Seed descriptions end with a legal note ("Style reference only; ...").
 *  Split it off so the page can lead with the description and show the
 *  note as small print. */
export function splitDescription(desc = '') {
  const i = desc.search(/Style reference only/i)
  if (i === -1) return { body: desc.trim(), note: '' }
  return { body: desc.slice(0, i).trim(), note: desc.slice(i).trim() }
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
  const ranked = [...pool].sort((a, b) => photoRank(a) - photoRank(b))
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
