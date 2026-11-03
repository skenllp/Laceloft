import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { fmtPrice } from '../lib/api'
import { HERO_ASSETS, HERO_THUMBS } from '../data/heroAssets'
import { brandLabel, productPath, thumbAt } from '../lib/catalog'
import ProductImage, { SneakerPlaceholder } from './ProductImage'

const AUTOPLAY_SECONDS = 4
// Subtle hero background shades, all drawn from the Laceloft palette family.
const TINTS = ['#DDD3C4', '#D5D8C8', '#E2D2BF', '#D9D1C9', '#DCD6C0', '#D3CCBD']
const DARK_TINTS = ['#141414', '#131513', '#151312', '#141313', '#141412', '#121212']
const tints = () => (document.documentElement.classList.contains('dark') ? DARK_TINTS : TINTS)
const pad = (n) => String(n).padStart(2, '0')

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Chevron({ dir }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

export default function HeroCarousel({ slides }) {
  const n = slides.length
  const [active, setActive] = useState(0) // drives thumbnails + counter immediately
  const [shown, setShown] = useState(0)   // drives the info copy (swapped mid-transition)

  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const stageRef = useRef(null)
  const floatRef = useRef(null)
  const infoRef = useRef(null)
  const idxRef = useRef(0)
  const tlRef = useRef(null)
  const timerRef = useRef(null)
  const pauseReasons = useRef(new Set())
  const swipe = useRef(null)
  const apiRef = useRef({})

  /* ---------- autoplay timer (restarts after every transition) ---------- */
  const startTimer = useCallback(() => {
    timerRef.current?.kill()
    if (n < 2 || prefersReducedMotion() || pauseReasons.current.size > 0) return
    timerRef.current = gsap.delayedCall(AUTOPLAY_SECONDS, () => apiRef.current.goTo?.(idxRef.current + 1, 1))
  }, [n])

  const pause = useCallback((reason) => {
    pauseReasons.current.add(reason)
    timerRef.current?.kill()
  }, [])
  const resume = useCallback((reason) => {
    pauseReasons.current.delete(reason)
    if (!tlRef.current?.isActive()) startTimer()
  }, [startTimer])

  /* ---------- transition ---------- */
  const goTo = useCallback((target, dir = 1) => {
    if (n < 2) return
    const next = ((target % n) + n) % n
    const from = idxRef.current
    if (next === from) return

    // Never fight a running transition: snap it to its end state first.
    if (tlRef.current) { tlRef.current.progress(1).kill() }
    timerRef.current?.kill()

    idxRef.current = next
    setActive(next)

    const shoes = stageRef.current.querySelectorAll('[data-shoe]')
    const info = infoRef.current ? infoRef.current.querySelectorAll('[data-info]') : []
    const reduce = prefersReducedMotion()
    const d = reduce ? 0.01 : 1

    const tl = gsap.timeline({ onComplete: startTimer })
    tl.to(shoes[from], { xPercent: -dir * 32, rotate: -dir * 7, scale: 0.88, autoAlpha: 0, duration: 0.7 * d, ease: 'power3.in' }, 0)
      .fromTo(shoes[next],
        { xPercent: dir * 32, rotate: dir * 7, scale: 0.88, autoAlpha: 0 },
        { xPercent: 0, rotate: 0, scale: 1, autoAlpha: 1, duration: 1.0 * d, ease: 'power3.out' },
        0.3 * d)
      .to(panelRef.current, { backgroundColor: tints()[next % TINTS.length], duration: 0.8 * d, ease: 'power1.inOut' }, 0)
      .to(info, { autoAlpha: 0, y: -8, duration: 0.25 * d, ease: 'power1.in' }, 0)
      .call(() => setShown(next), null, 0.28 * d)
      .fromTo(info, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 * d, stagger: 0.06 * d, ease: 'power2.out' }, 0.32 * d)
    tlRef.current = tl
  }, [n, startTimer])

  apiRef.current.goTo = goTo
  const next = () => goTo(idxRef.current + 1, 1)
  const prev = () => goTo(idxRef.current - 1, -1)

  /* Re-tint the panel at once when the visitor switches theme. */
  useEffect(() => {
    const mo = new MutationObserver(() => {
      if (panelRef.current) gsap.set(panelRef.current, { backgroundColor: tints()[idxRef.current % TINTS.length] })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  /* ---------- mount: initial state, ambient motion, listeners ---------- */
  useLayoutEffect(() => {
    if (!n) return undefined
    const reduce = prefersReducedMotion()
    const ctx = gsap.context(() => {
      gsap.set('[data-shoe]', { autoAlpha: 0 })
      gsap.set('[data-shoe="0"]', { autoAlpha: 1 })
      gsap.set(panelRef.current, { backgroundColor: tints()[0] })

      if (!reduce) {
        gsap.from('[data-intro]', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity,visibility' })
        gsap.from(floatRef.current, { y: 30, autoAlpha: 0, duration: 1.1, ease: 'power3.out' })
        // Gentle float for the shoe + a matching breathing shadow
        gsap.to(floatRef.current, { y: -10, rotate: 0.8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.1 })
        gsap.to('[data-shadow]', { scaleX: 0.9, opacity: 0.7, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.1 })
        // Very slow background drift
        gsap.utils.toArray('[data-sphere]').forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 12 : -12, x: i % 2 ? -8 : 8, duration: 3.4 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        })
        gsap.to('[data-arch]', { scale: 1.02, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 100%' })
      }
    }, rootRef)

    // Pause autoplay when tab hidden or hero scrolled out of view
    const onVis = () => (document.hidden ? pause('hidden') : resume('hidden'))
    document.addEventListener('visibilitychange', onVis)
    let io
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => (e.isIntersecting ? resume('offscreen') : pause('offscreen')), { threshold: 0.25 })
      io.observe(rootRef.current)
    }
    startTimer()

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      io?.disconnect()
      timerRef.current?.kill()
      tlRef.current?.kill()
      ctx.revert()
    }
  }, [n, pause, resume, startTimer])

  /* ---------- interactions ---------- */
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  }
  const onPointerDown = (e) => { swipe.current = { x: e.clientX, y: e.clientY }; pause('drag') }
  const onPointerUp = (e) => {
    const s = swipe.current
    swipe.current = null
    resume('drag')
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)()
  }

  const cur = slides[shown] || slides[0]
  const curIdx = slides[shown] ? shown : 0
  const pct = n ? ((active + 1) / n) * 100 : 0

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured sneakers"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') pause('hover') }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') resume('hover') }}
      onFocus={(e) => { if (e.target.matches?.(':focus-visible')) pause('focus') }}
      onBlur={() => resume('focus')}
      onKeyDown={onKeyDown}
      className="page-pad mx-auto max-w-[1600px] pb-4 pt-3 md:pt-4"
    >
      <div
        ref={panelRef}
        tabIndex={0}
        aria-label="Sneaker showcase. Use left and right arrow keys to change sneaker."
        className="relative flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-sand p-6 outline-none focus-visible:ring-2 focus-visible:ring-olive sm:p-8 md:rounded-5xl lg:grid lg:min-h-[690px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-rows-[1fr_auto] lg:gap-x-4 lg:gap-y-6 lg:p-12"
      >
        {/* LEFT: eyebrow, headline, copy, CTA, progress */}
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-between lg:self-stretch lg:pt-4">
          <div className="order-1 lg:order-none">
            <p data-intro className="label-eyebrow mb-4 text-espresso/70">The Laceloft Edit</p>
            <h1 data-intro className="font-display text-[clamp(3rem,9vw,4.5rem)] leading-[0.95] text-espresso lg:text-[clamp(3.2rem,4.5vw,5.6rem)]">
              Find Your<br />Next Sole.
            </h1>
            <p data-intro className="mt-6 hidden max-w-[300px] text-[15px] leading-relaxed text-espresso/75 lg:block">
              Discover sneakers, boots and everyday footwear that complement your style. Find the pair that feels like you.
            </p>
          </div>

          <div className="order-4 lg:order-none">
            <div data-intro className="flex flex-col gap-3 sm:flex-row">
              <Link to="/shop" className="btn-primary w-full whitespace-nowrap no-underline sm:w-auto">
                Explore Footwear <span aria-hidden="true">↗</span>
              </Link>
              {cur && (
                <Link to={productPath(cur.sku)} className="btn-outline w-full whitespace-nowrap no-underline sm:w-auto">
                  View This Pair
                </Link>
              )}
            </div>
            {n > 0 && (
              <div data-intro className="mt-8 hidden items-center gap-4 text-[12px] font-semibold tracking-[0.2em] text-espresso lg:flex" aria-hidden="true">
                <span>{pad(active + 1)}</span>
                <span className="relative h-px w-28 bg-espresso/25">
                  <span className="absolute inset-y-0 left-0 h-[2px] -translate-y-px bg-olive-deep transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-espresso/50">{pad(n)}</span>
              </div>
            )}
          </div>
        </div>

        {/* CENTRE: stage */}
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipe.current = null; resume('drag') }}
          style={{ touchAction: 'pan-y' }}
          className="relative order-2 aspect-[6/5] w-full select-none sm:aspect-[16/11] lg:col-start-2 lg:row-start-1 lg:aspect-auto lg:min-h-[470px]"
        >
          {/* arch + spheres + platform */}
          <div data-arch className="absolute bottom-[4%] left-1/2 h-[92%] w-[66%] -translate-x-1/2 rounded-t-full bg-gradient-to-b from-white/60 via-white/25 to-transparent dark:from-olive/25 dark:via-olive/10 lg:w-[62%]" aria-hidden="true" />
          <div data-sphere className="absolute left-[8%] top-[14%] h-[13%] w-[13%] rounded-full bg-gradient-to-br from-olive to-olive-deep opacity-90 dark:opacity-80 dark:shadow-[0_0_46px_8px_rgba(212,165,116,0.32)]" aria-hidden="true" />
          <div data-sphere className="absolute bottom-[26%] right-[7%] h-[9%] w-[9%] rounded-full bg-gradient-to-br from-tan to-[#9a7556] dark:shadow-[0_0_34px_6px_rgba(201,150,98,0.28)]" aria-hidden="true" />
          <div data-sphere className="absolute right-[14%] top-[10%] h-[6%] w-[6%] rounded-full bg-white/80 dark:bg-olive/10 dark:ring-2 dark:ring-olive/70 dark:shadow-[0_0_22px_2px_rgba(212,165,116,0.35)]" aria-hidden="true" />
          <div className="absolute bottom-[7%] left-1/2 h-[7%] w-[58%] -translate-x-1/2 rounded-[50%] bg-white/45 dark:bg-white/10" aria-hidden="true" />
          <div data-shadow className="absolute bottom-[8.5%] left-1/2 h-[4%] w-[44%] -translate-x-1/2 rounded-[50%] bg-espresso/20 blur-md dark:bg-black/60" aria-hidden="true" />

          {/* floating sneaker(s) */}
          <div ref={floatRef} className="absolute inset-x-[-2%] bottom-[11%] top-[6%] sm:inset-x-[0%]">
            {n === 0 && (
              <div className="flex h-full items-center justify-center"><SneakerPlaceholder className="w-3/4 animate-pulse opacity-60" /></div>
            )}
            {slides.map((p, i) => {
              const hero = HERO_ASSETS[p.sku]
              const src = hero || (p.images && p.images[0]) || ''
              return (
                <div key={p.sku} data-shoe={i} className="absolute inset-0 flex items-center justify-center" aria-hidden={i !== active}>
                  <ProductImage
                    src={src}
                    alt={i === active ? p.name : ''}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchpriority={i === 0 ? 'high' : 'auto'}
                    decoding="async"
                    draggable={false}
                    className={`h-full w-full object-contain ${hero ? 'drop-shadow-[0_24px_24px_rgba(48,42,37,0.22)]' : 'feather mix-blend-multiply'}`}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: product info + arrows */}
        <div className="contents lg:col-start-3 lg:row-start-1 lg:flex lg:flex-col lg:justify-between lg:self-stretch lg:pt-4">
          <div ref={infoRef} className="order-3 lg:text-right" aria-live="polite">
            {cur && (
              <>
                <p data-info className="label-eyebrow mb-3 text-espresso/70">{(cur.cats && cur.cats[0]) || brandLabel(cur.brand) || 'Featured'}</p>
                <h2 data-info className="font-display text-[clamp(1.7rem,4.4vw,2.2rem)] leading-tight text-espresso lg:ml-auto lg:max-w-[300px] lg:text-[clamp(1.9rem,2.6vw,2.7rem)]">{cur.name}</h2>
                <p data-info className="mt-3 flex items-baseline gap-3 text-espresso lg:justify-end">
                  <span className="text-xl font-semibold">{fmtPrice(cur.price)}</span>
                  {cur.strike > cur.price && <span className="text-sm text-espresso/55 line-through">{fmtPrice(cur.strike)}</span>}
                </p>
                {cur.colorway && <p data-info className="mt-2 text-sm text-espresso/70 lg:ml-auto lg:max-w-[280px]">{cur.colorway}</p>}
              </>
            )}
          </div>

          {n > 1 && (
            <div className="order-5 flex items-center gap-3 lg:justify-end">
              <button type="button" onClick={prev} aria-label="Previous sneaker" className="flex h-12 w-12 items-center justify-center rounded-full border border-espresso/25 bg-ivory/40 text-espresso transition-colors hover:bg-espresso hover:text-ivory"><Chevron dir="left" /></button>
              <button type="button" onClick={next} aria-label="Next sneaker" className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso text-ivory transition-colors hover:bg-olive-deep"><Chevron dir="right" /></button>
              <span className="ml-auto text-[12px] font-semibold tracking-[0.2em] text-espresso lg:hidden" aria-hidden="true">{pad(active + 1)} / {pad(n)}</span>
            </div>
          )}
        </div>

        {/* THUMBNAILS */}
        {n > 0 && (
          <div className="order-6 grid grid-cols-4 gap-2 sm:gap-3 lg:col-span-3 lg:row-start-2 lg:mx-auto lg:w-full lg:max-w-[820px]" role="group" aria-label="Choose sneaker">
            {slides.map((p, i) => {
              const sel = i === active
              return (
                <button
                  key={p.sku}
                  type="button"
                  onClick={() => { goTo(i, i > idxRef.current ? 1 : -1) }}
                  aria-label={`Show ${p.name}`}
                  aria-current={sel ? 'true' : undefined}
                  className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/55 dark:bg-white/10 p-1.5 transition-all duration-300 sm:rounded-3xl sm:p-2 ${sel ? 'outline outline-2 outline-offset-0 outline-olive bg-white/80 dark:bg-white/20' : 'outline-0 hover:bg-white/75 dark:hover:bg-white/15'}`}
                >
                  <ProductImage
                    src={HERO_THUMBS[p.sku] || thumbAt(p, 0)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={`h-full w-full object-contain ${HERO_THUMBS[p.sku] ? 'drop-shadow-[0_5px_6px_rgba(48,42,37,0.2)]' : 'mix-blend-multiply'}`}
                    placeholderClass="w-[90%]"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
