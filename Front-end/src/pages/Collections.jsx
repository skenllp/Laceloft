import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { getCategories } from '../lib/catalog'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import { usePageMeta } from '../hooks/usePageMeta'
import PageHeader from '../components/PageHeader'
import ProductImage from '../components/ProductImage'
import Reveal from '../components/Reveal'

export default function Collections() {
  usePageMeta('Collections', 'Browse Laceloft collections by category.')
  const { products, productsLoading } = useShop()
  const cats = useMemo(() => getCategories(products), [products])

  return (
    <>
      <PageHeader eyebrow="Collections" title="Find Your Fit." crumbs={[{ label: 'Home', to: '/' }, { label: 'Collections' }]}>
        Every collection below comes straight from the live Laceloft catalogue.
      </PageHeader>
      <div className="page-pad mx-auto max-w-[1500px] pb-16">
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {cats.map((c, i) => (
              <Reveal key={c.name} delay={(i % 4) * 60}>
                <Link to={`/shop?cat=${encodeURIComponent(c.name)}`} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-4xl bg-sand/70 p-4 no-underline transition-colors hover:bg-sand sm:p-5">
                  <div className="absolute inset-x-1 bottom-16 top-1 flex items-center justify-center">
                    <ProductImage src={c.cover?.images?.[0]} alt="" loading="lazy" className="h-full w-full scale-110 object-contain mix-blend-multiply transition-transform duration-700 group-hover:-rotate-3 group-hover:scale-[1.16]" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-sand via-sand/85 to-transparent" aria-hidden="true" />
                  <div className="relative">
                    <h2 className="font-display text-xl leading-tight text-espresso sm:text-2xl">{c.name}</h2>
                    <p className="mt-1 text-[12px] text-muted">{c.count} style{c.count === 1 ? '' : 's'}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
