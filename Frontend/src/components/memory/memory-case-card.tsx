import { ArrowUpRight, Repeat } from "lucide-react"
import { Link } from "react-router-dom"

import { ProgressRing } from "@/components/app/progress-ring"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { formatIsoDay } from "@/components/history/format"
import { LanguageLabel } from "@/components/projects/language-chip"
import { cn } from "@/lib/utils"
import type { MemoryRecord } from "@/services/mock/memory"

interface MemoryCaseCardProps {
  record: MemoryRecord
  /** Hovered here or on its graph node. */
  highlighted: boolean
  selected: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

/** A remembered case. The title is a stretched button; "Open session" sits above it. */
export function MemoryCaseCard({ record, highlighted, selected, onHover, onSelect }: MemoryCaseCardProps) {
  return (
    <SpotlightCard
      glow="var(--info)"
      onPointerEnter={() => onHover(record.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(record.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover(null)
      }}
      className={cn(
        "group/case flex h-full flex-col p-4 transition-all duration-300 hover:-translate-y-0.5",
        "has-[button[data-card-action]:focus-visible]:ring-2 has-[button[data-card-action]:focus-visible]:ring-ring/60",
        (highlighted || selected) &&
          "-translate-y-0.5 border-info/45 shadow-[0_0_0_1px_color-mix(in_oklch,var(--info)_35%,transparent),0_18px_40px_-24px_var(--info)]",
      )}
    >
      <div className="flex items-start gap-3">
        <ProgressRing value={record.similarity} size={46} stroke={4} tone="info">
          <span className="text-[11px] font-semibold text-foreground tabular-nums">{record.similarity}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-snug font-medium text-foreground">
            <button
              type="button"
              data-card-action
              onClick={() => onSelect(record.id)}
              className="line-clamp-2 text-left outline-none after:absolute after:inset-0 after:content-['']"
            >
              {record.title}
            </button>
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <LanguageLabel language={record.language} />
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/85">{record.errorType}</code>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{record.fixSummary}</p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">Resolved {formatIsoDay(record.resolvedAt)}</span>
          <span className="inline-flex shrink-0 items-center gap-1" title={`Recalled ${record.recalls} times`}>
            <Repeat className="size-3" />
            <span className="tabular-nums">{record.recalls}</span>
          </span>
        </span>
        <Link
          to={`/history?session=${record.sessionId}`}
          className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 font-medium text-foreground/80 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Open session
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </SpotlightCard>
  )
}
