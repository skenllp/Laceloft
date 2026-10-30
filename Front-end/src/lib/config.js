/* ===== Laceloft — central configuration =====
   One place to point the whole app at your backend and set brand contact
   details. Vite exposes env vars prefixed with VITE_ via import.meta.env. */

export const BRAND_NAME = 'Laceloft'
export const TAGLINE = 'Find Your Next Sole.'

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://eleven-with-backend.onrender.com/api'
// NOTE: the default above is the existing deployed Django API host. Change it
// with VITE_API_BASE when the backend is moved/renamed for Laceloft.
// For local dev: VITE_API_BASE=http://127.0.0.1:8000/api

// Official Laceloft WhatsApp number — digits only, country code, no "+".
// This is the ONLY place the number lives; every WhatsApp link reads it.
export const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || '971564345294'
export const WHATSAPP_DISPLAY = '+971 56 434 5294'

// Public site origin, used for canonical/shareable links.
export const SITE_URL =
  import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

// How many products the animated home hero cycles through (4–6).
export const HERO_SLIDES = 4
