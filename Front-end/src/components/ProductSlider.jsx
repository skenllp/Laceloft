import { useRef, useState, useEffect, useCallback } from 'react'
import ProductCard from './ProductCard'

export default function ProductSlider({ products }) {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [products, updateArrows])

  const scrollByCard = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-slide]')
    const step = card ? card.offsetWidth + 20 : 260
    el.scrollBy({ left: dir * step * 2, behavior: 'smooth' })
  }

  if (!products.length) return null

  const arrow = 'hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-ivory text-espresso transition-colors hover:bg-espresso hover:text-ivory disabled:opacity-30 disabled:hover:bg-ivory disabled:hover:text-espresso'

  return (
    <div>
      <div
        ref={trackRef}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
      >
        {products.map((p) => (
          <div key={p.sku} data-slide className="w-[68vw] min-w-[230px] max-w-[300px] shrink-0 snap-start sm:w-[280px]">
            <ProductCard p={p} />
          </div>
        ))}
      </div>
      <div className="mt-4 hidden justify-end gap-3 md:flex">
        <button type="button" aria-label="Previous products" disabled={!canPrev} onClick={() => scrollByCard(-1)} className={arrow}>←</button>
        <button type="button" aria-label="Next products" disabled={!canNext} onClick={() => scrollByCard(1)} className={arrow}>→</button>
      </div>
    </div>
  )
}
