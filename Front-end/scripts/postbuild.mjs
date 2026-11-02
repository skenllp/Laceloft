/* Runs after `vite build` (see package.json).

   The storefront is a single-page app, so link-preview bots (WhatsApp,
   Facebook, Google) only ever see the generic tags in index.html. This
   writes a copy of index.html per product with that product's title,
   description and photo, plus sitemap.xml and robots.txt.

   Never fails the build: if the API can't be reached (e.g. the free
   backend is asleep), the site still ships, just without per-product
   previews and with a sitemap of the fixed pages only. */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { loadEnv } from 'vite'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const API_BASE = env.VITE_API_BASE || 'https://laceloftbackend.onrender.com/api'
const SITE_URL = (env.VITE_SITE_URL || 'https://laceloft.onrender.com').replace(/\/$/, '')
const DIST = new URL('../dist/', import.meta.url)
const STATIC_ROUTES = ['/', '/shop', '/new-arrivals', '/collections', '/about', '/contact']

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function fetchProducts() {
  // Two attempts with a long timeout: a sleeping free Render service can
  // take most of a minute to answer the first request.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/products/`, { signal: AbortSignal.timeout(75000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('unexpected response')
      return data
    } catch (err) {
      console.warn(`postbuild: could not load products (attempt ${attempt}): ${err.message}`)
    }
  }
  return []
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  return re.test(html)
    ? html.replace(re, `$1${esc(value)}$2`)
    : html.replace('</head>', `  <meta ${attr}="${key}" content="${esc(value)}" />\n</head>`)
}

function productPage(template, p) {
  const url = `${SITE_URL}/product/${encodeURIComponent(p.sku)}/`
  const title = `${p.name} | Laceloft`
  const full = p.desc || `${p.name} at Laceloft. Enquire and order directly on WhatsApp.`
  const desc = full.length <= 200 ? full : full.slice(0, 200).replace(/\s+\S*$/, '') + '…'
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, 'name', 'description', desc)
  html = setMeta(html, 'property', 'og:type', 'product')
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', desc)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', desc)
  const image = (p.images || [])[0]
  if (image) {
    html = setMeta(html, 'property', 'og:image', image)
    html = setMeta(html, 'name', 'twitter:image', image)
    // The template's 1200x630 size belongs to the default og-image only.
    html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*" \/>/g, '')
  }
  return html.replace('</head>', `  <link rel="canonical" href="${esc(url)}" />\n</head>`)
}

const template = await readFile(new URL('index.html', DIST), 'utf8')
const products = (await fetchProducts()).filter((p) => /^[A-Za-z0-9._-]+$/.test(p.sku || ''))

for (const p of products) {
  const dir = new URL(`product/${p.sku}/`, DIST)
  await mkdir(dir, { recursive: true })
  await writeFile(new URL('index.html', dir), productPage(template, p))
}

const urls = [...STATIC_ROUTES, ...products.map((p) => `/product/${encodeURIComponent(p.sku)}/`)]
await writeFile(new URL('sitemap.xml', DIST),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${esc(SITE_URL + u)}</loc></url>`).join('\n') +
  '\n</urlset>\n')
await writeFile(new URL('robots.txt', DIST), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`postbuild: ${products.length} product share pages, sitemap with ${urls.length} URLs (${SITE_URL})`)
