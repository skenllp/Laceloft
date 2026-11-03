import { useEffect, useState } from 'react'

/** Placeholder cards shown while the catalogue loads. The API runs on a
    free host that sleeps when idle, so after a few seconds we say why the
    wait is longer than usual instead of leaving shoppers guessing. */
export default function ProductGridSkeleton({ count = 8, className = 'grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4' }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(id)
  }, [])

  return (
    <div aria-busy="true" aria-label="Loading sneakers">
      {slow && (
        <p className="mb-8 text-center text-[13px] text-muted" role="status">
          Opening the loft — the first visit can take up to a minute.
        </p>
      )}
      <div className={`${className} animate-pulse`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] rounded-4xl bg-sand/60" />
            <div className="mt-4 space-y-2.5 px-1">
              <div className="h-2.5 w-16 rounded-full bg-sand/80" />
              <div className="h-4 w-4/5 rounded-full bg-sand/80" />
              <div className="h-3.5 w-14 rounded-full bg-sand/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
