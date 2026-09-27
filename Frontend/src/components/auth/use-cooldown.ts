import { useCallback, useEffect, useState } from "react"

/**
 * A restartable countdown (e.g. "Resend in 0:24"). This is functional, not
 * decorative, so it keeps ticking under reduced motion; only its visuals
 * (the progress fill) are subject to the motion preference.
 */
export function useCooldown(seconds: number) {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!until) return
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(id)
    }, 250)
    return () => window.clearInterval(id)
  }, [until])

  const start = useCallback(() => {
    const current = Date.now()
    setNow(current)
    setUntil(current + seconds * 1000)
  }, [seconds])

  const msLeft = until ? Math.max(0, until - now) : 0
  return {
    /** Whole seconds left, rounded up (0 = ready). */
    remaining: Math.ceil(msLeft / 1000),
    /** 0 -> 1 as the cooldown elapses (1 when ready). */
    progress: until ? 1 - msLeft / (seconds * 1000) : 1,
    start,
  }
}
