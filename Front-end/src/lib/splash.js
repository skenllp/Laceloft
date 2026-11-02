/* Hides the splash loader defined in index.html. Kept on screen for at
   least MIN_MS (so it reads as a deliberate intro, not a flicker) and never
   longer than MAX_MS — after that the skeleton cards take over, since a
   sleeping backend can take most of a minute to answer. */

const MIN_MS = 700
const MAX_MS = 3000

let hidden = false

export function hideSplash() {
  if (hidden) return
  hidden = true
  const el = document.getElementById('splash')
  if (!el) return
  const wait = Math.max(0, MIN_MS - performance.now())
  setTimeout(() => {
    el.classList.add('is-done')
    setTimeout(() => el.remove(), 600)
  }, wait)
}

export function scheduleSplashTimeout() {
  setTimeout(hideSplash, MAX_MS)
}
