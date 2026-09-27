import { MotionConfig } from "motion/react"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

// "system" follows prefers-reduced-motion; the other two are explicit user
// overrides from Settings -> Appearance and are persisted per browser.
export type MotionPref = "system" | "reduced" | "full"

const STORAGE_KEY = "shad:motion"

interface MotionPreferenceState {
  pref: MotionPref
  setPref: (pref: MotionPref) => void
  /** The effective answer: should this client animate heavily right now? */
  reduced: boolean
}

const MotionPreferenceContext = createContext<MotionPreferenceState | null>(null)

function readStoredPref(): MotionPref {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === "reduced" || value === "full") return value
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  return "system"
}

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return reduced
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<MotionPref>(readStoredPref)
  const systemReduced = useSystemReducedMotion()

  useEffect(() => {
    const root = document.documentElement
    if (pref === "system") delete root.dataset.motion
    else root.dataset.motion = pref
    try {
      if (pref === "system") localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // Non-fatal: the preference just won't persist.
    }
  }, [pref])

  const value = useMemo<MotionPreferenceState>(
    () => ({ pref, setPref, reduced: pref === "reduced" || (pref === "system" && systemReduced) }),
    [pref, systemReduced],
  )

  return (
    <MotionPreferenceContext.Provider value={value}>
      <MotionConfig reducedMotion={pref === "reduced" ? "always" : pref === "full" ? "never" : "user"}>
        {children}
      </MotionConfig>
    </MotionPreferenceContext.Provider>
  )
}

export function useMotionPreference() {
  const ctx = useContext(MotionPreferenceContext)
  if (!ctx) throw new Error("useMotionPreference must be used within MotionPreferenceProvider")
  return ctx
}
