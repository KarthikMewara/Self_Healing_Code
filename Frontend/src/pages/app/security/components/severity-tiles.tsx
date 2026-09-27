import { SpotlightCard } from "@/components/fx/spotlight-card"
import { NumberTicker } from "@/components/fx/number-ticker"
import { cn } from "@/lib/utils"
import { SEVERITIES } from "@/services/mock/security"
import type { Severity } from "@/types/domain"

import { SEVERITY, tint } from "./severity"

interface SeverityTilesProps {
  counts: Record<Severity, number>
  /** Findings of this severity detected in the last 7 days. */
  recent: Record<Severity, number>
  active: Severity | null
  onSelect: (severity: Severity | null) => void
}

/** One tile per severity; clicking a tile filters the findings list (click again to clear). */
export function SeverityTiles({ counts, recent, active, onSelect }: SeverityTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Filter findings by severity">
      {SEVERITIES.map((sev) => {
        const s = SEVERITY[sev]
        const on = active === sev
        const toggle = () => onSelect(on ? null : sev)
        return (
          <SpotlightCard
            key={sev}
            glow={s.color}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${s.label}: ${counts[sev]} open. ${on ? "Clear filter" : "Show only these"}`}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                toggle()
              }
            }}
            className={cn(
              "cursor-pointer p-4 transition-[translate,box-shadow] duration-300 outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
            style={on ? { boxShadow: `0 0 0 1.5px ${s.color}, 0 14px 34px -16px ${s.color}` } : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  <NumberTicker value={counts[sev]} duration={1} />
                </p>
              </div>
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: tint(s.color), color: s.color }}
              >
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {recent[sev] ? `${recent[sev]} new this week · ` : ""}
              {s.sla}
            </p>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 transition-opacity duration-300"
              style={{ background: s.color, opacity: on ? 1 : 0.35 }}
            />
          </SpotlightCard>
        )
      })}
    </div>
  )
}
