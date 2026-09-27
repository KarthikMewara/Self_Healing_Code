import { animate, useInView } from "motion/react"
import { useEffect, useLayoutEffect, useRef } from "react"

import { useMotionPreference } from "@/components/motion-preference"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  /** Custom formatter; overrides decimals. */
  format?: (value: number) => string
  duration?: number
  delay?: number
  /** Wait until the number scrolls into view before counting. */
  startOnView?: boolean
  className?: string
}

/**
 * Counts up to `value` (and re-animates from the previous value when it
 * changes). Writes straight to the DOM so a 60fps count doesn't re-render React.
 */
export function NumberTicker({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  duration = 1.4,
  delay = 0,
  startOnView = true,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(0)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const { reduced } = useMotionPreference()

  const render = (v: number) => {
    const body = format
      ? format(v)
      : v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    return `${prefix}${body}${suffix}`
  }

  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = render(reduced ? value : current.current)
    // Only the very first paint needs this; later updates animate below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (startOnView && !inView) return
    if (reduced) {
      current.current = value
      node.textContent = render(value)
      return
    }
    const controls = animate(current.current, value, {
      duration,
      delay,
      ease: EASE_OUT,
      onUpdate: (v) => {
        current.current = v
        node.textContent = render(v)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduced, startOnView])

  return <span ref={ref} className={cn("tabular-nums", className)} />
}
