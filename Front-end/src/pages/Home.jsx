import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { CATEGORY_GROUPS, byNewest, pickHeroProducts, photoRank, hasImage, thumbAt } from '../lib/catalog'
import { whatsappChatLink } from '../lib/whatsapp'
import { ABOUT_TEXT, HERO_SLIDES, WHATSAPP_DISPLAY } from '../lib/config'
import { usePageMeta } from '../hooks/usePageMeta'
import HeroCarousel from '../components/HeroCarousel'
import ProductGridSkeleton from '../components/ProductGridSkeleton'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import EditorialPhotos from '../components/EditorialPhotos'
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
    {children}
  </Link>
)

export default function Home() {
  usePageMeta()
  const { products, productsLoading } = useShop()

  const heroSlides = useMemo(() => pickHeroProducts(products, HERO_SLIDES), [products])
  // Each image slot on the page gets a different product, best photos first.
  const heroSkus = useMemo(() => new Set(heroSlides.map((p) => p.sku)), [heroSlides])
  // Three storefront categories; each cover is the best-photographed pair in
  // the group, avoiding the hero pairs and each other where possible.
  const categories = useMemo(() => {
    const used = new Set(heroSkus)
    return Object.values(CATEGORY_GROUPS).map((g) => {
      const ranked = products.filter((p) => g.test(p) && hasImage(p)).sort((x, y) => photoRank(x) - photoRank(y))
      const cover = ranked.find((p) => !used.has(p.sku)) || ranked[0]
      if (cover) used.add(cover.sku)
      return { ...g, cover }
    }).filter((g) => g.cover)
  }, [products, heroSkus])
  const fresh = useMemo(
    () => products.filter((p) => p.isNew).sort(byNewest).slice(0, 8),
    [products],
  )

  return (
    <>
      <HeroCarousel key={heroSlides.length} slides={heroSlides} />

      {/* SHOP BY CATEGORY */}
      {!productsLoading && categories.length > 0 && (
        <section className="page-pad mx-auto max-w-[1500px] py-20 md:py-28" aria-labelledby="fit-title">
          <SectionHead eyebrow="Find your style" title={<span id="fit-title">Every Step, Your Way.</span>} action={<ArrowLink to="/collections">All collections</ArrowLink>} />
          <div className={`grid grid-cols-1 gap-3 sm:gap-5 ${categories.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={i * 60}>
                <Link to={`/shop?group=${c.id}`} className="on-dark group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-4xl bg-sand/70 p-5 no-underline transition-colors duration-500 hover:bg-sand sm:p-6">
                  <div className="absolute inset-0 overflow-hidden">
                    <ProductImage src={thumbAt(c.cover, 0)} alt="" loading="lazy" frame={0.8} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-espresso/90 via-espresso/40 to-transparent" aria-hidden="true" />
                  <div className="relative flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl leading-tight text-ivory">{c.label}</h3>
                      <p className="mt-1 text-[13px] leading-snug text-ivory/80">{c.blurb}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="fresh-title">
        <SectionHead eyebrow="Just landed" title={<span id="fresh-title">Fresh in the Loft.</span>} action={<ArrowLink to="/new-arrivals">See all new arrivals</ArrowLink>} />
        <Reveal><p className="-mt-4 mb-10 max-w-xl text-[15px] leading-relaxed text-muted">The newest pairs to join Laceloft, from fresh sneakers to everyday staples.</p></Reveal>
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : fresh.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">New pairs are on the way — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {fresh.map((p, i) => <Reveal key={p.sku} delay={(i % 4) * 70}><ProductCard p={p} /></Reveal>)}
          </div>
        )}
        <div className="mt-10 text-center sm:hidden"><Link to="/new-arrivals" className="btn-outline no-underline">See all new arrivals</Link></div>
      </section>

      {/* ABOUT */}
      <section className="page-pad mx-auto max-w-[1500px] pb-20 md:pb-28" aria-labelledby="about-title">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <Reveal>
          <p className="label-eyebrow mb-5">Our story</p>
          <h2 id="about-title" className="font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-none text-espresso [text-wrap:balance]">Good Shoes. Great Rotation.</h2>
          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-muted">{ABOUT_TEXT}</p>
          <Link to="/about" className="mt-8 inline-block text-[12px] font-semibold uppercase tracking-[0.16em] text-espresso no-underline underline-offset-[6px] hover:underline">Read our story</Link>
        </Reveal>
        <Reveal><EditorialPhotos products={products} /></Reveal>
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="page-pad mx-auto max-w-[1500px] pb-8" aria-labelledby="wa-title">
        <Reveal>
          <div className="relative overflow-hidden on-dark rounded-[2rem] bg-espresso px-6 py-16 text-center text-ivory sm:px-12 md:rounded-5xl md:py-24">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-olive/25" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-tan/15" aria-hidden="true" />
            <div className="relative">
              <h2 id="wa-title" className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-none">Found Your Pair?</h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ivory/75">Not sure about size, colour or availability? Message us and we will help you choose.</p>
              <a
                href={whatsappChatLink("Hi Laceloft, I have a question about a pair.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-olive-deep px-9 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ivory no-underline transition-colors hover:bg-ivory hover:text-espresso"
              >
                <WhatsAppIcon /> Enquire on WhatsApp
              </a>
              <p className="mt-4 text-xs text-ivory/50">{WHATSAPP_DISPLAY}</p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
