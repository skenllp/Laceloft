import { pickEditorialProducts, thumbAt } from '../lib/catalog'
import ProductImage from './ProductImage'

/** Two offset product photos beside or below the brand story. */
export default function EditorialPhotos({ products, className = '' }) {
  const picks = pickEditorialProducts(products)
  if (picks.length < 2) return null
  return (
    <div className={`grid grid-cols-2 gap-4 sm:gap-6 ${className}`}>
      {picks.map((p, i) => (
        <div key={p.sku} className={`relative aspect-[4/5] overflow-hidden rounded-4xl bg-sand/60 ${i === 1 ? 'mt-10 sm:mt-16' : 'mb-10 sm:mb-16'}`}>
          <ProductImage src={thumbAt(p, 0)} alt={`${p.name}, ${p.colorway}`} loading="lazy" frame={0.8} className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}
