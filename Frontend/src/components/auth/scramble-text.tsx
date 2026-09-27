import { useEffect, useState } from "react"

import { useMotionPreference } from "@/components/motion-preference"

const GLYPHS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function noise(length: number) {
  let out = ""
  for (let i = 0; i < length; i++) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  return out
}

interface ScrambleTextProps {
  text: string
  /** Leading characters that are shown as-is from the start (e.g. a key prefix). */
  keep?: number
  /** Total decode time in ms. */
  duration?: number
  className?: string
}

/**
 * "Decrypts" text left to right: unsettled characters flicker through random
 * glyphs until they lock in. Screen readers get the real text immediately;
 * reduced motion shows it straight away.
 */
export function ScrambleText({ text, keep = 0, duration = 900, className }: ScrambleTextProps) {
  const { reduced } = useMotionPreference()
  const [display, setDisplay] = useState(() => text.slice(0, keep) + noise(text.length - keep))

  useEffect(() => {
    if (reduced) return
    let raf = 0
    let lastFrame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      // ~30 updates a second reads as a flicker; every frame just looks like noise.
      if (now - lastFrame > 32 || progress === 1) {
        lastFrame = now
        const settled = keep + Math.floor(progress * (text.length - keep))
        setDisplay(text.slice(0, settled) + noise(text.length - settled))
      }
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, keep, duration, reduced])

  return (
    <>
      <span aria-hidden className={className}>
        {reduced ? text : display}
      </span>
      <span className="sr-only">{text}</span>
    </>
  )
}
