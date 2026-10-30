import { createContext, useContext, useEffect, useCallback, useState } from 'react'
import { fetchCatalog, getCatalogSource } from '../lib/api'

const WISH_KEY = 'laceloft_wish'
const LEGACY_WISH_KEY = 'eleven_wish' // migrate wishlists saved before the rebrand

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => readJSON(WISH_KEY, null) ?? readJSON(LEGACY_WISH_KEY, []))
  const [toast, setToast] = useState(null)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [catalogSource, setCatalogSource] = useState('loading')

  // ---- Load catalog once ----
  useEffect(() => {
    let mounted = true
    fetchCatalog().then((data) => {
      if (mounted) { setProducts(data || []); setCatalogSource(getCatalogSource()); setProductsLoading(false) }
    }).catch(() => { if (mounted) { setCatalogSource('unavailable'); setProductsLoading(false) } })
    return () => { mounted = false }
  }, [])

  // ---- Persist wishlist locally (guest-only, no login needed) ----
  useEffect(() => { try { localStorage.setItem(WISH_KEY, JSON.stringify(wishlist)) } catch { /* ignore */ } }, [wishlist])

  const toggleWish = useCallback((sku) => {
    let nowWished = false
    setWishlist((prev) => {
      const has = prev.includes(sku)
      nowWished = !has
      return has ? prev.filter((s) => s !== sku) : [...prev, sku]
    })
    return nowWished
  }, [])

  const isWished = useCallback((sku) => wishlist.includes(sku), [wishlist])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2200)
  }, [])

  const value = {
    products, productsLoading, catalogSource,
    wishlist, toggleWish, isWished,
    toast, showToast,
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  return useContext(ShopContext)
}
