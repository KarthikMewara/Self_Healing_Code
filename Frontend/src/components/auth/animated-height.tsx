import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react"

import { useMotionPreference } from "@/components/motion-preference"

interface AnimatedHeightProps {
  children: ReactNode
  /**
   * Change this (e.g. a step name) to glide to the next content's height.
   * Other size changes -- an error message sliding in -- follow instantly, so
   * they're never double-eased or clipped.
   */
  trigger: unknown
  duration?: number
  className?: string
}

/**
 * Height-auto container that animates between steps. At rest it's plain
 * `height: auto` with visible overflow (focus rings are never clipped); only
 * during a step change is the height tweened and overflow hidden.
 */
export function AnimatedHeight({ children, trigger, duration = 420, className }: AnimatedHeightProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const armed = useRef(false)
  const lastTrigger = useRef(trigger)
  const { reduced } = useMotionPreference()

  useEffect(() => {
    if (Object.is(lastTrigger.current, trigger)) return
    lastTrigger.current = trigger
    armed.current = true
  }, [trigger])

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    let lastHeight = inner.offsetHeight
    let running: Animation | null = null

    const observer = new ResizeObserver(() => {
      const next = inner.offsetHeight
      const previous = lastHeight
      lastHeight = next
      if (!armed.current || previous === next || reduced || typeof outer.animate !== "function") return
      armed.current = false
      running?.cancel()
      outer.style.overflow = "hidden"
      running = outer.animate([{ height: `${previous}px` }, { height: `${next}px` }], {
        duration,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      })
      const done = running
      done.onfinish = done.oncancel = () => {
        if (running === done) {
          outer.style.overflow = ""
          running = null
        }
      }
    })
    observer.observe(inner)
    return () => {
      observer.disconnect()
      running?.cancel()
    }
  }, [duration, reduced])

  return (
    <div ref={outerRef} className={className}>
      {/* flow-root: children's margins can't collapse through, so the measured height is exact. */}
      <div ref={innerRef} className="flow-root">
        {children}
      </div>
    </div>
  )
}
