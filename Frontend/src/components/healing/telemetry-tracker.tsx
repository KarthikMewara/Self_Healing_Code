import {
  AlertTriangle,
  Check,
  CheckCircle2,
  DatabaseZap,
  FlaskConical,
  Loader2,
  Pencil,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { TimedStatusEvent, WorkspaceStatus } from "@/context/debug-workspace"
import { useTypewriter } from "@/hooks/use-typewriter"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { HEAL_MODE } from "@/services/heal-api"
import type { HealStep } from "@/types/contract"

// The four backend-defined stages. Labels are ours; the live message under
// each is always the backend's literal text.
const STEPS: { key: HealStep; label: string; icon: LucideIcon; color: string }[] = [
  { key: "retrieval", label: "Retrieving docs", icon: DatabaseZap, color: "var(--primary)" },
  { key: "analysis", label: "Analyzing", icon: ScanSearch, color: "var(--info)" },
  { key: "generation", label: "Generating patch", icon: Wand2, color: "var(--warning)" },
  { key: "testing", label: "Testing", icon: FlaskConical, color: "var(--success)" },
]

function useElapsed(startedAt: number | null, finishedAt: number | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])
  if (!startedAt) return 0
  return ((finishedAt ?? (running ? now : startedAt)) - startedAt) / 1000
}

function LatestMessage({ text, typing }: { text: string; typing: boolean }) {
  const { text: shown } = useTypewriter(text, { speed: 12, step: 2, start: typing })
  return (
    <>
      {typing ? shown : text}
      {typing && <span className="animate-caret ml-0.5 inline-block h-3 w-[6px] translate-y-0.5 bg-info" />}
    </>
  )
}

interface TelemetryTrackerProps {
  events: TimedStatusEvent[]
  status: WorkspaceStatus
  startedAt: number | null
  finishedAt: number | null
  errorMessage?: string | null
  orientation?: "horizontal" | "vertical"
  onRetry?: () => void
  onEdit?: () => void
  onCancel?: () => void
  className?: string
}

