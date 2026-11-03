import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { getCategories, inStockSizes, brandLabel } from '../lib/catalog'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import ProductCard from '../components/ProductCard'
import PageHeader from '../components/PageHeader'

const PAGE_SIZE = 12
// Bands sized to the actual catalogue (roughly ₹800–₹2,200).
const PRICE_BANDS = [
  { id: 'u1', label: 'Under ₹1,000', test: (p) => p < 1000 },
  { id: '1-15', label: '₹1,000 – ₹1,500', test: (p) => p >= 1000 && p < 1500 },
  { id: '15-2', label: '₹1,500 – ₹2,000', test: (p) => p >= 1500 && p < 2000 },
  { id: 'o2', label: '₹2,000 & above', test: (p) => p >= 2000 },
]
// "For" filter: unisex pairs count for both, since most of the catalogue is unisex.
const FOR_OPTIONS = [
  { id: 'men', label: 'Men', fits: ['Men', 'Unisex'] },
  { id: 'women', label: 'Women', fits: ['Women', 'Unisex'] },
]
const SORTS = {
  featured: { label: 'Featured' },
  newest: { label: 'Newest first', fn: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) },
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

  const cat = params.get('cat') || 'All'
  const q = params.get('q') || ''
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'featured'
  const band = params.get('price') || ''
  const size = params.get('size') || ''
  const forWho = FOR_OPTIONS.find((o) => o.id === params.get('for'))

  usePageMeta(cat === 'All' ? 'Shop' : cat, 'Browse the Laceloft collection of sneakers and everyday footwear.')

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
    setVisible(PAGE_SIZE)
  }

  const cats = useMemo(() => getCategories(products), [products])
  const sizes = useMemo(() => {
    const set = new Set()
    products.forEach((p) => inStockSizes(p).forEach((s) => set.add(s)))
    return Array.from(set).sort((a, b) => a - b)
  }, [products])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let arr = products.filter((p) => {
      if (cat !== 'All' && !(p.cats || []).includes(cat)) return false
      if (forWho && !(p.gender || ['Unisex']).some((g) => forWho.fits.includes(g))) return false
      if (band && !PRICE_BANDS.find((b) => b.id === band)?.test(p.price)) return false
      if (size && !inStockSizes(p).map(String).includes(size)) return false
      if (term && ![p.name, brandLabel(p.brand), p.colorway, ...(p.cats || [])].filter(Boolean).some((s) => s.toLowerCase().includes(term))) return false
      return true
    })
    const fn = SORTS[sort].fn
    if (fn) arr = [...arr].sort(fn)
    return arr
  }, [products, cat, q, band, size, sort, forWho])

  // Said once here instead of as a badge on every card.
  const unconfirmed = !productsLoading && filtered.some((p) => p.inStock !== false && p.stockTracked !== true)

  const activeFilters = [band, size, q, forWho].filter(Boolean).length + (cat !== 'All' ? 1 : 0)
  const clearAll = () => { setParams({}, { replace: true }); setVisible(PAGE_SIZE) }

  const filters = (
    <>
      <FilterBlock title="For">
        <Chip on={!forWho} onClick={() => setParam('for', '')}>Everyone</Chip>
        {FOR_OPTIONS.map((o) => <Chip key={o.id} on={forWho?.id === o.id} onClick={() => setParam('for', forWho?.id === o.id ? '' : o.id)}>{o.label}</Chip>)}
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
      <PageHeader eyebrow="The collection" title={cat === 'All' ? 'The full collection.' : `${cat}.`} crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop' }]}>
        Sneakers, boots, sandals and more — filter by category, price and size.
      </PageHeader>

      <div className="page-pad mx-auto max-w-[1500px] pb-10 lg:grid lg:grid-cols-[250px_1fr] lg:gap-12">
        {/* Filters: sidebar on desktop, collapsible on mobile */}
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            className="btn-outline mb-5 w-full lg:hidden"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {filtersOpen ? 'Hide filters' : `Filters${activeFilters ? ` (${activeFilters})` : ''}`}
          </button>
          <div className={`${filtersOpen ? 'block' : 'hidden'} mb-8 lg:block`}>
            <div className="mb-7">
              <label htmlFor="shop-q" className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Search</label>
              <input id="shop-q" type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Name, brand, colour…" className="input-field" />
            </div>
            {filters}
            {activeFilters > 0 && <button type="button" onClick={clearAll} className="text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso underline underline-offset-4">Clear all</button>}
          </div>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-hairline pb-4">
            <p className="text-[13px] text-muted" aria-live="polite">
              {productsLoading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'pair' : 'pairs'}`}
            </p>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <span className="sr-only sm:not-sr-only">Sort</span>
              <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'featured' ? '' : e.target.value)} className="rounded-full border border-hairline bg-white px-4 py-2 text-base text-espresso sm:text-[13px] focus:border-olive focus:outline-none">
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>

          {unconfirmed && (
            <p className="-mt-2 mb-6 flex items-center gap-2 text-[12px] text-muted">
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
    </>
  )
}
