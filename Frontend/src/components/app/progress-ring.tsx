import { motion } from "motion/react"
import type { ReactNode } from "react"

import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Tone = "primary" | "info" | "success" | "warning" | "danger"

const STROKE: Record<Tone, string> = {
  primary: "var(--primary)",
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
}

interface ProgressRingProps {
  /** 0-100 */
  value: number
  size?: number
  stroke?: number
  tone?: Tone
  className?: string
  /** Rendered centred inside the ring. */
  children?: ReactNode
  /** Animate when scrolled into view (default) or immediately. */
  animateOnView?: boolean
}

/** Circular progress / score ring that sweeps to its value. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  tone = "primary",
  className,
  children,
  animateOnView = true,
}: ProgressRingProps) {
  const r = (size - stroke) / 2
  const pct = Math.max(0, Math.min(100, value)) / 100
  const color = STROKE[tone]
  const target = { pathLength: pct }
  const motionProps = animateOnView
    ? { whileInView: target, viewport: { once: true } }
    : { animate: target }

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          {...motionProps}
          transition={{ duration: 1.2, ease: EASE_OUT }}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklch, ${color} 55%, transparent))` }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
