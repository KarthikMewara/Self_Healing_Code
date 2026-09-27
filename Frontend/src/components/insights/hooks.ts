import { useEffect, useState } from "react"

/** False while the tab is in the background -- pause live simulations with it. */
export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])
  return visible
}

/** Current time, re-read every `intervalMs` while `enabled` (for relative labels and stopwatches). */
export function useNow(intervalMs: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, enabled])
  return now
}

/** A stable id that is safe inside `url(#...)` references (React ids contain colons). */
export function svgSafeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "")
}
