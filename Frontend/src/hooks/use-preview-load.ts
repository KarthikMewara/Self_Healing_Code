import { useEffect, useState } from "react"

// Preview screens have no backend, but real ones will have latency -- this
// simulates a short first load (per screen, per session) so every data view
// genuinely exercises its skeleton state. Revisits are instant.
const loaded = new Set<string>()

export function usePreviewLoad(key: string, ms = 650) {
  const [ready, setReady] = useState(() => loaded.has(key))

  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => {
      loaded.add(key)
      setReady(true)
    }, ms)
    return () => clearTimeout(t)
  }, [key, ms, ready])

  return ready
}
