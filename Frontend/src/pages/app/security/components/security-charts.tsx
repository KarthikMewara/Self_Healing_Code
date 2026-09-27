import { ChartPie, TrendingDown } from "lucide-react"
import { useId, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Panel } from "@/components/app/panel"
import { useMotionPreference } from "@/components/motion-preference"
import { DeltaPill } from "@/components/insights/delta-pill"
import { DonutChart } from "@/components/insights/donut-chart"
import { svgSafeId } from "@/components/insights/hooks"
import { LegendToggle } from "@/components/insights/legend-toggle"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { SEVERITIES, type TrendPoint } from "@/services/mock/security"
import type { Severity } from "@/types/domain"

import { SEVERITY } from "./severity"

interface SeverityDonutProps {
  counts: Record<Severity, number>
  active: Severity | null
  onSelect: (severity: Severity | null) => void
  replayKey: number
}

export function SeverityDonut({ counts, active, onSelect, replayKey }: SeverityDonutProps) {
  const total = SEVERITIES.reduce((n, s) => n + counts[s], 0)
  const data = SEVERITIES.map((sev) => ({ key: sev, label: SEVERITY[sev].label, value: counts[sev], color: SEVERITY[sev].color }))

  return (
    <Panel title="By severity" description="Open findings · click a slice to filter" icon={ChartPie} className="h-full">
      <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
        <DonutChart
          data={data}
          centerLabel="open findings"
          activeKey={active}
          onSliceClick={(key) => onSelect(active === key ? null : (key as Severity))}
          replayKey={replayKey}
          className="max-w-[190px]"
        />
        <ul className="w-full min-w-0 flex-1 space-y-1">
          {SEVERITIES.map((sev) => {
            const s = SEVERITY[sev]
            const on = active === sev
            return (
              <li key={sev}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(on ? null : sev)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-[background-color,opacity] outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                    on && "bg-muted/70",
                    active && !on && "opacity-50",
                  )}
                >
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                  <span className="flex-1 text-foreground">{s.label}</span>
                  <span className="font-medium text-foreground tabular-nums">{counts[sev]}</span>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {total ? Math.round((counts[sev] / total) * 100) : 0}%
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )
}

const trendConfig = Object.fromEntries(
  SEVERITIES.map((sev) => [sev, { label: SEVERITY[sev].label, color: SEVERITY[sev].color }]),
) satisfies ChartConfig

interface FindingsTrendProps {
  data: TrendPoint[]
}

export function FindingsTrend({ data }: FindingsTrendProps) {
  const { reduced } = useMotionPreference()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const gid = svgSafeId(useId())
  const sum = (p: TrendPoint) => p.critical + p.high + p.medium + p.low
  const first = sum(data[0])
  const last = sum(data[data.length - 1])
  const change = first ? Math.round(((last - first) / first) * 100) : 0

  return (
    <Panel
      title="Findings over time"
      description="Open findings at the end of each week, stacked by severity"
      icon={TrendingDown}
      className="h-full min-w-0"
      action={<DeltaPill value={change} positiveIsGood={false} label={`since ${data[0].week}`} />}
    >
      <LegendToggle
        className="mb-2 -ml-2"
        hidden={hidden}
        onHiddenChange={setHidden}
        aria-label="Toggle severities"
        items={SEVERITIES.map((sev) => ({
          key: sev,
          label: SEVERITY[sev].label,
          color: SEVERITY[sev].color,
          value: data[data.length - 1][sev],
        }))}
      />
      <ChartContainer config={trendConfig} className="aspect-auto h-56 w-full">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {SEVERITIES.map((sev) => (
              <linearGradient key={sev} id={`${gid}-${sev}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${sev})`} stopOpacity={0.45} />
                <stop offset="100%" stopColor={`var(--color-${sev})`} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent />} />
          {SEVERITIES.map((sev) => (
            <Area
              key={sev}
              dataKey={sev}
              stackId="open"
              type="monotone"
              stroke={`var(--color-${sev})`}
              strokeWidth={1.5}
              fill={`url(#${gid}-${sev})`}
              hide={hidden.has(sev)}
              isAnimationActive={!reduced}
              animationDuration={900}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </Panel>
  )
}
