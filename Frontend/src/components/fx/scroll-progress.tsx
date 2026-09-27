import { motion, useScroll, useSpring } from "motion/react"

/** Thin brand-gradient bar pinned to the top edge that fills as you scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary via-info to-success"
      style={{ scaleX }}
    />
  )
}
