/* Original Laceloft wordmark: lowercase serif "laceloft" + olive full stop.
   `tone="dark"` → espresso on ivory, `tone="light"` → ivory on dark. */
export default function Logo({ tone = 'dark', className = 'h-7 w-auto' }) {
  const ink = tone === 'dark' ? 'rgb(var(--c-espresso))' : 'rgb(var(--c-ivory))'
  return (
    <svg viewBox="0 0 168 40" className={className} role="img" aria-label="Laceloft" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="29" fill={ink} fontFamily="'DM Serif Display', Georgia, serif" fontSize="34" letterSpacing="-0.5" textLength="150" lengthAdjust="spacingAndGlyphs">laceloft</text>
      <circle cx="160" cy="26.5" r="3.6" fill="rgb(var(--c-olive))" />
    </svg>
  )
}
