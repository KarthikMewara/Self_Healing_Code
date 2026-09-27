import { Check, FlaskConical, ScanSearch, Search, WandSparkles, X, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { formatDuration } from "@/components/history/format"
import { STEP_LABELS, type DetailStage } from "@/components/history/session-models"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { StageState } from "@/services/mock/history"
import type { HealStep } from "@/types/contract"

const STEP_ICONS: Record<HealStep, LucideIcon> = {
  retrieval: Search,
  analysis: ScanSearch,
  generation: WandSparkles,
  testing: FlaskConical,
}

const NODE: Record<StageState, string> = {
  done: "bg-success/10 text-success ring-success/30",
  failed: "bg-destructive/10 text-destructive ring-destructive/35",
  running: "bg-primary/10 text-primary ring-primary/35",
  pending: "bg-muted text-muted-foreground ring-border",
}

const CONNECTOR: Record<StageState, string> = {
  done: "bg-success/40",
  failed: "bg-destructive/40",
  running: "bg-primary/40",
  pending: "bg-border",
}

const STATE_LABEL: Record<StageState, string> = {
  done: "done",
  failed: "failed",
  running: "running",
  pending: "waiting",
}

/** Trace-style waterfall: each stage's share of the pipeline's wall time. */
function Waterfall({ stages }: { stages: DetailStage[] }) {
  const timed = stages.filter((s) => s.durationSec !== undefined || s.state === "running")
  const total = stages.reduce((sum, s) => sum + (s.durationSec ?? 0), 0)
  if (!timed.length || total <= 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 gap-0.5" role="img" aria-label="Time spent in each pipeline stage">
        {timed.map((stage, i) => {
          const grow = stage.durationSec ?? Math.max(total * 0.3, 1)
          return (
            <Tooltip key={stage.step}>
              <TooltipTrigger
                render={
                  <motion.span
                    tabIndex={0}
                    aria-label={`${STEP_LABELS[stage.step]}: ${stage.durationSec !== undefined ? formatDuration(stage.durationSec) : "running"}`}
                    className={cn(
                      "relative block h-full min-w-1.5 origin-left overflow-hidden rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      stage.state === "failed" ? "bg-destructive" : stage.state === "running" ? "bg-primary/35" : "bg-primary",
                      stage.state === "done" && i % 2 === 1 && "bg-primary/70",
                    )}
                    style={{ flexGrow: grow, flexBasis: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: EASE_OUT }}
                  />
                }
              >
                {stage.state === "running" && (
                  <span className="animate-shimmer-sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {STEP_LABELS[stage.step]} · {stage.durationSec !== undefined ? formatDuration(stage.durationSec) : "running"}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>0s</span>
        <span>{formatDuration(total)}</span>
      </div>
    </div>
  )
}

/** The four healing stages with state, timing and the telemetry message. */
export function PipelineStages({ stages }: { stages: DetailStage[] }) {
  return (
    <div className="space-y-4">
      <Waterfall stages={stages} />
      <ol className="relative">
        {stages.map((stage, i) => {
          const Icon = STEP_ICONS[stage.step]
          const last = i === stages.length - 1
          return (
            <motion.li
              key={stage.step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.09, ease: EASE_OUT }}
              className={cn("relative flex gap-3", !last && "pb-5")}
            >
              {!last && (
                <motion.span
                  aria-hidden
                  className={cn("absolute top-9 bottom-1 left-[15px] w-px origin-top", CONNECTOR[stage.state])}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.09, ease: EASE_OUT }}
                />
              )}
              <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full ring-1", NODE[stage.state])}>
                {stage.state === "running" && (
                  <span aria-hidden className="absolute -inset-px animate-spin rounded-full border-2 border-transparent border-t-primary" />
                )}
                <Icon className="size-3.5" />
                {(stage.state === "done" || stage.state === "failed") && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-popover",
                      stage.state === "done" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground",
                    )}
                  >
                    {stage.state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn("text-sm font-medium", stage.state === "pending" ? "text-muted-foreground" : "text-foreground")}>
                    {STEP_LABELS[stage.step]}
                    <span className="sr-only"> — {STATE_LABEL[stage.state]}</span>
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      stage.state === "failed" ? "text-destructive" : stage.state === "running" ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {stage.durationSec !== undefined
                      ? formatDuration(stage.durationSec)
                      : stage.state === "running"
                        ? "Running…"
                        : stage.state === "pending"
                          ? "Waiting"
                          : ""}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{stage.message}</p>
                {stage.state === "running" && (
                  <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <span className="animate-shimmer-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
                  </div>
                )}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
