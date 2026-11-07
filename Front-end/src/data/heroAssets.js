/* Laceloft hero cutouts: produced from the corresponding original product
   catalogue photographs. Any unavailable asset falls back to the original
   photo without breaking the carousel. Swap an image here if needed. */
export const HERO_ASSETS = {
  'LL-001': '/images/hero/LL-001.webp',
  'LL-002': '/images/hero/LL-002.webp',
  'LL-008': '/images/hero/LL-008.webp',
  'LL-013': '/images/hero/LL-013.webp',
}

/* The same cutouts, trimmed to the shoe and shrunk, for the small thumbnail
   strip under the hero (no empty margin, ~20 KB each). */
export const HERO_THUMBS = Object.fromEntries(
  Object.entries(HERO_ASSETS).map(([sku, url]) => [sku, url.replace('/images/hero/', '/images/hero/thumbs/')]),
)
