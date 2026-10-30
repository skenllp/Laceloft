import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductCard from '../components/ProductCard'
import PageHeader from '../components/PageHeader'

export default function Wishlist() {
  usePageMeta('Wishlist')
  const { products, wishlist } = useShop()
  const items = products.filter((p) => wishlist.includes(p.sku))

  return (
    <>
      <PageHeader eyebrow="Saved pairs" title="Your wishlist." crumbs={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
      <div className="page-pad mx-auto max-w-[1500px] pb-20">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-6 text-sm text-muted">Nothing saved yet. Tap the heart on any pair to keep it here.</p>
            <Link to="/shop" className="btn-primary no-underline">Browse the shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.sku} p={p} />)}
          </div>
        )}
      </div>
    </>
  )
}
