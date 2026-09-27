import { Send } from "lucide-react"
import { motion } from "motion/react"
import { useId } from "react"

import { DrawnCheck } from "@/components/auth/status-button"
import { useMotionPreference } from "@/components/motion-preference"
import { EASE_IN_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

// A paper plane leaves the envelope and flies a looping arc, drawing a dashed
// trail behind it; then a check lands on the envelope and a few sparkles
// twinkle. Coordinates are in px (the SVG viewBox matches the box size).

const W = 200
const H = 132
type Point = readonly [number, number]
const P0: Point = [86, 60]
const P1: Point = [110, 22]
const P2: Point = [140, 58]
const P3: Point = [172, 22]
const TRAIL = `M ${P0.join(" ")} C ${P1.join(" ")}, ${P2.join(" ")}, ${P3.join(" ")}`

const FLIGHT_DELAY = 0.35
const FLIGHT_DURATION = 1.25
const PLANE = 22
// Lucide's Send icon points to the top-right (-45deg); rotate by tangent + 45.
const ICON_ANGLE_OFFSET = 45

function bezier(t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]]
}

function tangentAngle(t: number) {
  const u = 1 - t
  const dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0])
  const dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1])
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

/**
 * Keyframes that follow the curve by arc length with the same ease-in-out
 * the trail's pathLength uses, so the trail's head stays glued to the plane.
 */
const FLIGHT = (() => {
  const steps = 200
  const lengths = [0]
  let prev = bezier(0)
  for (let i = 1; i <= steps; i++) {
    const p = bezier(i / steps)
    lengths.push(lengths[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]))
    prev = p
  }
  const total = lengths[steps]
  const tAtFraction = (fraction: number) => {
    const target = fraction * total
    let i = 1
    while (i < steps && lengths[i] < target) i++
    const span = lengths[i] - lengths[i - 1] || 1
    return (i - 1 + (target - lengths[i - 1]) / span) / steps
  }
  const frames = 32
  const x: number[] = []
  const y: number[] = []
  const rotate: number[] = []
  for (let i = 0; i <= frames; i++) {
    const t = tAtFraction(easeInOutCubic(i / frames))
    const [px, py] = bezier(t)
    x.push(px - PLANE / 2)
    y.push(py - PLANE / 2)
    rotate.push(tangentAngle(t) + ICON_ANGLE_OFFSET)
  }
  return { x, y, rotate }
})()

const LAST = FLIGHT.x.length - 1
const ARRIVAL = FLIGHT_DELAY + FLIGHT_DURATION

const SPARKLES = [
  { x: 186, y: 12, size: 5, delay: 0 },
  { x: 160, y: 8, size: 3.5, delay: 0.12 },
  { x: 190, y: 36, size: 3, delay: 0.22 },
]

export function SentIllustration({ className }: { className?: string }) {
  const { reduced } = useMotionPreference()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const maskId = `trail-mask-${uid}`
  const gradientId = `envelope-${uid}`
  // Under reduced motion, render the finished scene without the flight.
  const initial = reduced ? false : undefined

  return (
    <div aria-hidden className={cn("relative mx-auto", className)} style={{ width: W, height: H }}>
      <div className="absolute top-[58%] left-[32%] size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl" />
      <span className="absolute top-[66px] left-[40px] size-12 animate-ping-soft rounded-2xl bg-primary/15" />

      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--info)" stopOpacity="0.14" />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <motion.path
              d={TRAIL}
              stroke="white"
              strokeWidth={6}
              strokeLinecap="round"
              initial={initial ?? { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: FLIGHT_DURATION, delay: FLIGHT_DELAY, ease: EASE_IN_OUT }}
            />
          </mask>
        </defs>

        {/* Dashed trail, revealed by the mask as the plane flies. */}
        <path
          d={TRAIL}
          mask={`url(#${maskId})`}
          className="stroke-primary"
          strokeOpacity={0.6}
          strokeWidth={1.6}
          strokeDasharray="3 5"
          strokeLinecap="round"
        />

        {/* Envelope */}
        <motion.g
          initial={initial ?? { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <rect x="30" y="62" width="68" height="48" rx="10" fill={`url(#${gradientId})`} className="stroke-primary" strokeOpacity={0.75} strokeWidth={1.5} />
          <path d="M33 67 L64 90 L95 67" className="stroke-primary" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M33 106 L55 86 M95 106 L73 86" className="stroke-primary" strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />
        </motion.g>

        {/* Sparkles where the plane lands */}
        {SPARKLES.map((s) => (
          <motion.path
            key={`${s.x}-${s.y}`}
            d={`M ${s.x} ${s.y - s.size} L ${s.x + s.size * 0.3} ${s.y - s.size * 0.3} L ${s.x + s.size} ${s.y} L ${s.x + s.size * 0.3} ${s.y + s.size * 0.3} L ${s.x} ${s.y + s.size} L ${s.x - s.size * 0.3} ${s.y + s.size * 0.3} L ${s.x - s.size} ${s.y} L ${s.x - s.size * 0.3} ${s.y - s.size * 0.3} Z`}
            className="fill-info"
            initial={initial ?? { opacity: 0, scale: 0 }}
            animate={reduced ? { opacity: 0.7, scale: 1 } : { opacity: [0, 1, 0.7], scale: [0, 1.25, 1] }}
            transition={{ duration: 0.6, delay: ARRIVAL + s.delay }}
          />
        ))}
      </svg>

      {/* Paper plane */}
      <motion.div
        className="absolute top-0 left-0 text-primary"
        style={{ width: PLANE, height: PLANE }}
        initial={initial ?? { x: FLIGHT.x[0], y: FLIGHT.y[0], rotate: FLIGHT.rotate[0], opacity: 0 }}
        animate={
          reduced
            ? { x: FLIGHT.x[LAST], y: FLIGHT.y[LAST], rotate: FLIGHT.rotate[LAST], opacity: 1 }
            : { x: FLIGHT.x, y: FLIGHT.y, rotate: FLIGHT.rotate, opacity: 1 }
        }
        transition={{
          x: { duration: FLIGHT_DURATION, delay: FLIGHT_DELAY, ease: "linear" },
          y: { duration: FLIGHT_DURATION, delay: FLIGHT_DELAY, ease: "linear" },
          rotate: { duration: FLIGHT_DURATION, delay: FLIGHT_DELAY, ease: "linear" },
          opacity: { duration: 0.2, delay: FLIGHT_DELAY },
        }}
      >
        <span className="block animate-float-y" style={{ animationDelay: `${ARRIVAL}s` }}>
          <Send className="size-[22px] fill-primary/20 drop-shadow-[0_4px_10px_color-mix(in_oklch,var(--primary)_55%,transparent)]" strokeWidth={1.75} />
        </span>
      </motion.div>

      {/* "Sent" check on the envelope */}
      <motion.span
        className="absolute flex size-[22px] items-center justify-center rounded-full bg-success text-success-foreground shadow-[0_0_0_3px_var(--card),0_6px_18px_-4px_var(--success)]"
        style={{ left: 86, top: 51 }}
        initial={initial ?? { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING_BOUNCY, delay: reduced ? 0 : ARRIVAL + 0.1 }}
      >
        <DrawnCheck className="size-3" delay={reduced ? 0 : ARRIVAL + 0.15} />
      </motion.span>
    </div>
  )
}
