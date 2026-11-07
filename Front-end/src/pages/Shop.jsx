import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { getCategories, inStockSizes, brandLabel, byNewest, CATEGORY_GROUPS } from '../lib/catalog'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import ProductCard from '../components/ProductCard'
import PageHeader from '../components/PageHeader'

const PAGE_SIZE = 12
// Bands sized to the actual catalogue (roughly ₹1,000–₹3,300).
const PRICE_BANDS = [
  { id: 'u15', label: 'Under ₹1,500', test: (p) => p < 1500 },
  { id: '15-25', label: '₹1,500 – ₹2,500', test: (p) => p >= 1500 && p < 2500 },
  { id: '25-3', label: '₹2,500 – ₹3,000', test: (p) => p >= 2500 && p < 3000 },
  { id: 'o3', label: '₹3,000 & above', test: (p) => p >= 3000 },
]
// "For" filter: unisex pairs count for both, since most of the catalogue is unisex.
const FOR_OPTIONS = [
  { id: 'men', label: 'Men', fits: ['Men', 'Unisex'] },
  { id: 'women', label: 'Women', fits: ['Women', 'Unisex'] },
]
const SORTS = {
  featured: { label: 'Featured' },
  newest: { label: 'Newest first', fn: byNewest },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
}

function FilterBlock({ title, children }) {
  return (
    <fieldset className="mb-7">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
function Chip({ on, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={`chip ${on ? 'chip-active' : ''}`}>{children}</button>
}

export default function Shop() {
  const { products, productsLoading } = useShop()
  const [params, setParams] = useSearchParams()
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const openButton = useRef(null)
  const drawer = useRef(null)

  const cat = params.get('cat') || 'All'
  // Values come from the address bar, so only trust the ones we defined.
  const groupId = params.get('group')
  const group = groupId && Object.hasOwn(CATEGORY_GROUPS, groupId) ? CATEGORY_GROUPS[groupId] : null
  const q = params.get('q') || ''
  const sort = Object.hasOwn(SORTS, params.get('sort') || '') ? params.get('sort') : 'featured'
  const priceBand = PRICE_BANDS.find((b) => b.id === params.get('price'))
  const band = priceBand?.id || ''
  const size = params.get('size') || ''
  const forWho = FOR_OPTIONS.find((o) => o.id === params.get('for'))

  usePageMeta(group ? group.label : cat === 'All' ? 'Shop' : cat, 'Browse the Laceloft collection of sneakers, sandals and everyday footwear.')

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
    setVisible(PAGE_SIZE)
  }

  const cats = useMemo(() => getCategories(products), [products])
  const groups = useMemo(() => Object.values(CATEGORY_GROUPS).filter((g) => products.some(g.test)), [products])
  const sizes = useMemo(() => {
    const set = new Set()
    products.forEach((p) => inStockSizes(p).forEach((s) => set.add(s)))
    return Array.from(set).sort((a, b) => a - b)
  }, [products])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let arr = products.filter((p) => {
      if (group && !group.test(p)) return false
      if (cat !== 'All' && !(p.cats || []).includes(cat)) return false
      if (forWho && !(p.gender || ['Unisex']).some((g) => forWho.fits.includes(g))) return false
      if (priceBand && !priceBand.test(p.price)) return false
      if (size && !inStockSizes(p).map(String).includes(size)) return false
      if (term && ![p.name, brandLabel(p.brand), p.colorway, ...(p.cats || [])].filter(Boolean).some((s) => s.toLowerCase().includes(term))) return false
      return true
    })
    const fn = SORTS[sort].fn
    if (fn) arr = [...arr].sort(fn)
    return arr
  }, [products, cat, group, q, priceBand, size, sort, forWho])

  // Said once here instead of as a badge on every card.
  const unconfirmed = !productsLoading && filtered.some((p) => p.inStock !== false && p.stockTracked !== true)

  const active = [
    forWho && { key: 'for', label: `For ${forWho.label.toLowerCase()}` },
    group && { key: 'group', label: group.label },
    cat !== 'All' && { key: 'cat', label: cat },
    priceBand && { key: 'price', label: priceBand.label },
    size && { key: 'size', label: `UK ${size}` },
    q && { key: 'q', label: `"${q}"` },
  ].filter(Boolean)
  const clearAll = () => { setParams({}, { replace: true }); setVisible(PAGE_SIZE) }

  // Phone filter drawer: lock the page behind it, close on Esc, keep Tab inside.
  useEffect(() => {
    if (!filtersOpen) return undefined
    const button = openButton.current
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawer.current?.querySelector('button')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false)
      if (e.key !== 'Tab') return
      const items = drawer.current?.querySelectorAll('button, input')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      button?.focus()
    }
  }, [filtersOpen])

  const filters = (idPrefix) => (
    <>
      <div className="mb-7">
        <label htmlFor={`${idPrefix}-q`} className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Search</label>
        <input id={`${idPrefix}-q`} type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Name, brand, colour…" className="input-field" />
      </div>
      <FilterBlock title="For">
        <Chip on={!forWho} onClick={() => setParam('for', '')}>Everyone</Chip>
        {FOR_OPTIONS.map((o) => <Chip key={o.id} on={forWho?.id === o.id} onClick={() => setParam('for', forWho?.id === o.id ? '' : o.id)}>{o.label}</Chip>)}
      </FilterBlock>
      <FilterBlock title="Type">
        <Chip on={!group} onClick={() => setParam('group', '')}>All</Chip>
        {groups.map((g) => <Chip key={g.id} on={group?.id === g.id} onClick={() => setParam('group', group?.id === g.id ? '' : g.id)}>{g.label}</Chip>)}
      </FilterBlock>
      <FilterBlock title="Category">
        <Chip on={cat === 'All'} onClick={() => setParam('cat', '')}>All</Chip>
        {cats.map((c) => <Chip key={c.name} on={cat === c.name} onClick={() => setParam('cat', c.name)}>{c.name}</Chip>)}
      </FilterBlock>
      <FilterBlock title="Price">
        {PRICE_BANDS.map((b) => <Chip key={b.id} on={band === b.id} onClick={() => setParam('price', band === b.id ? '' : b.id)}>{b.label}</Chip>)}
      </FilterBlock>
      {sizes.length > 0 && (
        <FilterBlock title="Size (UK)">
          {sizes.map((s) => <Chip key={s} on={size === String(s)} onClick={() => setParam('size', size === String(s) ? '' : String(s))}>{s}</Chip>)}
        </FilterBlock>
      )}
    </>
  )

  return (
    <>
      <PageHeader title={group ? `${group.label}.` : cat === 'All' ? 'The full collection.' : `${cat}.`} crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop' }]} compact />

      <div className="page-pad mx-auto max-w-[1500px] pb-10 lg:grid lg:grid-cols-[250px_1fr] lg:gap-12">
        {/* Desktop filters. Phones use the drawer below. */}
        <aside aria-label="Filters" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          {filters('side')}
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-4">
            <p className="shrink-0 text-[13px] text-muted" aria-live="polite">
              {productsLoading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'pair' : 'pairs'}`}
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <button ref={openButton} type="button" className="chip shrink-0 lg:hidden" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
                Filters{active.length ? ` (${active.length})` : ''}
              </button>
              <label className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
                <span className="sr-only lg:not-sr-only">Sort</span>
                <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'featured' ? '' : e.target.value)} className="min-w-0 max-w-[10.5rem] rounded-full border border-hairline bg-surface px-3 py-2 text-base text-espresso sm:text-[13px] focus:border-olive focus:outline-none">
                  {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {active.length > 0 && (
            <ul aria-label="Active filters" className="mb-5 flex flex-wrap items-center gap-2">
              {active.map((f) => (
                <li key={f.key}>
                  <button type="button" onClick={() => setParam(f.key, '')} aria-label={`Remove filter: ${f.label}`} className="chip chip-active">
                    {f.label} <span aria-hidden="true" className="ml-1">×</span>
                  </button>
                </li>
              ))}
              <li><button type="button" onClick={clearAll} className="px-2 py-2 text-[12px] font-semibold text-espresso underline underline-offset-4">Clear all</button></li>
            </ul>
          )}

          {unconfirmed && (
            <p className="mb-6 flex items-center gap-2 text-[12px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-olive" aria-hidden="true" />
              Sizes move fast — we confirm availability on WhatsApp before every order.
            </p>
          )}
          {productsLoading ? (
            <ProductGridSkeleton count={6} className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3" />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="mb-5 text-sm text-muted">No pairs match those filters.</p>
              <button type="button" onClick={clearAll} className="btn-outline">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3">
                {filtered.slice(0, visible).map((p, i) => <ProductCard key={p.sku} p={p} priority={i < 4} />)}
              </div>
              {visible < filtered.length && (
                <div className="mt-14 text-center">
                  <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-outline">
                    Load more ({filtered.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phone filter drawer: sits above the header and the floating WhatsApp button */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[250] lg:hidden">
          <div className="drawer-fade absolute inset-0 bg-black/70" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div ref={drawer} role="dialog" aria-modal="true" aria-label="Filters" className="drawer-in absolute inset-y-0 right-0 flex w-[min(100%,24rem)] flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-display text-2xl leading-none">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} className="-mr-2 px-2 py-2 text-[13px] font-semibold text-espresso underline underline-offset-4">Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">{filters('drawer')}</div>
            <div className="flex items-center gap-3 border-t border-hairline px-5 py-4">
              {active.length > 0 && <button type="button" onClick={clearAll} className="shrink-0 px-2 py-3 text-[12px] font-semibold text-espresso underline underline-offset-4">Clear all</button>}
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">Show {filtered.length} {filtered.length === 1 ? 'pair' : 'pairs'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
