import { Link } from 'react-router-dom'

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-muted">
      {items.map((it, i) => (
        <span key={i}>
          {it.to ? <Link to={it.to} className="text-muted no-underline hover:text-espresso">{it.label}</Link> : <span className="text-espresso">{it.label}</span>}
          {i < items.length - 1 && <span className="mx-2" aria-hidden="true">/</span>}
        </span>
      ))}
    </nav>
  )
}

export default function PageHeader({ eyebrow, title, children, crumbs }) {
  return (
    <header className="page-pad mx-auto max-w-[1500px] pb-8 pt-8 md:pt-12">
      {crumbs && <Breadcrumbs items={crumbs} />}
      {eyebrow && <p className="label-eyebrow mb-3">{eyebrow}</p>}
      <h1 className="font-display text-[clamp(2.6rem,7vw,5rem)] leading-none text-espresso">{title}</h1>
      {children && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">{children}</p>}
    </header>
  )
}
