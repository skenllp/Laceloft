import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { fetchProduct, fmtPrice } from '../lib/api'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { inStockSizes, brandLabel, productPath, splitDescription, thumbAt } from '../lib/catalog'
import { usePageMeta } from '../hooks/usePageMeta'
import { Breadcrumbs } from '../components/PageHeader'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import SizeGuide from '../components/SizeGuide'
import { HeartIcon, WhatsAppIcon } from '../components/Layout'

const MAX_QTY = 10

export default function Product() {
  const { sku } = useParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  // Normalise /product/<sku> to /product/<sku>/ so a link copied from the
  // address bar is the one with a proper WhatsApp/Google preview.
  useEffect(() => {
    if (!pathname.endsWith('/')) navigate(productPath(sku) + search, { replace: true })
  }, [pathname, search, sku, navigate])
  const { products, isWished, toggleWish, showToast } = useShop()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [sizeError, setSizeError] = useState(false)
  const [zoom, setZoom] = useState(null)
  const sizesRef = useRef(null)
  const touchX = useRef(null)

  usePageMeta(p?.name, p ? `${p.name} at Laceloft — ${fmtPrice(p.price)}. Enquire and order directly through WhatsApp.` : undefined)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setImgIdx(0); setSize(null); setQty(1); setSizeError(false)
    fetchProduct(sku).then((data) => { if (alive) { setP(data); setLoading(false) } })
    return () => { alive = false }
  }, [sku])

  const available = useMemo(() => (p ? inStockSizes(p) : []), [p])
  const hasSizes = !!p && Array.isArray(p.sizes) && p.sizes.length > 0
  const soldOut = !!p && (p.inStock === false || (p.stockTracked === true && hasSizes && available.length === 0))
  const stockUnconfirmed = !!p && p.inStock !== false && (p.stockTracked === false || !Array.isArray(p.sizesInStock))
  const related = useMemo(() => {
    if (!p) return []
    const mine = new Set(p.cats || [])
    return products.filter((x) => x.sku !== p.sku && (x.cats || []).some((c) => mine.has(c))).slice(0, 4)
  }, [p, products])

  // Product structured data — only facts we actually have (no ratings/reviews).
  useEffect(() => {
    if (!p) return undefined
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.laceloft = 'product'
    el.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.sku,
      description: p.desc,
      brand: brandLabel(p.brand) ? { '@type': 'Brand', name: brandLabel(p.brand) } : undefined,
      color: p.colorway || undefined,
      image: (p.images || []).slice(0, 4),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: p.price,
        url: window.location.href,
        availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      },
    })
    document.head.appendChild(el)
    return () => el.remove()
  }, [p, soldOut])

  if (loading) return (
    <div className="page-pad mx-auto grid max-w-[1500px] animate-pulse gap-10 pb-16 pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16" aria-busy="true" aria-label="Loading product">
      <div className="aspect-square rounded-5xl bg-sand/60" />
      <div className="space-y-5 lg:pt-4">
        <div className="h-3 w-32 rounded-full bg-sand/80" />
        <div className="h-12 w-4/5 rounded-2xl bg-sand/80" />
        <div className="h-8 w-28 rounded-full bg-sand/80" />
        <div className="flex gap-2 pt-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 w-12 rounded-full bg-sand/70" />)}</div>
        <div className="h-14 w-full rounded-full bg-sand/80" />
      </div>
    </div>
  )
  if (!p) return (
    <div className="page-pad py-32 text-center">
      <p className="mb-6 text-muted">We couldn't find that pair.</p>
      <Link to="/shop" className="btn-outline no-underline">Back to shop</Link>
    </div>
  )

  const wished = isWished(p.sku)
  const details = splitDescription(p.desc)
  const images = p.images && p.images.length ? p.images : ['']

  const order = () => {
    if (soldOut) return
    if (hasSizes && !size) {
      setSizeError(true)
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSizeError(false)
    window.open(buildWhatsAppLink(p, { size, color: p.colorway, quantity: qty }), '_blank', 'noopener,noreferrer')
  }

  // Swipe between photos on touch screens (horizontal moves over 40px).
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current === null || images.length < 2) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 40) setImgIdx((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length)
  }

  const onZoomMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  const OrderButton = ({ className = '' }) => (
    <button type="button" disabled={soldOut} onClick={order} className={`btn-primary ${className}`}>
      <WhatsAppIcon />
      {soldOut ? 'Sold out' : stockUnconfirmed ? 'Enquire on WhatsApp' : 'Order on WhatsApp'}
    </button>
  )

  return (
    <div className="page-pad mx-auto max-w-[1500px] pb-28 pt-8 lg:pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: p.name }]} />

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="group relative mb-3 aspect-square cursor-zoom-in overflow-hidden rounded-5xl bg-sand/60"
            onMouseMove={onZoomMove}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseLeave={() => setZoom(null)}
          >
            <ProductImage
              key={imgIdx}
              src={images[imgIdx]}
              alt={`${p.name} — view ${imgIdx + 1}`}
              fetchpriority="high"
              frame={1}
              style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: 'scale(1.9)' } : undefined}
              className="h-full w-full transition-transform duration-200 ease-out"
            />
            <div className="pointer-events-none absolute left-5 top-5 flex gap-2">
              {p.isNew && <span className="rounded-full bg-espresso px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory">New</span>}
              {p.onSale && <span className="rounded-full bg-tan px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Sale</span>}
            </div>
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous image" onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 hidden h-11 w-11 sm:flex -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-espresso hover:bg-white">←</button>
                <button type="button" aria-label="Next image" onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 hidden h-11 w-11 sm:flex -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-espresso hover:bg-white">→</button>
                {/* Swipe hint on phones, where the arrows are hidden */}
                <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-espresso sm:hidden" aria-hidden="true">{imgIdx + 1} / {images.length}</span>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="no-scrollbar flex gap-3 overflow-x-auto py-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === imgIdx}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-sand/60 p-1.5 transition ${i === imgIdx ? 'outline outline-2 outline-olive' : 'opacity-80 hover:opacity-100'}`}
                >
                  <ProductImage src={thumbAt(p, i) || src} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply" placeholderClass="w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:pt-4">
          <p className="label-eyebrow mb-3">{[brandLabel(p.brand), (p.cats || [])[0]].filter(Boolean).join(' · ')}</p>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] text-espresso">{p.name}</h1>
          {p.colorway && <p className="mt-3 text-[15px] text-muted">Colour: <span className="text-espresso">{p.colorway}</span></p>}

          <div className="mb-6 mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{fmtPrice(p.price)}</span>
            {p.strike > p.price && (
              <>
                <span className="text-base text-muted line-through">{fmtPrice(p.strike)}</span>
                <span className="rounded-full bg-tan/20 px-2.5 py-0.5 text-xs font-semibold text-[#7a5a40]">Save {Math.round((1 - p.price / p.strike) * 100)}%</span>
              </>
            )}
          </div>

          <p className={`mb-8 flex items-center gap-2 text-[13px] font-medium ${soldOut ? 'text-muted' : 'text-olive-deep'}`}>
            <span className={`h-2 w-2 rounded-full ${soldOut ? 'bg-muted/50' : 'bg-olive'}`} aria-hidden="true" />
            {soldOut ? 'Currently sold out' : stockUnconfirmed ? 'Confirm size and availability on WhatsApp' : hasSizes ? `In stock · ${available.length} size${available.length === 1 ? '' : 's'} available` : 'In stock'}
          </p>

          {hasSizes && (
            <div ref={sizesRef} className="mb-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Size (UK){size ? ` — ${size.replace('UK ', '')}` : ''}</h2>
                <SizeGuide sizes={p.sizes} productName={p.name} />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a size">
                {p.sizes.map((s) => {
                  const oos = !available.includes(s)
                  const selected = size === 'UK ' + s
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={oos}
                      aria-pressed={selected}
                      title={oos ? 'Out of stock' : undefined}
                      onClick={() => { setSize('UK ' + s); setSizeError(false) }}
                      className={`h-12 min-w-12 rounded-full border px-4 text-sm font-medium transition ${oos ? 'cursor-not-allowed border-hairline text-muted/40 line-through' : selected ? 'border-espresso bg-espresso text-ivory' : 'border-hairline bg-white hover:border-espresso'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {sizeError && <p role="alert" className="mt-3 rounded-2xl border border-[#9b4a3a]/40 bg-[#9b4a3a]/5 px-4 py-2.5 text-[13px] text-[#8a3f31]">Please choose a size before ordering.</p>}
            </div>
          )}

          <div className="mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-hairline bg-white" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-12 rounded-full text-lg hover:bg-espresso/5 disabled:opacity-30">−</button>
              <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} className="h-12 w-12 rounded-full text-lg hover:bg-espresso/5 disabled:opacity-30">+</button>
            </div>
            <button
              type="button"
              aria-pressed={wished}
              onClick={() => { const now = toggleWish(p.sku); showToast(now ? 'Saved to wishlist' : 'Removed from wishlist') }}
              className="flex h-12 items-center gap-2 rounded-full border border-hairline bg-white px-5 text-[12px] font-semibold uppercase tracking-[0.12em] hover:border-espresso"
            >
              <HeartIcon filled={wished} width="17" height="17" className={wished ? 'text-olive-deep' : ''} /> {wished ? 'Saved' : 'Wishlist'}
            </button>
          </div>

          <OrderButton className="hidden w-full lg:flex" />
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            This opens WhatsApp with your pair, size and quantity filled in. Your order is only confirmed once Laceloft replies with availability, delivery charges and the final amount.
          </p>

          <div className="mt-10 border-t border-hairline pt-8">
            <h2 className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Details</h2>
            {details.body && <p className="mb-6 text-[15px] leading-relaxed text-espresso/85">{details.body}</p>}
            <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-[14px]">
              {p.colorway && (<><dt className="text-muted">Colour</dt><dd className="text-espresso">{p.colorway}</dd></>)}
              {(p.cats || []).length > 0 && (<><dt className="text-muted">Style</dt><dd className="text-espresso">{p.cats.join(' · ')}</dd></>)}
              {hasSizes && (<><dt className="text-muted">Sizes</dt><dd className="text-espresso">UK {p.sizes.join(', ')}</dd></>)}
              <dt className="text-muted">Ordering</dt><dd className="text-espresso">Confirmed on WhatsApp</dd>
            </dl>
            {details.note && <p className="mt-6 text-[11px] leading-relaxed text-muted/80">{details.note}</p>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-8 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-none">You may also like.</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            {related.map((x) => <ProductCard key={x.sku} p={x} />)}
          </div>
        </section>
      )}

      {/* Sticky mobile order bar */}
      <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-hairline bg-ivory/95 px-5 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="truncate text-[12px] text-muted">{p.name}</p>
            <p className="text-base font-semibold">{fmtPrice(p.price * qty)}</p>
          </div>
          <OrderButton className="ml-auto whitespace-nowrap !px-5 !tracking-[0.08em]" />
        </div>
      </div>
    </div>
  )
}
