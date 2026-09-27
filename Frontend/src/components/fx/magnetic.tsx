import { motion, useSpring } from "motion/react"
import { useRef, type ReactNode } from "react"

import { useMotionPreference } from "@/components/motion-preference"
import { cn } from "@/lib/utils"

/** Pulls its child gently toward a mouse cursor hovering over it. */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 })
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 })
  const { reduced } = useMotionPreference()

  return (
    <motion.div
      ref={ref}
      className={cn("inline-flex", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse" || !ref.current) return
        const rect = ref.current.getBoundingClientRect()
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
