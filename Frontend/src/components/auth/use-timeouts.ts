import { useEffect, useMemo, useRef } from "react"

/**
 * setTimeout that is cleared automatically on unmount, so a mock "request"
 * never resolves (or navigates) after the user has already left the screen.
 */
export function useTimeouts() {
  const ids = useRef(new Set<number>())

  useEffect(() => {
    const pending = ids.current
    return () => {
      pending.forEach((id) => window.clearTimeout(id))
      pending.clear()
    }
  }, [])

  return useMemo(
    () => ({
      after(ms: number, fn: () => void) {
        const id = window.setTimeout(() => {
          ids.current.delete(id)
          fn()
        }, ms)
        ids.current.add(id)
        return id
      },
      clearAll() {
        ids.current.forEach((id) => window.clearTimeout(id))
        ids.current.clear()
      },
    }),
    [],
  )
}
