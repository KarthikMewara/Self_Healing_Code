import { DatabaseZap, FlaskConical, ScanSearch, WandSparkles, Workflow, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { Panel } from "@/components/app/panel"
import { NumberTicker } from "@/components/fx/number-ticker"
import { BarList } from "@/components/insights/bar-list"
import { DeltaPill } from "@/components/insights/delta-pill"
import { formatDuration } from "@/components/insights/format"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { STAGE_TIMINGS, type PipelineStage } from "@/services/mock/dashboard"
import { pctChange } from "@/services/mock/healing-series"

// Stage identity is the same everywhere on this card: colour + icon + label.
// Order follows the CVD-validated categorical sequence (sky, emerald, violet, amber).
const STAGE_STYLE: Record<PipelineStage, { color: string; icon: LucideIcon }> = {
  retrieval: { color: "var(--chart-1)", icon: DatabaseZap },
  analysis: { color: "var(--chart-3)", icon: ScanSearch },
  generation: { color: "var(--chart-2)", icon: WandSparkles },
  testing: { color: "var(--chart-4)", icon: FlaskConical },
}

const TOTAL = STAGE_TIMINGS.reduce((n, s) => n + s.avg, 0)
const PREV_TOTAL = STAGE_TIMINGS.reduce((n, s) => n + s.prevAvg, 0)
const MAX_P95 = Math.max(...STAGE_TIMINGS.map((s) => s.p95))

function signed(pct: number) {
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`
}

export function PipelineTimings() {
  const [active, setActive] = useState<PipelineStage | null>(null)

  const items = STAGE_TIMINGS.map((s) => {
    const style = STAGE_STYLE[s.stage]
    return {
      key: s.stage,
      label: s.label,
      value: s.avg,
      ghost: s.p95,
      color: style.color,
      icon: (
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `color-mix(in oklch, ${style.color} 15%, transparent)`, color: style.color }}
        >
          <style.icon className="size-3.5" />
        </span>
      ),
      display: (
        <>
          {formatDuration(s.avg)}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">p95 {formatDuration(s.p95)}</span>
        </>
      ),
      tooltip: `${s.detail} · ${signed(pctChange(s.avg, s.prevAvg))} vs the prior 30 days`,
    }
  })

  return (
    <Panel
      title="Pipeline stage timings"
      description="Mean time per stage · last 30 days"
      icon={Workflow}
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col gap-5"
    >
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">End to end, on average</span>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            <NumberTicker value={TOTAL} format={formatDuration} />
          </span>
        </div>
        {/* Proportion strip: each segment grows to its share, with a 2px gap between. */}
        <div
          role="img"
          aria-label={`Share of time per stage: ${STAGE_TIMINGS.map((s) => `${s.label} ${Math.round((s.avg / TOTAL) * 100)}%`).join(", ")}`}
          className="flex gap-[2px]"
        >
          {STAGE_TIMINGS.map((s, i) => (
            <motion.div
              key={s.stage}
              className="min-w-0 basis-0"
              initial={{ flexGrow: 0.0001 }}
              whileInView={{ flexGrow: s.avg }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: EASE_OUT }}
              onHoverStart={() => setActive(s.stage)}
              onHoverEnd={() => setActive(null)}
            >
              <div
                className={cn(
                  "h-2.5 transition-opacity duration-200",
                  i === 0 && "rounded-l-full",
                  i === STAGE_TIMINGS.length - 1 && "rounded-r-full",
                )}
                style={{ background: STAGE_STYLE[s.stage].color, opacity: active && active !== s.stage ? 0.3 : 1 }}
              />
              <span className="mt-1.5 block truncate text-[10px] text-muted-foreground tabular-nums">
                {Math.round((s.avg / TOTAL) * 100)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <BarList items={items} max={MAX_P95} activeKey={active} aria-label="Mean seconds per stage" />

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs">
        <span className="text-muted-foreground">Lighter track = p95</span>
        <DeltaPill value={pctChange(TOTAL, PREV_TOTAL)} positiveIsGood={false} label="vs prior 30 days" />
      </footer>
    </Panel>
  )
}
