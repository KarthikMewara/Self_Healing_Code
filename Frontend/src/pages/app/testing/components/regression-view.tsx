import { LoaderCircle, RotateCcw, ShieldCheck, WandSparkles } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useState, type Ref } from "react"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { ProgressRing } from "@/components/app/progress-ring"
import { SegmentedControl } from "@/components/app/segmented-control"
import { EmptyState } from "@/components/empty-state"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useNow } from "@/components/insights/hooks"
import { formatRelative, formatStamp } from "@/components/insights/format"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { EASE_OUT, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

import type { RegressionApi, RegressionRow, RegressionRowStatus } from "./use-test-runner"

type Filter = "all" | "failing" | "passing"

const STATUS: Record<RegressionRowStatus, { tone: "success" | "danger" | "pending" | "neutral"; label: string }> = {
  passed: { tone: "success", label: "Passing" },
  failed: { tone: "danger", label: "Failing" },
  running: { tone: "pending", label: "Running" },
  queued: { tone: "neutral", label: "Queued" },
}

interface RegressionViewProps {
  regression: RegressionApi
  onHeal: (exampleId: string, testName: string) => void
}

export function RegressionView({ regression, onHeal }: RegressionViewProps) {
  const { rows, busy, rerun } = regression
  const [filter, setFilter] = useState<Filter>("all")
  const [batch, setBatch] = useState<string[] | null>(null)
  const now = useNow(30_000)

  const failing = rows.filter((r) => r.lastStatus === "failed").length
  const passing = rows.length - failing
  const visible = rows.filter(
    (r) => filter === "all" || (filter === "failing" ? r.lastStatus === "failed" : r.lastStatus === "passed"),
  )
  const batchDone = batch ? rows.filter((r) => batch.includes(r.id) && r.status !== "queued" && r.status !== "running").length : 0

  const rerunAll = () => {
    const ids = rows.map((r) => r.id)
    setBatch(ids)
    rerun(ids, (results) => {
      setBatch(null)
      const failed = results.filter((r) => r.outcome === "failed").length
      const message = `${results.length} regression tests re-run: ${results.length - failed} passed, ${failed} failed`
      if (failed) {
        toast.error(message, { action: { label: "Show failing", onClick: () => setFilter("failing") } })
      } else {
        toast.success(message, { description: "Every healed bug is still fixed." })
      }
    })
  }

  const rerunOne = (row: RegressionRow) => {
    rerun([row.id], ([result]) => {
      if (result?.outcome === "passed") {
        toast.success(`Passing: ${row.name}`, { description: row.project })
      } else {
        toast.error(`Still failing: ${row.name}`, {
          description: `Guards ${row.guards}`,
          action: row.exampleId
            ? { label: "Heal with AI", onClick: () => onHeal(row.exampleId as string, row.name) }
            : undefined,
        })
      }
    })
  }

  return (
    <Panel
      title="Regression tests"
      description="Every healed bug gets a test that replays it — a failure means a fixed bug came back"
      icon={ShieldCheck}
      action={
        <Button size="sm" onClick={rerunAll} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <RotateCcw />} Re-run all
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1 py-0.5">
          <SegmentedControl<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            aria-label="Filter regression tests"
            options={[
              { value: "all", label: "All", count: rows.length },
              { value: "failing", label: "Failing", count: failing },
              { value: "passing", label: "Passing", count: passing },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/25 p-3">
          <ProgressRing
            value={(passing / Math.max(1, rows.length)) * 100}
            size={56}
            stroke={5}
            tone={failing ? "warning" : "success"}
            animateOnView={false}
          >
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {Math.round((passing / Math.max(1, rows.length)) * 100)}%
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              <NumberTicker value={passing} /> of {rows.length} regression tests passing
            </p>
            <p className="text-xs text-muted-foreground">
              {failing
                ? `${failing} guarded ${failing === 1 ? "bug is" : "bugs are"} back or not yet healed.`
                : "All guarded bugs are still fixed."}
            </p>
          </div>
          <AnimatePresence>
            {batch && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex min-w-0 items-center gap-2 overflow-hidden"
              >
                <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  Re-running {batchDone}/{batch.length}
                </span>
                <span className="relative h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-info"
                    animate={{ width: `${(batchDone / batch.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                  />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <LayoutGroup>
          <ul className="relative space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((row) => (
                <RegressionItem
                  key={row.id}
                  row={row}
                  now={now}
                  onRerun={() => rerunOne(row)}
                  onHeal={row.exampleId ? () => onHeal(row.exampleId as string, row.name) : undefined}
                />
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>

        {visible.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title={filter === "failing" ? "No failing regression tests" : "No passing regression tests"}
            description={
              filter === "failing"
                ? "Every bug these tests guard is still fixed."
                : "Re-run the suite, or heal the failing ones first."
            }
            actionLabel="Show all tests"
            onAction={() => setFilter("all")}
            className="py-10"
          />
        )}
      </div>
    </Panel>
  )
}

interface RegressionItemProps {
  row: RegressionRow
  now: number
  onRerun: () => void
  onHeal?: () => void
  /** Attached by AnimatePresence (popLayout) to measure the row as it leaves. */
  ref?: Ref<HTMLLIElement>
}

function RegressionItem({ ref, row, now, onRerun, onHeal }: RegressionItemProps) {
  const status = STATUS[row.status]
  const working = row.status === "running" || row.status === "queued"
  const fails = row.trail.filter((t) => t.status === "failed").length

  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="relative overflow-hidden rounded-xl border border-border bg-card/40 p-3 transition-colors hover:bg-card/70"
    >
      {row.attempts > 0 && (
        <motion.span
          key={row.attempts}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            row.lastStatus === "failed" ? "bg-destructive/12" : "bg-success/12",
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        />
      )}
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <StatusBadge tone={status.tone} className="w-[78px] justify-center">
          {status.label}
        </StatusBadge>

        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate text-sm font-medium text-foreground" title={row.name}>
            {row.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span
              className="size-2 rounded-full"
              style={{ background: LANGUAGE_COLORS[row.language] }}
              title={LANGUAGE_LABELS[row.language]}
            />
            <span className="font-mono">{row.project}</span>
            <span aria-hidden>·</span>
            <span className="truncate">guards {row.guards}</span>
          </p>
        </div>

        <div
          role="img"
          aria-label={`Last ${row.trail.length} runs: ${row.trail.length - fails} passed, ${fails} failed`}
          className="relative flex items-center gap-[3px]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {row.trail.map((t) => (
              <motion.span
                key={t.key}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={SPRING}
                className={cn("size-2.5 rounded-[3px]", t.status === "passed" ? "bg-success/75" : "bg-destructive/85")}
              />
            ))}
          </AnimatePresence>
        </div>

        <span className="w-20 text-xs text-muted-foreground">
          {row.ranAt ? formatRelative(row.ranAt, now) : formatStamp(row.lastRun)}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {onHeal && row.lastStatus === "failed" && !working && (
            <Button size="sm" variant="ghost" onClick={onHeal}>
              <WandSparkles /> Heal
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onRerun} disabled={working} className="min-w-[92px]">
            {working ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
            {row.status === "queued" ? "Queued" : working ? "Running" : "Re-run"}
          </Button>
        </div>
      </div>
    </motion.li>
  )
}
