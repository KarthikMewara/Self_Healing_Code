import { AnimatePresence, motion } from "motion/react"

import { assessPassword, PASSWORD_RULES, type StrengthScore } from "@/components/auth/validation"
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const SCORE_TONE: Record<StrengthScore, string> = {
  0: "text-muted-foreground",
  1: "text-destructive",
  2: "text-warning",
  3: "text-primary",
  4: "text-success",
}

interface PasswordStrengthProps {
  password: string
  /** Referenced by the password input's aria-describedby. */
  id?: string
  /** After a failed submit, unmet requirements are tinted red. */
  showErrors?: boolean
  className?: string
}

/**
 * Four-segment strength meter plus a requirement checklist whose items tick
 * over with a drawn check as they're met.
 */
export function PasswordStrength({ password, id, showErrors = false, className }: PasswordStrengthProps) {
  const { met, score, label, common } = assessPassword(password)
  const tone = SCORE_TONE[score]

  return (
    <div id={id} className={className}>
      <div className="flex items-center gap-3">
        <div
          role="meter"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={score}
          aria-valuetext={label || "No password yet"}
          className={cn("grid flex-1 grid-cols-4 gap-1.5", tone)}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full origin-left rounded-full bg-current shadow-[0_0_10px_-1px_currentColor] transition-colors duration-300"
                initial={false}
                animate={{ scaleX: i < score ? 1 : 0 }}
                transition={{ ...SPRING_SOFT, delay: i < score ? i * 0.05 : (3 - i) * 0.03 }}
              />
            </div>
          ))}
        </div>
        <div className="relative h-4 w-14 text-right text-xs font-medium">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label || "empty"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className={cn("absolute inset-0", tone)}
            >
              {label || "—"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const ok = met[rule.id]
          const flagged = showErrors && !ok
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-200",
                ok ? "text-foreground" : flagged ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "relative flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                  ok ? "border-success/60 bg-success/15 text-success" : flagged ? "border-destructive/50" : "border-border",
                )}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {ok ? (
                    <motion.svg
                      key="check"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5"
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 20 }}
                    >
                      <motion.path
                        d="M3.5 8.5l3 3 6-7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                      />
                    </motion.svg>
                  ) : (
                    <motion.span
                      key="dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={cn("size-1 rounded-full", flagged ? "bg-destructive/70" : "bg-muted-foreground/50")}
                    />
                  )}
                </AnimatePresence>
              </span>
              <span>{rule.label}</span>
              <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
            </li>
          )
        })}
      </ul>

      <AnimatePresence initial={false}>
        {common && (
          <motion.div
            key="common"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="pt-2 text-xs text-warning">
              Contains a very common word or sequence, so it's easy to guess even with symbols.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
