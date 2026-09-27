import { useEffect, useState } from "react"

import { useMotionPreference } from "@/components/motion-preference"
import type { LanguageKey } from "@/lib/highlight"

// Drives the auth showcase: a bug walks through the four pipeline stages the
// real backend streams (retrieval -> analysis -> generation -> testing) and,
// once "testing" passes, a healed card lands in the feed. One cycle is ~2.5s.
// Everything here is sample data for the marketing surface.

export interface HealEvent {
  id: number
  verb: string
  error: string
  target: string
  language: LanguageKey
  seconds: number
  tests: number
  /** Epoch ms when it "healed", for the relative timestamp. */
  at: number
}

const POOL: Omit<HealEvent, "id" | "at">[] = [
  { verb: "Fixed", error: "TypeError", target: "checkout-service/cart.js", language: "javascript", seconds: 2.1, tests: 14 },
  { verb: "Resolved", error: "KeyError", target: "ingest-pipeline/events.py", language: "python", seconds: 1.8, tests: 22 },
  { verb: "Patched", error: "nil-pointer panic", target: "routing-gateway/router.go", language: "go", seconds: 2.6, tests: 9 },
  { verb: "Fixed", error: "NullPointerException", target: "auth-service/TokenValidator.java", language: "java", seconds: 3.1, tests: 31 },
  { verb: "Resolved", error: "infinite re-render", target: "web-dashboard/ChartPanel.tsx", language: "typescript", seconds: 1.4, tests: 12 },
  { verb: "Fixed", error: "NoMethodError", target: "billing-worker/invoice.rb", language: "ruby", seconds: 2.3, tests: 17 },
  { verb: "Patched", error: "IndexOutOfRangeException", target: "inventory-api/StockService.cs", language: "csharp", seconds: 2.8, tests: 26 },
  { verb: "Resolved", error: "undefined index", target: "legacy-portal/cart.php", language: "php", seconds: 1.9, tests: 8 },
]

export const PIPELINE_STAGE_COUNT = 4
const STAGE_MS = 640
const VISIBLE = 3

function eventFor(cycle: number, at: number): HealEvent {
  return { ...POOL[cycle % POOL.length], id: cycle, at }
}

interface LoopState {
  /** 0-3: the active pipeline stage. */
  stage: number
  cycle: number
  events: HealEvent[]
}

export function useHealLoop(paused = false) {
  const { reduced } = useMotionPreference()
  const [now, setNow] = useState(() => Date.now())
  const [state, setState] = useState<LoopState>(() => {
    const start = Date.now()
    return {
      stage: 0,
      cycle: 2,
      events: [eventFor(2, start - 2_000), eventFor(1, start - 9_000), eventFor(0, start - 26_000)],
    }
  })

  useEffect(() => {
    // Ambient animation: frozen under reduced motion, and while the user hovers to read.
    if (reduced || paused) return
    const timer = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      setState((prev) => {
        const stage = prev.stage + 1
        if (stage < PIPELINE_STAGE_COUNT) return { ...prev, stage }
        const cycle = prev.cycle + 1
        return { stage: 0, cycle, events: [eventFor(cycle, at), ...prev.events].slice(0, VISIBLE) }
      })
    }, STAGE_MS)
    return () => window.clearInterval(timer)
  }, [reduced, paused])

  return {
    /** Under reduced motion every stage reads as complete. */
    stage: reduced ? PIPELINE_STAGE_COUNT : state.stage,
    events: state.events,
    now,
  }
}
