import { Code2, Cpu, Database, MemoryStick, Network, Undo2, X, Zap, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useInView } from "motion/react"
import { useRef, useState, type Ref } from "react"

import { DiffViewer } from "@/components/code/diff-viewer"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { improvementPct, type PerfCategory, type PerfInsight } from "@/services/mock/performance"

import { IMPACT } from "./impact"

const CATEGORY_ICON: Record<PerfCategory, LucideIcon> = {
  Database,
  Memory: MemoryStick,
  Network,
  CPU: Cpu,
}

function formatMetric(value: number, unit: string) {
  return `${value.toLocaleString()} ${unit}`
}

interface InsightCardProps {
  insight: PerfInsight
  applied: boolean
  index: number
  onApply: () => void
  onUndo: () => void
  onDismiss: () => void
  /** Attached by AnimatePresence (popLayout) to measure the card as it leaves. */
  ref?: Ref<HTMLDivElement>
}

export function InsightCard({ ref, insight, applied, index, onApply, onUndo, onDismiss }: InsightCardProps) {
  const [showPatch, setShowPatch] = useState(false)
  const impact = IMPACT[insight.impact]
  const Icon = CATEGORY_ICON[insight.category]

  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 6) * 0.05 }}
      className="min-w-0"
    >
      <SpotlightCard
        glow={applied ? "var(--success)" : impact.color}
        className={cn(
          "flex h-full flex-col gap-4 p-4 transition-[border-color,box-shadow] duration-500",
          applied &&
            "border-success/40 shadow-[0_0_0_1px_color-mix(in_oklch,var(--success)_28%,transparent),0_20px_44px_-28px_var(--success)]",
        )}
      >
        <header className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug font-semibold text-foreground">{insight.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{insight.project}</span> · {insight.category}
            </p>
          </div>
          <StatusBadge tone={impact.tone}>{impact.label} impact</StatusBadge>
        </header>

        <p className="text-sm text-muted-foreground">{insight.description}</p>

        <BeforeAfter insight={insight} applied={applied} />

        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Effort</dt>
            <dd className="text-foreground">{insight.effort}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Confidence</dt>
            <dd className="text-foreground tabular-nums">{insight.confidence}%</dd>
          </div>
          <div className="flex min-w-0 basis-full gap-1.5">
            <dt className="shrink-0 text-muted-foreground">Evidence</dt>
            <dd className="text-foreground/85">{insight.evidence}</dd>
          </div>
        </dl>

        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <AnimatePresence mode="wait" initial={false}>
            {applied ? (
              <motion.div
                key="applied"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2"
              >
                <AppliedMark />
                <Button size="sm" variant="ghost" onClick={onUndo}>
                  <Undo2 /> Undo
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1.5"
              >
                <Button size="sm" onClick={onApply}>
                  <Zap /> Apply suggestion
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Dismiss suggestion"
                        onClick={onDismiss}
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      />
                    }
                  >
                    <X className="size-3.5" /> Dismiss
                  </TooltipTrigger>
                  <TooltipContent>Hide this suggestion (you can undo)</TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            aria-expanded={showPatch}
            onClick={() => setShowPatch((v) => !v)}
          >
            <Code2 /> {showPatch ? "Hide patch" : "View patch"}
          </Button>
        </footer>

        <AnimatePresence initial={false}>
          {showPatch && (
            <motion.div
              key="patch"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
              className="-mt-1 overflow-hidden"
            >
              <DiffViewer
                original={insight.patch.before}
                updated={insight.patch.after}
                language={insight.patch.language}
                filename={insight.patch.file}
                mode="unified"
                maxHeight={300}
                animate
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SpotlightCard>
    </motion.div>
  )
}

/** Before vs projected-after bars, drawn in when the card scrolls into view. */
function BeforeAfter({ insight, applied }: { insight: PerfInsight; applied: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const { metric } = insight
  const afterWidth = metric.before ? (metric.after / metric.before) * 100 : 0

  const rows = [
    {
      label: "Before",
      value: metric.before,
      width: 100,
      color: "color-mix(in oklch, var(--muted-foreground) 55%, transparent)",
      delay: 0,
    },
    {
      label: applied ? "After" : "Projected",
      value: metric.after,
      width: afterWidth,
      color: "var(--success)",
      delay: 0.35,
    },
  ]

  return (
    <div ref={ref} className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-foreground" title={metric.label}>
          {metric.label}
        </p>
        <motion.span
          className="shrink-0 rounded-md bg-success/12 px-1.5 py-0.5 text-xs font-semibold text-success tabular-nums"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.8, type: "spring", stiffness: 420, damping: 22 }}
        >
          −{improvementPct(insight)}%
        </motion.span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[68px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="block h-2 overflow-hidden rounded-full bg-muted">
            <motion.span
              className="block h-full rounded-full"
              style={{
                background: row.color,
                boxShadow: row.color === "var(--success)" ? "0 0 10px -2px var(--success)" : undefined,
              }}
              initial={{ width: 0 }}
              animate={{ width: inView ? `${Math.max(2, row.width)}%` : 0 }}
              transition={{ duration: 0.9, delay: row.delay, ease: EASE_OUT }}
            />
          </span>
          <span className="min-w-16 text-right font-mono text-foreground tabular-nums">
            {formatMetric(row.value, metric.unit)}
          </span>
        </div>
      ))}
    </div>
  )
}

function AppliedMark() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
      <span className="relative flex size-6 items-center justify-center rounded-full bg-success/15 ring-1 ring-success/30">
        <span
          aria-hidden
          className="animate-ping-soft absolute inset-0 rounded-full bg-success/30"
          style={{ animationIterationCount: 1 }}
        />
        <svg viewBox="0 0 24 24" className="relative size-4" aria-hidden>
          <motion.path
            d="M5 12.5l4.2 4.2L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT }}
          />
        </svg>
      </span>
      Applied
    </span>
  )
}
