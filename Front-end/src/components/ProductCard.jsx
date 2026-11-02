import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { fmtPrice } from '../lib/api'
import ProductImage from './ProductImage'
import { brandLabel, inStockSizes, productPath, thumbAt } from '../lib/catalog'

export default function ProductCard({ p, priority = false }) {
  const { isWished, toggleWish, showToast } = useShop()
  const wished = isWished(p.sku)
  const img = thumbAt(p, 0)
  const alt = thumbAt(p, 1)
  const sizes = inStockSizes(p)
  const soldOut = p.inStock === false || (p.stockTracked === true && Array.isArray(p.sizes) && p.sizes.length > 0 && sizes.length === 0)
  // One badge at most, in order of importance. "Confirm availability" used
  // to sit on every card; the shop page now says it once instead.
  const badge = soldOut ? 'Sold out' : p.onSale ? 'Sale' : p.isNew ? 'New' : null
  const href = productPath(p.sku)

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
            className={`h-full w-full scale-[1.12] object-contain mix-blend-multiply transition duration-700 ease-out group-hover:scale-[1.18] ${alt ? '[@media(hover:hover)]:group-hover:opacity-0' : ''} ${soldOut ? 'opacity-60 grayscale' : ''}`}
          />
          {/* Second photo fades in on hover (mouse devices only). */}
          {alt && !soldOut && (
            <ProductImage
              src={alt}
              alt=""
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-1 hidden h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] scale-[1.12] object-contain opacity-0 mix-blend-multiply transition duration-700 ease-out group-hover:opacity-100 [@media(hover:hover)]:block"
            />
          )}
        </Link>
        <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
          {badge && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${badge === 'Sold out' ? 'bg-white text-muted' : badge === 'Sale' ? 'bg-tan text-white' : 'bg-espresso text-ivory'}`}>{badge}</span>
          )}
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
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{brandLabel(p.brand) || (p.cats || [])[0]}</div>
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
          <Link to={href} className="-my-3 -mr-2 py-3 pl-3 pr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso no-underline underline-offset-4 hover:underline">
            View ↗
          </Link>
        </div>
      </div>
    </article>
  )
}
