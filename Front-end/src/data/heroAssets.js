/* Laceloft hero cutouts: produced from the corresponding original product
   catalogue photographs. Any unavailable asset falls back to the original
   photo without breaking the carousel. Swap an image here if needed. */
export const HERO_ASSETS = {
  'AD-SMB-BRN': '/images/hero/adidas-samba-brown.webp',
  'NB-9060-NRG': '/images/hero/new-balance-9060.webp',
  'AJ4-SB-PINE': '/images/hero/jordan-sb-pine.webp',
  'OT-MX66-CRM': '/images/hero/onitsuka-cream.webp',
}

/* The same cutouts, trimmed to the shoe and shrunk, for the small thumbnail
   strip under the hero (no empty margin, ~20 KB each). */
export const HERO_THUMBS = Object.fromEntries(
  Object.entries(HERO_ASSETS).map(([sku, url]) => [sku, url.replace('/images/hero/', '/images/hero/thumbs/')]),
)
