import { Bug, ChartPie, Lightbulb, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"

import { Panel } from "@/components/app/panel"
import { BarList, type BarListItem } from "@/components/insights/bar-list"
import { DonutChart } from "@/components/insights/donut-chart"
import { formatDuration } from "@/components/insights/format"
import { LegendToggle } from "@/components/insights/legend-toggle"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { RANGES, type AnalyticsData } from "@/services/mock/analytics"

export function LanguageBreakdown({ data }: { data: AnalyticsData }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const total = data.languages.reduce((n, l) => n + l.value, 0)
  const shown = data.languages.filter((l) => !hidden.has(l.key)).reduce((n, l) => n + l.value, 0)

  return (
    <Panel title="Language breakdown" description="Resolved heals · click a language to hide it" icon={ChartPie} className="h-full">
      <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
        <DonutChart
          data={data.languages}
          hidden={hidden}
          centerLabel={hidden.size ? `of ${total} heals shown` : "heals"}
          centerValue={shown}
          className="max-w-[200px]"
        />
        <LegendToggle
          className="w-full flex-col items-stretch"
          aria-label="Toggle languages"
          hidden={hidden}
          onHiddenChange={setHidden}
          items={data.languages.map((l) => ({
            key: l.key,
            label: l.label,
            color: l.color,
            value: `${l.value} · ${total ? Math.round((l.value / total) * 100) : 0}%`,
          }))}
        />
      </div>
    </Panel>
  )
}

export function ErrorBreakdown({ data }: { data: AnalyticsData }) {
  const { items, other, total } = data.errors
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  const rows: BarListItem[] = [
    ...items.map((e) => ({
      key: e.type,
      label: <span className="font-mono text-[13px]">{e.type}</span>,
      value: e.count,
      display: (
        <>
          {e.count}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{share(e.count)}%</span>
        </>
      ),
      meta: (
        <span role="img" aria-label={e.languages.map((l) => LANGUAGE_LABELS[l]).join(", ")} className="flex gap-1">
          {e.languages.slice(0, 3).map((lang) => (
            <span key={lang} className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
          ))}
        </span>
      ),
      tooltip: `${e.count} heals · avg ${formatDuration(e.avgSeconds)} to fix · ${e.languages.map((l) => LANGUAGE_LABELS[l]).join(", ")}`,
    })),
    ...(other
      ? [
          {
            key: "other",
            label: "Other",
            value: other,
            color: "var(--muted-foreground)",
            display: (
              <>
                {other}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{share(other)}%</span>
              </>
            ),
            tooltip: `${other} heals across less common error types`,
          },
        ]
      : []),
  ]

  return (
    <Panel title="Error types" description="Resolved heals by exception" icon={Bug} className="h-full min-w-0">
      <BarList items={rows} max={items[0]?.count} aria-label="Resolved heals per error type" />
    </Panel>
  )
}

export function Highlights({ data }: { data: AnalyticsData }) {
  const range = RANGES.find((r) => r.value === data.range)
  const top = data.errors.items[0]
  const topLang = [...data.languages].sort((a, b) => b.value - a.value)[0]
  const { deltas, current } = data
  const up = (n: number) => (n >= 0 ? `up ${n}%` : `down ${Math.abs(n)}%`)

  const items = [
    {
      icon: deltas.successRate >= 0 ? TrendingUp : TrendingDown,
      tone: deltas.successRate >= 0 ? "text-success" : "text-destructive",
      text: `Fix success is ${up(deltas.successRate)} on the previous ${range?.noun}, at ${current.successRate.toFixed(1)}%.`,
    },
    {
      icon: deltas.avgSeconds <= 0 ? TrendingDown : TrendingUp,
      tone: deltas.avgSeconds <= 0 ? "text-success" : "text-warning",
      text: `Time to a tested fix is ${up(deltas.avgSeconds)}, now ${formatDuration(current.avgSeconds)} on average.`,
    },
    ...(top
      ? [
          {
            icon: Bug,
            tone: "text-primary",
            text: `${top.type} is the most-healed exception: ${top.count} of ${data.errors.total} heals.`,
          },
        ]
      : []),
    ...(topLang?.value
      ? [
          {
            icon: Lightbulb,
            tone: "text-info",
            text: `${topLang.label} leads with ${Math.round((topLang.value / Math.max(1, current.fixed)) * 100)}% of fixes (${topLang.value} of ${current.fixed}).`,
          },
        ]
      : []),
  ]

  return (
    <Panel title="Highlights" description={`What changed in the last ${range?.noun}`} icon={Lightbulb} className="h-full">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.text} className="flex gap-2.5 text-sm">
            <item.icon className={`mt-0.5 size-4 shrink-0 ${item.tone}`} />
            <span className="text-muted-foreground">{item.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
