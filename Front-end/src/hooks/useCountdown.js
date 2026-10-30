import { useEffect, useState } from 'react'

/** Ticking countdown to a fixed target Date (or timestamp in ms). */
export function useCountdown(target) {
  const targetMs = target instanceof Date ? target.getTime() : target
  const [left, setLeft] = useState(() => Math.max(0, targetMs - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, targetMs - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetMs])

  return {
    days: Math.floor(left / 86400000),
    hours: Math.floor((left / 3600000) % 24),
    mins: Math.floor((left / 60000) % 60),
    secs: Math.floor((left / 1000) % 60),
    done: left <= 0,
  }
}
