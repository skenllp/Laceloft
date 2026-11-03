import { useEffect, useState } from 'react'

const KEY = 'laceloft-theme'
const COLORS = { light: '#F4F0E8', dark: '#1A1613' }

const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

/** 'dark' | 'light': the visitor's saved choice, else the phone/PC setting. */
export const currentTheme = () => {
  const s = stored()
  return s === 'dark' || s === 'light' ? s : systemDark() ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => {
    applyTheme(theme)
    // Follow the device setting until the visitor picks one themselves.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => { if (!stored()) setTheme(mq.matches ? 'dark' : 'light') }
    mq?.addEventListener?.('change', onChange)
    return () => mq?.removeEventListener?.('change', onChange)
  }, [theme])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* private mode: still works for this visit */ }
    setTheme(next)
  }
  return [theme, toggle]
}
