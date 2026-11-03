import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MAX_SCALE = 4
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/* Full-screen photo viewer: swipe or arrows to change photo, pinch / wheel /
   double-tap to zoom, drag to pan when zoomed, Esc or the X to close. */
export default function Lightbox({ images, index, onIndex, onClose, alt }) {
  const n = images.length
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const stage = useRef(null)
  const pts = useRef(new Map())
  const pinch = useRef(null)
  const drag = useRef(null)
  const swipe = useRef(null)
  const lastTap = useRef(0)
  const closeBtn = useRef(null)

  const go = useCallback((d) => onIndex((index + d + n) % n), [index, n, onIndex])
  useEffect(() => { setT({ s: 1, x: 0, y: 0 }) }, [index])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (t.s === 1 && n > 1 && e.key === 'ArrowRight') go(1)
      else if (t.s === 1 && n > 1 && e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, n, onClose, t.s])

  // Keeps the photo from being dragged completely out of view.
  const limit = (s, x, y) => {
    const r = stage.current?.getBoundingClientRect()
    if (!r || s <= 1) return { s: 1, x: 0, y: 0 }
    const mx = (r.width * (s - 1)) / 2
    const my = (r.height * (s - 1)) / 2
    return { s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) }
  }
  const dist = () => { const [a, b] = [...pts.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }

  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setBusy(true)
    if (pts.current.size === 2) {
      pinch.current = { d: dist(), s: t.s }
      drag.current = null; swipe.current = null
    } else if (t.s > 1) {
      drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y }
    } else {
      swipe.current = { x: e.clientX, y: e.clientY }
    }
  }
  const onMove = (e) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2 && pinch.current) {
      setT((c) => limit(clamp((pinch.current.s * dist()) / pinch.current.d, 1, MAX_SCALE), c.x, c.y))
    } else if (drag.current) {
      const d = drag.current
      setT((c) => limit(c.s, d.tx + e.clientX - d.x, d.ty + e.clientY - d.y))
    }
  }
  const onUp = (e) => {
    const sw = swipe.current
    pts.current.delete(e.pointerId)
    if (pts.current.size < 2) pinch.current = null
    if (pts.current.size === 0) { setBusy(false); drag.current = null; swipe.current = null }
    if (!sw) return
    const dx = e.clientX - sw.x
    const dy = e.clientY - sw.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && n > 1) {
      go(dx < 0 ? 1 : -1)
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      const now = Date.now()
      if (now - lastTap.current < 320) { setT((c) => (c.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })); lastTap.current = 0 } else lastTap.current = now
    }
  }
  const onWheel = (e) => setT((c) => limit(clamp(c.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, MAX_SCALE), c.x, c.y))

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${alt} photos`} className="fixed inset-0 z-[400] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[12px] font-semibold tracking-[0.16em]">{index + 1} / {n}</span>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close photos" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20">✕</button>
      </div>
      <div
        ref={stage}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        style={{ touchAction: 'none' }}
        className={`relative min-h-0 flex-1 select-none overflow-hidden ${t.s > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
      >
        <img
          key={index}
          src={images[index]}
          alt={`${alt}, photo ${index + 1}`}
          draggable={false}
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: busy ? 'none' : 'transform .25s ease' }}
          className="img-ready absolute inset-0 h-full w-full object-contain"
        />
        {n > 1 && t.s === 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} onPointerDown={(e) => e.stopPropagation()} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20 sm:flex">←</button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20 sm:flex">→</button>
          </>
        )}
      </div>
      <p className="px-4 py-3 text-center text-[12px] text-white/60">Pinch or double-tap to zoom · swipe to change photo</p>
    </div>,
    document.body,
  )
}
