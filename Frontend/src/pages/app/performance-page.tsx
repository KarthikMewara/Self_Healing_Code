import { ArchiveRestore, CircleCheck, Gauge, MemoryStick, Network, Timer, Zap } from "lucide-react"
import { AnimatePresence, LayoutGroup } from "motion/react"
import { useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { EmptyState } from "@/components/empty-state"
import { Stagger, StaggerItem } from "@/components/fx/reveal"
import { formatCompact } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { IMPACT, IMPACT_LEVELS } from "@/pages/app/performance/components/impact"
import { InsightCard } from "@/pages/app/performance/components/insight-card"
import { SavingsTile } from "@/pages/app/performance/components/savings-tile"
import { improvementPct, PERF_INSIGHTS, type PerfInsight } from "@/services/mock/performance"
import type { ImpactLevel } from "@/types/domain"

type Status = "open" | "applied" | "dismissed"
type Filter = "all" | ImpactLevel | "applied"

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

const byImpact = (a: PerfInsight, b: PerfInsight) =>
  IMPACT[a.impact].rank - IMPACT[b.impact].rank || improvementPct(b) - improvementPct(a)

export default function PerformancePage() {
  const ready = usePreviewLoad("performance")
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [filter, setFilter] = useState<Filter>("all")

  const statusOf = (id: string): Status => status[id] ?? "open"
  const setOne = (id: string, next: Status) => setStatus((prev) => ({ ...prev, [id]: next }))

  const active = PERF_INSIGHTS.filter((i) => statusOf(i.id) !== "dismissed")
  const applied = active.filter((i) => statusOf(i.id) === "applied")
  const dismissedCount = PERF_INSIGHTS.length - active.length
  const visible = active
    .filter((i) => (filter === "all" ? true : filter === "applied" ? statusOf(i.id) === "applied" : i.impact === filter))
    .sort(byImpact)

  // Summary tiles: projections from everything not dismissed; meters show the applied share.
  const latency = active.filter((i) => i.savings.latency)
  const latencyPct = latency.length ? Math.round(sum(latency.map(improvementPct)) / latency.length) : 0
  const latencyApplied = latency.filter((i) => statusOf(i.id) === "applied").length
  const worst = [...latency].sort((a, b) => b.metric.before - a.metric.before)[0]
  const memory = sum(active.map((i) => i.savings.memoryMb ?? 0))
  const memoryApplied = sum(applied.map((i) => i.savings.memoryMb ?? 0))
  const requests = sum(active.map((i) => i.savings.requestsPerDay ?? 0))
  const requestsApplied = sum(applied.map((i) => i.savings.requestsPerDay ?? 0))

  const apply = (insight: PerfInsight) => {
    setOne(insight.id, "applied")
    toast.success(`Applied: ${insight.title}`, {
      description: `Preview only — in production this opens a draft pull request in ${insight.project}.`,
      action: { label: "Undo", onClick: () => setOne(insight.id, "open") },
    })
  }

  const undo = (insight: PerfInsight) => {
    setOne(insight.id, "open")
    toast("Suggestion back to open", { description: insight.title })
  }

  const dismiss = (insight: PerfInsight) => {
    setOne(insight.id, "dismissed")
    toast("Suggestion dismissed", {
      description: insight.title,
      action: { label: "Undo", onClick: () => setOne(insight.id, "open") },
    })
  }

  const openHigh = active.filter((i) => i.impact === "high" && statusOf(i.id) === "open")

  const applyAllHigh = () => {
    if (!openHigh.length) return
    const ids = openHigh.map((i) => i.id)
    setStatus((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, "applied" as const])) }))
    toast.success(`Applied ${ids.length} high-impact ${ids.length === 1 ? "suggestion" : "suggestions"}`, {
      description: "Preview only — each would open its own draft pull request.",
      action: {
        label: "Undo",
        onClick: () => setStatus((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, "open" as const])) })),
      },
    })
  }

  const restoreDismissed = () => {
    setStatus((prev) => Object.fromEntries(Object.entries(prev).filter(([, s]) => s !== "dismissed")))
    toast.success(`Restored ${dismissedCount} dismissed ${dismissedCount === 1 ? "suggestion" : "suggestions"}`)
  }

  const count = (level: ImpactLevel) => active.filter((i) => i.impact === level).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Bottlenecks found in sampled traces and profiles, each with a projected impact and a ready patch."
        icon={Gauge}
        tone="warning"
        badge={<PreviewBadge />}
        actions={
          <Button onClick={applyAllHigh} disabled={!ready || !openHigh.length}>
            <Zap /> Apply all high-impact
            {openHigh.length > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] tabular-nums">{openHigh.length}</span>
            )}
          </Button>
        }
      />

      {!ready ? (
        <PageSkeleton layout="cards" />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <Stagger immediate className="grid gap-4 md:grid-cols-3">
            <StaggerItem>
              <SavingsTile
                label="Projected p95 latency improvement"
                icon={Timer}
                color="var(--chart-1)"
                value={latencyPct}
                prefix={latencyPct ? "−" : ""}
                suffix="%"
                caption={
                  worst
                    ? `avg across ${latency.length} endpoints · worst ${worst.metric.before}ms → ${worst.metric.after}ms`
                    : "No latency suggestions open"
                }
                applied={latency.length ? latencyApplied / latency.length : 0}
                appliedLabel={`${latencyApplied} of ${latency.length} endpoints`}
              />
            </StaggerItem>
            <StaggerItem>
              <SavingsTile
                label="Memory saved"
                icon={MemoryStick}
                color="var(--chart-2)"
                value={memory}
                suffix=" MB"
                caption="resident memory, summed across services"
                applied={memory ? memoryApplied / memory : 0}
                appliedLabel={`${memoryApplied} of ${memory} MB`}
              />
            </StaggerItem>
            <StaggerItem>
              <SavingsTile
                label="Requests saved"
                icon={Network}
                color="var(--chart-3)"
                value={requests}
                format={(v) => `${formatCompact(v)}/day`}
                caption="duplicate and polling requests avoided"
                applied={requests ? requestsApplied / requests : 0}
                appliedLabel={`${formatCompact(requestsApplied)} of ${formatCompact(requests)}`}
              />
            </StaggerItem>
          </Stagger>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1 py-0.5">
              <SegmentedControl<Filter>
                value={filter}
                onChange={setFilter}
                aria-label="Filter by impact"
                options={[
                  { value: "all", label: "All", count: active.length },
                  ...IMPACT_LEVELS.map((level) => ({ value: level, label: IMPACT[level].label, count: count(level) })),
                  { value: "applied", label: "Applied", icon: <CircleCheck />, count: applied.length },
                ]}
              />
            </div>
            {dismissedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={restoreDismissed}>
                <ArchiveRestore /> Restore {dismissedCount} dismissed
              </Button>
            )}
          </div>

          {visible.length > 0 ? (
            <LayoutGroup>
              <div className="relative grid items-start gap-4 lg:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {visible.map((insight, i) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      index={i}
                      applied={statusOf(insight.id) === "applied"}
                      onApply={() => apply(insight)}
                      onUndo={() => undo(insight)}
                      onDismiss={() => dismiss(insight)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          ) : (
            <EmptyState
              icon={filter === "applied" ? Zap : CircleCheck}
              title={filter === "applied" ? "Nothing applied yet" : "No suggestions here"}
              description={
                filter === "applied"
                  ? "Apply a suggestion and it shows up here, counted in the savings above."
                  : "Every suggestion at this impact level has been dismissed."
              }
              actionLabel="Show all suggestions"
              onAction={() => setFilter("all")}
              secondaryLabel={dismissedCount ? "Restore dismissed" : undefined}
              onSecondary={dismissedCount ? restoreDismissed : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}
