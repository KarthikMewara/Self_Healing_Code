import { motion } from "motion/react"
import { useId, useMemo } from "react"

import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface SparklineProps {
  data: number[]
  /** Any CSS color; defaults to the primary accent. */
  color?: string
  className?: string
  /** Fill the area under the line with a fading gradient. */
  area?: boolean
  strokeWidth?: number
}

/** Tiny trend line that draws itself in. Scales to its container. */
export function Sparkline({ data, color = "var(--primary)", className, area = true, strokeWidth = 1.75 }: SparklineProps) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`
  const { line, fill } = useMemo(() => {
    const w = 100
    const h = 32
    const pad = 3
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const pts = data.map((v, i) => [
      (i / Math.max(1, data.length - 1)) * w,
      h - pad - ((v - min) / span) * (h - pad * 2),
    ])
    // Smooth with a simple midpoint quadratic curve.
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1]
      const [x, y] = pts[i]
      const mx = (px + x) / 2
      d += ` Q ${px} ${py} ${mx} ${(py + y) / 2}`
      if (i === pts.length - 1) d += ` T ${x} ${y}`
    }
    return { line: d, fill: `${d} L ${w} ${h} L 0 ${h} Z` }
  }, [data])

  if (data.length < 2) return null

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn("h-8 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && (
        <motion.path
          d={fill}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      )}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      />
    </svg>
  )
}
