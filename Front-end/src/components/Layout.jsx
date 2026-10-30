import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { whatsappChatLink } from '../lib/whatsapp'
import { WHATSAPP_DISPLAY } from '../lib/config'
import Logo from './Logo'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/new-arrivals', label: 'New Arrivals' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
]

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const SearchIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
export const HeartIcon = ({ filled, ...p }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p} fill={filled ? 'currentColor' : 'none'}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
)
export const WhatsAppIcon = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2zm5.8 14.07c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.15-4.9-4.34-.14-.19-1.17-1.56-1.17-2.98 0-1.42.74-2.11 1.01-2.4.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.82 2 .89 2.15.08.15.13.32.03.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.3-.13.6.17.29.75 1.24 1.61 2.01 1.11 1 2.04 1.31 2.34 1.46.29.15.47.13.64-.08.18-.2.75-.87.95-1.17.19-.29.39-.24.65-.15.27.1 1.68.79 1.97.94.29.14.48.21.55.33.08.13.08.72-.16 1.4z" /></svg>
)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { toast, wishlist, catalogSource } = useShop()
  const { pathname } = useLocation()

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock page scroll + close on Escape while the mobile drawer is open
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const iconBtn = 'relative flex h-11 w-11 items-center justify-center rounded-full text-espresso transition-colors hover:bg-espresso/5'

  return (
    <>
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory">Skip to content</a>

      <header className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${scrolled || menuOpen ? 'bg-ivory/95 backdrop-blur border-b border-hairline' : 'bg-ivory border-b border-transparent'}`}>
        <div className={`page-pad mx-auto flex max-w-[1500px] items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
          <Link to="/" aria-label="Laceloft home" className="shrink-0"><Logo className="h-7 w-auto md:h-8" /></Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex list-none gap-10">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      `pb-1 text-[13px] font-medium tracking-wide no-underline transition-colors border-b ${isActive ? 'border-olive text-espresso' : 'border-transparent text-espresso/75 hover:text-espresso'}`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <Link to="/search" aria-label="Search" className={iconBtn}><SearchIcon /></Link>
            <Link to="/wishlist" aria-label={`Wishlist (${wishlist.length} saved)`} className={iconBtn}>
              <HeartIcon />
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-olive-deep px-1 text-[9px] font-bold text-white">{wishlist.length}</span>
              )}
            </Link>
            <a
              href={whatsappChatLink("Hi Laceloft, I'd like some help choosing a pair.")}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Laceloft on WhatsApp"
              className="ml-2 hidden items-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ivory no-underline transition-colors hover:bg-olive-deep md:flex"
            >
              <WhatsAppIcon width="15" height="15" /> WhatsApp
            </a>
            <button
              type="button"
              className={`${iconBtn} lg:hidden`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="flex h-4 w-5 flex-col justify-between" aria-hidden="true">
                <span className={`block h-[1.5px] w-full origin-center rounded bg-espresso transition-transform duration-300 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
                <span className={`block h-[1.5px] w-full rounded bg-espresso transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-[1.5px] w-full origin-center rounded bg-espresso transition-transform duration-300 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet drawer */}
      <div
        id="mobile-drawer"
        className={`fixed inset-0 z-[90] bg-ivory pt-[72px] transition-opacity duration-300 lg:hidden ${menuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Mobile" className="page-pad flex h-full flex-col overflow-y-auto pb-10 pt-6">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              tabIndex={menuOpen ? 0 : -1}
              className={({ isActive }) => `border-b border-hairline py-5 font-display text-[32px] leading-none no-underline ${isActive ? 'text-olive-deep' : 'text-espresso'}`}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/search" tabIndex={menuOpen ? 0 : -1} className="border-b border-hairline py-5 font-display text-[32px] leading-none text-espresso no-underline">Search</NavLink>
          <NavLink to="/wishlist" tabIndex={menuOpen ? 0 : -1} className="border-b border-hairline py-5 font-display text-[32px] leading-none text-espresso no-underline">Wishlist</NavLink>
          <a
            href={whatsappChatLink("Hi Laceloft, I'd like some help choosing a pair.")}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={menuOpen ? 0 : -1}
            className="btn-primary mt-8 no-underline"
          >
            <WhatsAppIcon /> Chat on WhatsApp
          </a>
        </nav>
      </div>

      <main id="main" className="min-h-screen pt-[72px]">
        {(catalogSource === 'cached' || catalogSource === 'fallback') && (
          <div role="status" className="border-b border-espresso/10 bg-sand px-5 py-3 text-center text-[12px] leading-relaxed text-espresso">
            Catalogue preview: live prices and stock could not be checked. Please confirm details on WhatsApp before ordering.
          </div>
        )}
        <Outlet />
      </main>

      <footer className="mt-10 rounded-t-5xl bg-espresso text-ivory">
        <div className="page-pad mx-auto max-w-[1500px] pb-8 pt-16">
          <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Logo tone="light" className="mb-5 h-9 w-auto" />
              <p className="max-w-[300px] text-sm leading-relaxed text-ivory/70">
                Premium sneakers, timeless style. Curated for your everyday rotation.
              </p>
            </div>
            <FooterCol title="Shop">
              <FooterLink to="/shop">All sneakers</FooterLink>
              <FooterLink to="/new-arrivals">New arrivals</FooterLink>
              <FooterLink to="/collections">Collections</FooterLink>
              <FooterLink to="/wishlist">Wishlist</FooterLink>
            </FooterCol>
            <FooterCol title="Laceloft">
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
              <FooterLink to="/search">Search</FooterLink>
            </FooterCol>
            <FooterCol title="Enquire">
              <a href={whatsappChatLink()} target="_blank" rel="noopener noreferrer" className="mb-3 block text-sm text-ivory/80 no-underline hover:text-white">WhatsApp</a>
              <span className="block text-sm text-ivory/60">{WHATSAPP_DISPLAY}</span>
            </FooterCol>
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-ivory/15 pt-6 text-xs text-ivory/60 sm:flex-row sm:items-end">
            <span>© {new Date().getFullYear()} Laceloft. All rights reserved.</span>
            <span className="font-display text-2xl leading-none text-ivory sm:text-3xl">Find Your Next Sole.</span>
          </div>
        </div>
      </footer>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[300] flex justify-center px-4">
        {toast && (
          <div className="rounded-full bg-espresso px-6 py-3 text-[13px] font-medium tracking-wide text-ivory shadow-soft">{toast}</div>
        )}
      </div>
    </>
  )
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h5 className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory/50">{title}</h5>
      {children}
    </div>
  )
}
function FooterLink({ to, children }) {
  return <Link to={to} className="mb-3 block text-sm text-ivory/80 no-underline transition-colors hover:text-white">{children}</Link>
}
