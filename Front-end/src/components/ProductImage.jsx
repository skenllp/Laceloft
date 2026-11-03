import { useEffect, useState } from 'react'

/* Original line-art sneaker used whenever a product has no image (or the
   image fails to load). Not a copy of any brand's design. */
export function SneakerPlaceholder({ className = '' }) {
  return (
    <svg viewBox="0 0 400 240" className={className} fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="205" cy="214" rx="150" ry="9" fill="rgb(var(--c-espresso))" opacity="0.08" />
      <path d="M30 168c0-14 10-22 26-26 30-8 54-26 70-52 5-8 14-11 22-6 16 10 34 8 50-2 8-5 17-2 21 6 12 24 38 40 74 48 40 9 62 18 62 38 0 16-10 26-28 26H62c-20 0-32-12-32-32z" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-espresso))" strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 184h340" stroke="rgb(var(--c-espresso))" strokeWidth="3" />
      <path d="M30 184v8c0 12 10 22 28 22h284c18 0 28-8 28-22v-8" fill="rgb(var(--c-sand))" stroke="rgb(var(--c-espresso))" strokeWidth="3" strokeLinejoin="round" />
      <path d="M150 90c14 22 42 40 78 50" stroke="rgb(var(--c-olive))" strokeWidth="3" strokeLinecap="round" />
      <path d="M168 100l12-10M186 112l12-10M204 122l12-10" stroke="rgb(var(--c-espresso))" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 150c16-4 30-12 42-24" stroke="#B58D6C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** <img> that swaps to the placeholder when src is empty or errors.
 *  `frame` (width / height of the box it sits in) turns on auto-fit: a
 *  photo within ~6% of that shape fills the box (object-cover, trimming at
 *  most ~3% per side). Any other shape is shown whole (object-contain) over
 *  a blurred, enlarged copy of itself, so no empty bands appear above/below
 *  or beside it. The parent must be `relative`/`absolute` and clip overflow.
 *  The copy is 3rem larger than the frame on every side: blurring fades a
 *  layer's own edges to transparent, and that fade must fall outside it. */
export default function ProductImage({ src, alt, className = '', placeholderClass = '', frame, onLoad, style, ...rest }) {
  const [failed, setFailed] = useState(false)
  const [cover, setCover] = useState(false)
  const [feather, setFeather] = useState(null) // soft edge where the photo meets the backdrop
  useEffect(() => { setFailed(false); setCover(false); setFeather(null) }, [src])
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center ${className}`} role="img" aria-label={alt}>
        <SneakerPlaceholder className={`w-4/5 h-auto opacity-90 ${placeholderClass}`} />
      </div>
    )
  }
  const handleLoad = (e) => {
    if (frame) {
      const { naturalWidth: w, naturalHeight: h } = e.currentTarget
      if (w && h) {
        const r = w / h
        const fills = Math.abs(r - frame) / frame <= 0.06
        setCover(fills)
        if (fills) setFeather(null)
        else {
          // object-contain leaves empty space either above/below (wide photo)
          // or beside (tall photo); `edge` is where the photo starts, in % of
          // that axis, and the mask fades its outer 4% into the backdrop.
          const vertical = r > frame
          const edge = ((1 - (vertical ? frame / r : r / frame)) / 2) * 100
          const dir = vertical ? 'to bottom' : 'to right'
          const m = `linear-gradient(${dir}, transparent ${edge}%, #000 ${edge + 4}%, #000 ${100 - edge - 4}%, transparent ${100 - edge}%)`
          setFeather({ maskImage: m, WebkitMaskImage: m })
        }
      }
    }
    onLoad?.(e)
  }
  const fit = frame ? (cover ? 'object-cover' : 'object-contain relative') : ''
  return (
    <>
      {frame && !cover && (
        <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="pointer-events-none absolute -inset-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)] max-w-none object-cover blur-lg" />
      )}
      <img src={src} alt={alt} onError={() => setFailed(true)} onLoad={handleLoad} style={{ ...feather, ...style }} className={`${className} ${fit}`} {...rest} />
    </>
  )
}
