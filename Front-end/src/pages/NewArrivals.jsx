import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import ProductCard from '../components/ProductCard'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'

export default function NewArrivals() {
  usePageMeta('New Arrivals', 'The latest pairs to land at Laceloft.')
  const { products, productsLoading } = useShop()
  const fresh = products.filter((p) => p.isNew)
  const sale = products.filter((p) => p.onSale)

  return (
    <>
      <PageHeader eyebrow="Just landed" title="Fresh in the Loft." crumbs={[{ label: 'Home', to: '/' }, { label: 'New Arrivals' }]}>
        The newest pairs in the Laceloft rotation.
      </PageHeader>

      <section className="page-pad mx-auto max-w-[1500px] pb-16" aria-label="New arrivals">
        <p className="mb-6 border-b border-hairline pb-4 text-[13px] text-muted">{productsLoading ? 'Loading…' : `${fresh.length} new ${fresh.length === 1 ? 'style' : 'styles'}`}</p>
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : fresh.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-5 text-sm text-muted">Nothing new right now — check back soon.</p>
            <Link to="/shop" className="btn-primary no-underline">Browse the shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {fresh.map((p, i) => <Reveal key={p.sku} delay={(i % 4) * 70}><ProductCard p={p} priority={i < 4} /></Reveal>)}
          </div>
        )}
      </section>

      {!productsLoading && sale.length > 0 && (
        <section className="page-pad mx-auto max-w-[1500px] pb-16" aria-label="On sale">
          <div className="mb-8 border-t border-hairline pt-12">
            <p className="label-eyebrow mb-3">Marked down</p>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-none">On sale now.</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {sale.map((p, i) => <Reveal key={p.sku} delay={(i % 4) * 70}><ProductCard p={p} /></Reveal>)}
          </div>
        </section>
      )}
    </>
  )
}
