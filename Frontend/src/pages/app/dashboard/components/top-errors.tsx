import { ArrowUpRight, Bug, Timer, Zap } from "lucide-react"
import { Link } from "react-router-dom"

import { Panel } from "@/components/app/panel"
import { NumberTicker } from "@/components/fx/number-ticker"
import { BarList, type BarListItem } from "@/components/insights/bar-list"
import { formatDuration } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { TOP_ERRORS } from "@/services/mock/dashboard"

const { items: ERRORS, other: OTHER, total: TOTAL, distinct: DISTINCT } = TOP_ERRORS

const FASTEST = [...ERRORS].sort((a, b) => a.avgSeconds - b.avgSeconds)[0]
const SLOWEST = [...ERRORS].sort((a, b) => b.avgSeconds - a.avgSeconds)[0]

function share(count: number) {
  return Math.round((count / TOTAL) * 100)
}

export function TopErrors() {
  const items: BarListItem[] = [
    ...ERRORS.map((e) => ({
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
        <span role="img" className="flex items-center gap-1" aria-label={e.languages.map((l) => LANGUAGE_LABELS[l]).join(", ")}>
          {e.languages.slice(0, 3).map((lang) => (
            <span key={lang} className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
          ))}
        </span>
      ),
      tooltip: `${e.count} heals · avg ${formatDuration(e.avgSeconds)} to fix · ${e.languages.map((l) => LANGUAGE_LABELS[l]).join(", ")}`,
    })),
    {
      key: "other",
      label: "Other",
      value: OTHER,
      color: "var(--muted-foreground)",
      display: (
        <>
          {OTHER}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{share(OTHER)}%</span>
        </>
      ),
      tooltip: `${OTHER} heals across less common error types`,
    },
  ]

  return (
    <Panel
      title="Top error types"
      description="Resolved heals by exception · last 30 days"
      icon={Bug}
      action={
        <Button variant="ghost" size="sm" render={<Link to="/analytics" />}>
          Analytics <ArrowUpRight />
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <BarList items={items} max={ERRORS[0]?.count} aria-label="Resolved heals per error type" />

        <div className="grid content-start gap-3 sm:grid-cols-3 md:grid-cols-1">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Heals in 30 days</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              <NumberTicker value={TOTAL} />
            </p>
            <p className="text-xs text-muted-foreground">across {DISTINCT} distinct error types</p>
          </div>
          {FASTEST && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="size-3.5 text-success" /> Fastest to heal
              </p>
              <p className="mt-1 truncate font-mono text-sm text-foreground">{FASTEST.type}</p>
              <p className="text-xs text-muted-foreground">avg {formatDuration(FASTEST.avgSeconds)}</p>
            </div>
          )}
          {SLOWEST && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="size-3.5 text-warning" /> Slowest to heal
              </p>
              <p className="mt-1 truncate font-mono text-sm text-foreground">{SLOWEST.type}</p>
              <p className="text-xs text-muted-foreground">avg {formatDuration(SLOWEST.avgSeconds)}</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
