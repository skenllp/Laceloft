import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { fmtPrice } from '../lib/api'
import ProductImage from './ProductImage'
import { brandLabel, inStockSizes } from '../lib/catalog'

export default function ProductCard({ p, priority = false }) {
  const { isWished, toggleWish, showToast } = useShop()
  const wished = isWished(p.sku)
  const img = (p.images && p.images[0]) || ''
  const sizes = inStockSizes(p)
  const soldOut = p.inStock === false || (p.stockTracked === true && Array.isArray(p.sizes) && p.sizes.length > 0 && sizes.length === 0)
  const availabilityUnconfirmed = !soldOut && (p.stockTracked === false || !Array.isArray(p.sizesInStock))
  const href = `/product/${encodeURIComponent(p.sku)}`

  const handleWish = () => {
    const now = toggleWish(p.sku)
    showToast(now ? 'Saved to wishlist' : 'Removed from wishlist')
  }

  return (
    <article className="group flex flex-col">
      {/* Square frame + slight base zoom: the catalogue photos mix tall and
          wide shapes and carry white margins, which left the shoe looking
          half-sized in the old padded 4:5 box. */}
      <div className="relative aspect-square overflow-hidden rounded-4xl bg-sand/60">
        <Link to={href} aria-label={`View ${p.name}`} className="absolute inset-0 z-0 flex items-center justify-center p-1">
          <ProductImage
            src={img}
            alt={p.name}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={`h-full w-full scale-[1.12] object-contain mix-blend-multiply transition duration-700 ease-out group-hover:scale-[1.18] ${soldOut ? 'opacity-60 grayscale' : ''}`}
          />
        </Link>
        <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
          {p.isNew && <span className="rounded-full bg-espresso px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory">New</span>}
          {!p.isNew && p.onSale && <span className="rounded-full bg-tan px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Sale</span>}
          {availabilityUnconfirmed && <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso">Confirm availability</span>}
          {soldOut && <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Sold out</span>}
        </div>
        <button
          type="button"
          aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
          aria-pressed={wished}
          onClick={handleWish}
          className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white ${wished ? 'text-olive-deep' : 'text-espresso'}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="px-1 pt-4">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{brandLabel(p.brand)}</div>
        <h3 className="mb-2 font-display text-[19px] leading-snug text-espresso">
          <Link to={href} className="no-underline hover:text-olive-deep">{p.name}</Link>
        </h3>
        {sizes.length > 0 && (
          <p className="mb-3 text-[12px] text-muted">
            UK {sizes.slice(0, 5).join(' · ')}{sizes.length > 5 ? ' …' : ''}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold">{fmtPrice(p.price)}</span>
            {p.strike > p.price && <span className="text-[12px] text-muted line-through">{fmtPrice(p.strike)}</span>}
          </div>
          <Link to={href} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso no-underline underline-offset-4 hover:underline">
            View ↗
          </Link>
        </div>
      </div>
    </article>
  )
}
