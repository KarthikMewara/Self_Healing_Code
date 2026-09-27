import { useCallback, useRef } from "react"

import { useMotionPreference } from "@/components/motion-preference"

const KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-9px)" },
  { transform: "translateX(8px)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(5px)" },
  { transform: "translateX(-2px)" },
  { transform: "translateX(0)" },
]

/**
 * "No" head-shake for a failed submit. Uses the Web Animations API on the
 * element itself, so replaying it never remounts the form (and never loses
 * what the user typed). Skipped entirely under reduced motion.
 */
export function useShake<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const { reduced } = useMotionPreference()

  const shake = useCallback(() => {
    const el = ref.current
    if (!el || reduced || typeof el.animate !== "function") return
    el.animate(KEYFRAMES, { duration: 460, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" })
  }, [reduced])

  return [ref, shake] as const
}
