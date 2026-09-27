import { useId } from "react"

import { cn } from "@/lib/utils"

// An ECG trace that starts erratic (red, the bug) and settles into a calm,
// steady rhythm (green, healed) -- the product's "self-healing" metaphor.
const TRACE =
  "M0 60 L40 60 L52 30 L60 96 L70 14 L80 104 L90 42 L100 70 L112 60 L150 60 L162 22 L170 100 L182 34 L194 84 L206 60 " +
  "L260 60 L272 48 L282 72 L292 60 L340 60 L352 20 L364 96 L374 60 L420 60 L432 48 L442 72 L452 60 L500 60 L512 20 L524 96 L534 60 L600 60"

export function HeartbeatLine({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const grad = `hb-grad-${id}`
  const glow = `hb-glow-${id}`

  return (
    <svg viewBox="0 0 600 120" fill="none" preserveAspectRatio="none" className={cn("h-24 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" x2="600" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--destructive)" />
          <stop offset="34%" stopColor="var(--destructive)" />
          <stop offset="46%" stopColor="var(--info)" />
          <stop offset="60%" stopColor="var(--success)" />
          <stop offset="100%" stopColor="var(--success)" />
        </linearGradient>
        <filter id={glow} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={TRACE} stroke={`url(#${grad})`} strokeOpacity="0.2" strokeWidth="2" strokeLinejoin="round" />
      <path
        d={TRACE}
        stroke={`url(#${grad})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glow})`}
        pathLength={1000}
        strokeDasharray="160 840"
        className="animate-dash"
        style={{ animationDuration: "3.2s" }}
      />
    </svg>
  )
}
