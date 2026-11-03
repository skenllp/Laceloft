import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { getCategories, pickHeroProducts, pickFeatured, photoRank, hasImage, productPath, thumbAt } from '../lib/catalog'
import { fmtPrice } from '../lib/api'
import { whatsappChatLink } from '../lib/whatsapp'
import { HERO_SLIDES, WHATSAPP_DISPLAY } from '../lib/config'
import { usePageMeta } from '../hooks/usePageMeta'
import HeroCarousel from '../components/HeroCarousel'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import ProductCard from '../components/ProductCard'
import ProductSlider from '../components/ProductSlider'
import ProductImage from '../components/ProductImage'
import Reveal from '../components/Reveal'
import { WhatsAppIcon } from '../components/Layout'

function SectionHead({ eyebrow, title, action }) {
  return (
    <Reveal className="mb-10 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <p className="label-eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none text-espresso">{title}</h2>
      </div>
      {action}
    </Reveal>
  )
}

const ArrowLink = ({ to, children }) => (
  <Link to={to} className="hidden shrink-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-espresso no-underline underline-offset-[6px] hover:underline sm:block">
    {children} ↗
  </Link>
)

export default function Home() {
  usePageMeta()
  const { products, productsLoading } = useShop()

  const heroSlides = useMemo(() => pickHeroProducts(products, HERO_SLIDES), [products])
  // Each image slot on the page gets a different product, best photos first:
  // hero, then category tiles, then the New Arrivals tile and featured banner.
  const heroSkus = useMemo(() => new Set(heroSlides.map((p) => p.sku)), [heroSlides])
  const categories = useMemo(() => getCategories(products, heroSkus).slice(0, 4), [products, heroSkus])
  const fresh = useMemo(() => products.filter((p) => p.isNew).slice(0, 8), [products])
  const shownSkus = useMemo(() => new Set([...heroSkus, ...categories.map((c) => c.cover?.sku)]), [heroSkus, categories])
  const newCover = useMemo(
    () => [...fresh].filter((p) => hasImage(p) && !shownSkus.has(p.sku)).sort((a, b) => photoRank(a) - photoRank(b))[0] || fresh.find(hasImage),
    [fresh, shownSkus],
  )
  const featured = useMemo(
    () => pickFeatured(products, new Set([...shownSkus, newCover?.sku])),
    [products, shownSkus, newCover],
  )
  const edit = useMemo(() => {
    const freshSkus = new Set(fresh.map((p) => p.sku))
    const rest = products.filter((p) => !freshSkus.has(p.sku))
    return [...rest.filter((p) => p.onSale), ...rest.filter((p) => !p.onSale)].slice(0, 10)
  }, [products, fresh])

  return (
    <>
      <HeroCarousel key={heroSlides.length} slides={heroSlides} />

      {/* SHOP BY CATEGORY */}
      {!productsLoading && categories.length > 0 && (
        <section className="page-pad mx-auto max-w-[1500px] py-20 md:py-28" aria-labelledby="fit-title">
          <SectionHead eyebrow="Shop by category" title={<span id="fit-title">Find Your Fit.</span>} action={<ArrowLink to="/collections">All collections</ArrowLink>} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
            {[...categories.map((c) => ({ key: c.name, to: `/shop?cat=${encodeURIComponent(c.name)}`, label: c.name, meta: `${c.count} style${c.count === 1 ? '' : 's'}`, cover: c.cover })),
              ...(newCover ? [{ key: 'new', to: '/new-arrivals', label: 'New Arrivals', meta: `${products.filter((p) => p.isNew).length} styles`, cover: newCover }] : [])
            ].map((c, i) => (
              <Reveal key={c.key} delay={i * 60}>
                <Link to={c.to} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-4xl bg-sand/70 p-4 no-underline transition-colors duration-500 hover:bg-sand sm:p-5">
                  <div className="absolute inset-x-1 top-1 bottom-16 flex items-center justify-center">
                    <ProductImage src={thumbAt(c.cover, 0)} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:-rotate-3 group-hover:scale-[1.05]" />
                  </div>
                  {/* Soft fade so the label stays readable over darker photos */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-sand via-sand/85 to-transparent" aria-hidden="true" />
                  <div className="relative flex items-end justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl leading-tight text-espresso sm:text-2xl">{c.label}</h3>
                      <p className="mt-1 text-[12px] text-muted">{c.meta}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso text-ivory transition-colors group-hover:bg-olive-deep" aria-hidden="true">↗</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="fresh-title">
        <SectionHead eyebrow="New arrivals" title={<span id="fresh-title">Fresh in the Loft.</span>} action={<ArrowLink to="/new-arrivals">View all</ArrowLink>} />
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : fresh.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">New pairs are on the way — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {fresh.map((p, i) => <Reveal key={p.sku} delay={(i % 4) * 70}><ProductCard p={p} /></Reveal>)}
          </div>
        )}
        <div className="mt-10 text-center sm:hidden"><Link to="/new-arrivals" className="btn-outline no-underline">View all new arrivals</Link></div>
      </section>

      {/* FEATURED COLLECTION */}
      {featured && (
        <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="more-title">
          <Reveal>
            <div className="relative grid overflow-hidden rounded-[2rem] bg-sand md:rounded-5xl lg:grid-cols-[1fr_1.1fr]">
              <div className="relative z-10 flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                <p className="label-eyebrow mb-5 text-espresso/70">Featured collection</p>
                <h2 id="more-title" className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] text-espresso">More Than<br />Just Sneakers.</h2>
                <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-espresso/75">Discover styles built for your everyday rotation.</p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link to="/shop" className="btn-primary no-underline">Explore the collection <span aria-hidden="true">↗</span></Link>
                </div>
              </div>
              <Link to={productPath(featured.sku)} className="group relative flex min-h-[320px] items-center justify-center p-6 no-underline sm:min-h-[420px] lg:min-h-[520px]" aria-label={`View ${featured.name}`}>
                <div className="absolute bottom-0 left-1/2 h-[88%] w-[72%] -translate-x-1/2 rounded-t-full bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
                <ProductImage src={featured.images[0]} alt={featured.name} loading="lazy" className="feather relative h-full max-h-[480px] w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:-rotate-2 group-hover:scale-[1.04]" />
                <span className="absolute bottom-6 left-6 rounded-full bg-ivory/90 px-4 py-2 text-[12px] font-medium text-espresso lg:left-auto lg:right-8">{featured.name} · {fmtPrice(featured.price)}</span>
              </Link>
            </div>
          </Reveal>
        </section>
      )}

      {/* THE LACELOFT EDIT */}
      {edit.length > 0 && (
        <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="edit-title">
          <SectionHead eyebrow="Selected picks" title={<span id="edit-title">The Laceloft Edit.</span>} action={<ArrowLink to="/shop">Shop all</ArrowLink>} />
          <ProductSlider products={edit} />
        </section>
      )}

      {/* ABOUT */}
      <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="about-title">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="label-eyebrow mb-5">About Laceloft</p>
          <h2 id="about-title" className="font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-none text-espresso">Good Shoes. Great Rotation.</h2>
          <p className="mx-auto mt-7 max-w-xl text-[16px] leading-relaxed text-muted">
            Laceloft is a destination for sneaker enthusiasts and everyday style. Explore our curated footwear collection, discover your next favourite pair, and enquire directly through WhatsApp.
          </p>
          <Link to="/about" className="mt-8 inline-block text-[12px] font-semibold uppercase tracking-[0.16em] text-espresso no-underline underline-offset-[6px] hover:underline">More about us ↗</Link>
        </Reveal>
      </section>

      {/* WHATSAPP CTA */}
      <section className="page-pad mx-auto max-w-[1500px] pb-8" aria-labelledby="wa-title">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-16 text-center text-ivory sm:px-12 md:rounded-5xl md:py-24">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-olive/25" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-tan/15" aria-hidden="true" />
            <div className="relative">
              <h2 id="wa-title" className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-none">Found Your Pair?</h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ivory/75">Questions about sizing or availability? Connect with Laceloft directly.</p>
              <a
                href={whatsappChatLink("Hi Laceloft, I have a question about a pair.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-olive-deep px-9 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-white no-underline transition-colors hover:bg-ivory hover:text-espresso"
              >
                <WhatsAppIcon /> Chat on WhatsApp <span aria-hidden="true">↗</span>
              </a>
              <p className="mt-4 text-xs text-ivory/50">{WHATSAPP_DISPLAY}</p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
