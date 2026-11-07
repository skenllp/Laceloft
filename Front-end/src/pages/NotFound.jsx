import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { SneakerPlaceholder } from '../components/ProductImage'

export default function NotFound() {
  usePageMeta('Page not found', undefined, { noindex: true })
  return (
    <div className="page-pad mx-auto max-w-xl py-24 text-center">
      <SneakerPlaceholder className="mx-auto mb-8 w-56 opacity-80" />
      <h1 className="mb-3 font-display text-6xl">404</h1>
      <p className="mb-8 text-muted">That page has walked off — let's get you back to the loft.</p>
      <Link to="/" className="btn-primary no-underline">Back to home</Link>
    </div>
  )
}
