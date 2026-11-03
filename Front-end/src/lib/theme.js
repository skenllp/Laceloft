import { useEffect, useState } from 'react'

const KEY = 'laceloft-theme'
const COLORS = { light: '#F4F0E8', dark: '#000000' }

const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }
/** Dark unless the visitor chose light with the header button. */
export const currentTheme = () => (stored() === 'light' ? 'light' : 'dark')

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(currentTheme)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* private mode: still works for this visit */ }
    setTheme(next)
  }
  return [theme, toggle]
}
