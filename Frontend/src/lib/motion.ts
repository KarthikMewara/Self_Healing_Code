import type { Transition, Variants } from "motion/react"

// One shared motion vocabulary so every surface moves the same way.
// EASE_OUT is the house curve: fast out of the gate, long soft landing.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 }
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 190, damping: 24 }
export const SPRING_BOUNCY: Transition = { type: "spring", stiffness: 520, damping: 18 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE_OUT },
    // A lingering `filter` would turn the element into a backdrop root and
    // disable the glass blur of everything inside it.
    transitionEnd: { filter: "none" },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } },
}

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: SPRING },
}

export function staggerContainer(stagger = 0.06, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }
}
