import { Check, Pause } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import type { HealEvent } from "@/components/auth/use-heal-loop"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

function formatAgo(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

interface HealedFeedProps {
  events: HealEvent[]
  now: number
  paused?: boolean
  className?: string
}

/** Stack of "healed" notifications: new ones drop in on top, old ones fade off the bottom. */
export function HealedFeed({ events, now, paused = false, className }: HealedFeedProps) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-success" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          Live heal feed
        </span>
        <span className="relative h-4 min-w-24 text-right text-[11px] text-muted-foreground">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={paused ? "paused" : "sample"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="absolute inset-0 inline-flex items-center justify-end gap-1"
            >
              {paused ? (
                <>
                  <Pause aria-hidden className="size-3" /> Paused while you read
                </>
              ) : (
                "Sample activity"
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <ol className="relative flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {events.map((event, index) => (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.96, filter: "blur(4px)" }}
              // Drop the filter once settled so the cards' backdrop blur keeps working.
              animate={{
                opacity: 1 - index * 0.24,
                y: 0,
                scale: 1 - index * 0.015,
                filter: "blur(0px)",
                transitionEnd: { filter: "none" },
              }}
              exit={{ opacity: 0, y: 12, scale: 0.94, filter: "blur(4px)", transition: { duration: 0.25 } }}
              transition={SPRING_SOFT}
            >
              <HealCard event={event} now={now} fresh={index === 0} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}

function HealCard({ event, now, fresh }: { event: HealEvent; now: number; fresh: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card/85 p-3 shadow-sm backdrop-blur-md transition-[border-color,box-shadow] duration-700",
        fresh ? "border-success/35 shadow-[0_12px_32px_-16px_var(--success)]" : "border-border",
      )}
    >
      <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
        {fresh && <span aria-hidden className="absolute inset-0 animate-ping-soft rounded-full bg-success/25" />}
        <Check aria-hidden className="relative size-3.5" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
            <span className="font-medium">
              {event.verb} {event.error}
            </span>
            <span className="text-muted-foreground"> in </span>
            <span className="font-mono text-[12px] text-foreground/90">{event.target}</span>
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatAgo(now - event.at)}</span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[event.language] }} />
            {LANGUAGE_LABELS[event.language]}
          </span>
          <span aria-hidden>·</span>
          <span>{event.tests} tests passed</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-success">healed in {event.seconds}s</span>
        </p>
      </div>
    </div>
  )
}
