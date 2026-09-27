import { AnimatePresence, motion } from "motion/react"
import { Fragment, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

export type OtpStatus = "idle" | "verifying" | "success"

interface OtpInputProps {
  length?: number
  onComplete?: (code: string) => void
  onChange?: (code: string) => void
  status?: OtpStatus
  disabled?: boolean
  autoFocus?: boolean
  /** Accessible name for the group of boxes. */
  label?: string
  describedBy?: string
  /** Given to the first box, so a <label htmlFor> can point at it. */
  id?: string
}

/**
 * One box per digit. Typing advances, Backspace steps back, arrows/Home/End
 * move, and pasting (or iOS "one-time-code" autofill) spreads a whole code
 * across the boxes. Completing the last box calls onComplete.
 */
export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  status = "idle",
  disabled = false,
  autoFocus = false,
  label = "Verification code",
  describedBy,
  id,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""))
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const locked = disabled || status !== "idle"
  const split = Math.floor(length / 2)

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus({ preventScroll: true })
  }, [autoFocus])

  const focusAt = (index: number) => {
    const el = inputs.current[Math.max(0, Math.min(length - 1, index))]
    el?.focus()
    el?.select()
  }

  const commit = (next: string[]) => {
    setDigits(next)
    const code = next.join("")
    onChange?.(code)
    if (next.every(Boolean)) onComplete?.(code)
  }

  const fillFrom = (start: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, length - start).split("")
    if (!chars.length) return
    const next = [...digits]
    chars.forEach((char, k) => {
      next[start + k] = char
    })
    commit(next)
    const firstEmpty = next.findIndex((d) => !d)
    focusAt(firstEmpty === -1 ? length - 1 : firstEmpty)
  }

  const handleInput = (index: number, raw: string) => {
    if (locked) return
    const clean = raw.replace(/\D/g, "")
    if (!clean) {
      commit(digits.map((d, k) => (k === index ? "" : d)))
      return
    }
    // Autofill or a paste that bypassed onPaste: spread it out.
    if (clean.length > 2) {
      fillFrom(index, clean)
      return
    }
    // Typing into a filled box leaves two characters; keep the new one.
    const char = clean.length === 2 ? (clean[0] === digits[index] ? clean[1] : clean[0]) : clean
    commit(digits.map((d, k) => (k === index ? char : d)))
    if (index < length - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault()
      if (!locked) commit(digits.map((d, k) => (k === index - 1 ? "" : d)))
      focusAt(index - 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focusAt(index - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      focusAt(index + 1)
    } else if (e.key === "Home") {
      e.preventDefault()
      focusAt(0)
    } else if (e.key === "End") {
      e.preventDefault()
      focusAt(length - 1)
    }
  }

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (locked) return
    const clean = e.clipboardData.getData("text").replace(/\D/g, "")
    // A full code always fills from the first box, wherever it was pasted.
    fillFrom(clean.length >= length ? 0 : index, clean)
  }

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className="flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2">
      {digits.map((digit, index) => (
        <Fragment key={index}>
          {index === split && <span aria-hidden className="h-0.5 w-2.5 shrink-0 rounded-full bg-border" />}
          <motion.div
            className="relative"
            animate={status === "success" ? { y: [0, -5, 0] } : { y: 0 }}
            transition={{ duration: 0.4, delay: status === "success" ? index * 0.05 : 0, ease: "easeOut" }}
          >
            <input
              ref={(el) => {
                inputs.current[index] = el
              }}
              id={index === 0 ? id : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${length}`}
              value={digit}
              disabled={disabled}
              readOnly={status !== "idle"}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              onFocus={(e) => {
                const el = e.currentTarget
                requestAnimationFrame(() => el.select())
              }}
              style={status === "success" ? { transitionDelay: `${index * 50}ms` } : undefined}
              className={cn(
                // 36px boxes fit a 375px phone inside a Panel; they grow from there.
                "size-9 rounded-lg border border-input bg-background/80 text-center font-mono text-base font-semibold text-foreground caret-primary shadow-xs outline-none min-[400px]:size-10 sm:size-11 sm:text-lg dark:bg-background/50",
                "transition-[border-color,box-shadow,background-color,color] duration-200",
                "focus:border-primary/70 focus:ring-3 focus:ring-primary/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                digit && "border-primary/45 bg-primary/5 dark:bg-primary/10",
                status === "verifying" && "animate-pulse border-primary/50",
                status === "success" && "border-success/60 bg-success/10 text-success dark:bg-success/15",
              )}
            />
            {/* A ring ripples out each time a digit lands. */}
            <AnimatePresence>
              {digit && (
                <motion.span
                  key={`${index}-${digit}`}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-lg ring-2",
                    status === "success" ? "ring-success/50" : "ring-primary/50",
                  )}
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </Fragment>
      ))}
    </div>
  )
}
