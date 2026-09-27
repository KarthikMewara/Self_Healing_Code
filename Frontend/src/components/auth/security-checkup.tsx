import { ArrowRight, CircleAlert } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { ProgressRing } from "@/components/app/progress-ring"
import { DrawnCheck } from "@/components/auth/status-button"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface SecurityCheckupProps {
  passwordChanged: string
  twoFactorOn: boolean
  unusedKeys: number
  onEnableTwoFactor: () => void
  onReviewKeys: () => void
}

const TONE = {
  success: { text: "text-success", glow: "var(--success)" },
  primary: { text: "text-primary", glow: "var(--primary)" },
  warning: { text: "text-warning", glow: "var(--warning)" },
} as const

/** A live score for the Security tab that reacts as items below get fixed. */
export function SecurityCheckup({ passwordChanged, twoFactorOn, unusedKeys, onEnableTwoFactor, onReviewKeys }: SecurityCheckupProps) {
  const items = [
    { id: "password", done: true, title: "Strong password", detail: `Last changed ${passwordChanged}`, action: null },
    {
      id: "two-factor",
      done: twoFactorOn,
      title: "Two-factor authentication",
      detail: twoFactorOn ? "On for every login" : "Off, so your password is the only lock",
      action: twoFactorOn ? null : { label: "Turn on", onClick: onEnableTwoFactor },
    },
    {
      id: "keys",
      done: unusedKeys === 0,
      title: "No unused API keys",
      detail:
        unusedKeys === 0 ? "Every key has been used" : `${unusedKeys} key${unusedKeys === 1 ? " has" : "s have"} never been used`,
      action: unusedKeys === 0 ? null : { label: "Review keys", onClick: onReviewKeys },
    },
  ]
  const done = items.filter((item) => item.done).length
  const total = items.length
  const tone = done === total ? "success" : done === total - 1 ? "primary" : "warning"
  const verdict = done === total ? "Excellent" : done === total - 1 ? "Good" : "Needs attention"

  return (
    <SpotlightCard glow={TONE[tone].glow} className="p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 lg:w-60 lg:shrink-0">
          <ProgressRing value={(done / total) * 100} size={68} stroke={6} tone={tone} animateOnView={false}>
            <span className="text-base font-semibold text-foreground tabular-nums">
              {done}/{total}
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Security checkup</p>
            <div className="relative h-7 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={verdict}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                  className={cn("text-lg font-semibold", TONE[tone].text)}
                >
                  {verdict}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="text-xs text-muted-foreground">
              {done === total ? "Your account is well protected." : "Finish the open items to lock it down."}
            </p>
          </div>
        </div>

        <ul className="grid flex-1 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 transition-colors duration-500",
                item.done ? "border-success/25 bg-success/5" : "border-warning/30 bg-warning/5",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
                  item.done ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={item.done ? "done" : "todo"}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className="flex"
                  >
                    {item.done ? <DrawnCheck className="size-3" /> : <CircleAlert aria-hidden className="size-3" />}
                  </motion.span>
                </AnimatePresence>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">
                  {item.title}
                  <span className="sr-only">{item.done ? " (done)" : " (needs attention)"}</span>
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                {item.action && (
                  <button
                    type="button"
                    onClick={item.action.onClick}
                    className="group/act mt-1.5 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {item.action.label}
                    <ArrowRight aria-hidden className="size-3 transition-transform group-hover/act:translate-x-0.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SpotlightCard>
  )
}
