import { useEffect, useState } from "react"

import { useMotionPreference } from "@/components/motion-preference"

interface TypewriterOptions {
  /** Milliseconds per tick. */
  speed?: number
  /** Characters revealed per tick. */
  step?: number
  /** Hold at zero characters until this flips true. */
  start?: boolean
  delay?: number
}

/** Reveals `text` progressively. Reduced motion shows it all at once. */
export function useTypewriter(text: string, { speed = 16, step = 1, start = true, delay = 0 }: TypewriterOptions = {}) {
  const { reduced } = useMotionPreference()
  const [count, setCount] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    setCount(0)
    if (!start) return
    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i = Math.min(text.length, i + step)
        setCount(i)
        if (i >= text.length && interval) clearInterval(interval)
      }, speed)
    }, delay)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [text, start, speed, step, delay, reduced])

  return { text: text.slice(0, count), done: count >= text.length }
}