export function TelemetryTracker({
  events,
  status,
  startedAt,
  finishedAt,
  errorMessage,
  orientation = "horizontal",
  onRetry,
  onEdit,
  onCancel,
  className,
}: TelemetryTrackerProps) {
  const running = status === "analyzing"
  const elapsed = useElapsed(startedAt, finishedAt, running)
  const last = events[events.length - 1]
  const reachedIndex = last ? STEPS.findIndex((s) => s.key === last.step) : -1
  const doneCount = status === "complete" ? STEPS.length : Math.max(0, reachedIndex)

  const stepState = (i: number) => {
    if (status === "complete") return "done" as const
    if (i < reachedIndex) return "done" as const
    if (i === reachedIndex) return status === "error" ? ("failed" as const) : ("active" as const)
    return "pending" as const
  }

  const durationOf = (i: number) => {
    const ev = events.find((e) => e.step === STEPS[i].key)
    if (!ev) return null
    const next = events.find((e) => STEPS.findIndex((s) => s.key === e.step) > i)
    const end = next?.at ?? (status === "complete" ? finishedAt : null)
    return end ? (end - ev.at) / 1000 : null
  }

  const progress = status === "complete" ? 100 : ((doneCount + (running && reachedIndex >= 0 ? 0.5 : 0)) / STEPS.length) * 100

  const headerIcon =
    status === "complete" ? (
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_BOUNCY} className="flex">
        <CheckCircle2 className="size-5 text-success" />
      </motion.span>
    ) : status === "error" ? (
      <AlertTriangle className="size-5 text-destructive" />
    ) : (
      <span className="relative flex size-5 items-center justify-center">
        <span className="animate-ping-soft absolute inset-0 rounded-full bg-info/40" />
        <Sparkles className="relative size-4 text-info" />
      </span>
    )

  const title =
    status === "complete" ? "Healed" : status === "error" ? "Couldn't heal this one" : last ? "Healing in progress" : "Connecting to the healing engine"

  const vertical = orientation === "vertical"

  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-xl border",
        status === "error" ? "border-destructive/40" : status === "complete" ? "border-success/35" : "border-info/30",
        status === "error" && "animate-shake",
        className,
      )}
    >
      {running && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="animate-shimmer-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-info to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
        {headerIcon}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {status === "complete"
              ? `All ${STEPS.length} stages passed`
              : status === "error"
                ? "The engine stopped after its internal retries"
                : last
                  ? `Stage ${reachedIndex + 1} of ${STEPS.length}`
                  : "Waiting for the first status event…"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              HEAL_MODE === "live" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
            )}
            title={HEAL_MODE === "live" ? "Connected to the healing backend" : "No backend configured — using the built-in simulation"}
          >
            {HEAL_MODE === "live" ? "Live backend" : "Simulated engine"}
          </span>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              status === "complete" ? "text-success" : status === "error" ? "text-destructive" : "text-foreground",
            )}
          >
            {elapsed.toFixed(1)}s
          </span>
          {running && onCancel && (
            <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Cancel healing">
              <X />
            </Button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className={cn("px-4 py-4", vertical ? "space-y-0" : "")}>
        {!vertical && (
          <div className="relative mb-4 h-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                status === "error" ? "bg-destructive" : "bg-gradient-to-r from-primary via-info to-success",
              )}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          </div>
        )}
        <ol className={cn(vertical ? "relative space-y-1" : "grid grid-cols-2 gap-2 md:grid-cols-4")}>
          {vertical && <span aria-hidden className="absolute top-3 bottom-3 left-[15px] w-px bg-border" />}
          {STEPS.map((step, i) => {
            const state = stepState(i)
            const dur = durationOf(i)
            return (
              <li
                key={step.key}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-300",
                  state === "active" && "bg-info/10 ring-1 ring-info/25",
                  state === "failed" && "bg-destructive/10 ring-1 ring-destructive/30",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    state === "done" && "border-success/40 bg-success/15 text-success",
                    state === "active" && "border-transparent text-white shadow-[0_0_20px_-4px_var(--glow)]",
                    state === "failed" && "border-destructive/40 bg-destructive/15 text-destructive",
                    state === "pending" && "border-border bg-background text-muted-foreground/60",
                  )}
                  style={{ "--glow": step.color, background: state === "active" ? step.color : undefined } as React.CSSProperties}
                >
                  {state === "done" ? (
                    <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_BOUNCY} className="flex">
                      <Check className="size-3.5" />
                    </motion.span>
                  ) : state === "active" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : state === "failed" ? (
                    <X className="size-3.5" />
                  ) : (
                    <step.icon className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-xs font-medium", state === "pending" ? "text-muted-foreground" : "text-foreground")}>{step.label}</p>
                  <p className="font-mono text-[10.5px] text-muted-foreground">
                    {state === "done" && dur !== null ? `${dur.toFixed(1)}s` : state === "active" ? "running…" : state === "failed" ? "failed" : "queued"}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Live log — the backend's literal messages */}
      <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          <span className={cn("size-1.5 rounded-full", running ? "animate-pulse-glow bg-info" : status === "complete" ? "bg-success" : "bg-destructive")} />
          Live telemetry
        </p>
        <ol className="space-y-1.5 font-mono text-[11.5px] leading-relaxed">
          <AnimatePresence initial={false}>
            {events.map((ev, i) => {
              const step = STEPS.find((s) => s.key === ev.step)!
              const isLast = i === events.length - 1
              return (
                <motion.li
                  key={`${ev.step}-${ev.at}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-2.5"
                >
                  <span className="w-11 shrink-0 text-right text-muted-foreground/60 tabular-nums">
                    +{startedAt ? ((ev.at - startedAt) / 1000).toFixed(1) : "0.0"}s
                  </span>
                  <span className="w-20 shrink-0 truncate" style={{ color: step.color }}>
                    {ev.step}
                  </span>
                  <span className={cn("min-w-0 flex-1", isLast && running ? "text-foreground" : "text-muted-foreground")}>
                    <LatestMessage text={ev.message} typing={isLast && running} />
                  </span>
                </motion.li>
              )
            })}
          </AnimatePresence>
          {events.length === 0 && running && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Opening the event stream…
            </li>
          )}
        </ol>
      </div>

      {status === "error" && (
        <div className="space-y-3 border-t border-destructive/30 bg-destructive/8 px-4 py-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw /> Try again
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil /> Edit code
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
