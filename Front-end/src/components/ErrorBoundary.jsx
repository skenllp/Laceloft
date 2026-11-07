import { Component } from 'react'

/** Shows a way back instead of a blank page if a page crashes while rendering. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Laceloft: page failed to render.', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page-pad mx-auto max-w-xl py-24 text-center">
        <h1 className="mb-3 font-display text-4xl">This page didn't load.</h1>
        <p className="mb-8 text-muted">Go back to the shop and try again.</p>
        <a href="/shop" className="btn-primary no-underline">Back to the shop</a>
      </div>
    )
  }
}
