import { motion, type HTMLMotionProps } from "motion/react"
import type { ReactNode } from "react"

import { EASE_OUT, fadeUp, staggerContainer } from "@/lib/motion"

interface RevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  delay?: number
  /** Distance travelled on entrance, in px. */
  y?: number
  blur?: boolean
  /** Fraction of the element that must be visible before it animates. */
  amount?: number | "some" | "all"
  once?: boolean
}

/** Fades + lifts + un-blurs its content the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  blur = true,
  amount = 0.2,
  once = true,
  ...props
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" }}
      // Drop the filter once settled: a lingering `filter` makes this element a
      // backdrop root, which silently disables the glass blur of any child.
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      viewport={{ once, amount }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface StaggerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  stagger?: number
  delay?: number
  amount?: number | "some" | "all"
  /** Animate on mount instead of on scroll-into-view. */
  immediate?: boolean
}

/** Parent that cascades its <StaggerItem> children in one after another. */
export function Stagger({
  children,
  stagger = 0.07,
  delay = 0,
  amount = 0.15,
  immediate = false,
  ...props
}: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount } })}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, ...props }: Omit<HTMLMotionProps<"div">, "children"> & { children: ReactNode }) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  )
}
