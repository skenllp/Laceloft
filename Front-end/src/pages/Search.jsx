import { useMemo, useState } from 'react'
import { useShop } from '../context/ShopContext'
import { brandLabel } from '../lib/catalog'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductCard from '../components/ProductCard'
import PageHeader from '../components/PageHeader'

export default function Search() {
  usePageMeta('Search')
  const { products, productsLoading } = useShop()
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return products.filter((p) =>
      [p.name, brandLabel(p.brand), p.colorway, ...(p.cats || [])].filter(Boolean).some((s) => s.toLowerCase().includes(term))
    )
  }, [q, products])

  return (
    <>
      <PageHeader title="Search." crumbs={[{ label: 'Home', to: '/' }, { label: 'Search' }]} />
      <div className="page-pad mx-auto max-w-[1500px] pb-20">
        <label htmlFor="site-search" className="sr-only">Search sneakers</label>
        <input
          id="site-search"
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for a sneaker, brand, or colourway…"
          className="input-field mb-10 py-4 text-base md:text-lg"
        />
        {productsLoading ? (
          <p className="text-sm text-muted">Loading catalogue…</p>
        ) : q.trim() === '' ? (
          <p className="text-sm text-muted">Start typing to search {products.length} pairs.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted">No results for “{q}”.</p>
        ) : (
          <>
            <p className="mb-6 text-[13px] text-muted" aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => <ProductCard key={p.sku} p={p} />)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
