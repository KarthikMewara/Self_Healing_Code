import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Sparkline } from "@/components/app/sparkline"
import { NumberTicker } from "@/components/fx/number-ticker"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { cn } from "@/lib/utils"

type Tone = "primary" | "info" | "success" | "warning" | "danger"

const TONE: Record<Tone, { chip: string; color: string }> = {
  primary: { chip: "bg-primary/12 text-primary ring-primary/20", color: "var(--primary)" },
  info: { chip: "bg-info/12 text-info ring-info/20", color: "var(--info)" },
  success: { chip: "bg-success/12 text-success ring-success/20", color: "var(--success)" },
  warning: { chip: "bg-warning/12 text-warning ring-warning/20", color: "var(--warning)" },
  danger: { chip: "bg-destructive/12 text-destructive ring-destructive/20", color: "var(--destructive)" },
}

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone?: Tone
  decimals?: number
  prefix?: string
  suffix?: string
  format?: (value: number) => string
  /** Percent change vs previous period; sign decides the arrow. */
  delta?: number
  /** Whether a positive delta is good (green) -- false for e.g. "time to fix". */
  positiveIsGood?: boolean
  deltaLabel?: string
  sparkline?: number[]
  /** Makes the whole card a link. */
  to?: string
  className?: string
}

/** KPI tile: counting number, trend delta, sparkline, cursor spotlight. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  decimals,
  prefix,
  suffix,
  format,
  delta,
  positiveIsGood = true,
  deltaLabel = "vs last period",
  sparkline,
  to,
  className,
}: StatCardProps) {
  const navigate = useNavigate()
  const t = TONE[tone]
  const good = delta === undefined ? true : delta >= 0 === positiveIsGood

  return (
    <SpotlightCard
      glow={t.color}
      role={to ? "link" : undefined}
      tabIndex={to ? 0 : undefined}
      onClick={to ? () => navigate(to) : undefined}
      onKeyDown={
        to
          ? (e) => {
              if (e.key === "Enter") navigate(to)
            }
          : undefined
      }
      className={cn(
        "p-4 transition-transform duration-300",
        to && "cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            <NumberTicker value={value} decimals={decimals} prefix={prefix} suffix={suffix} format={format} />
          </p>
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg ring-1", t.chip)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        {delta !== undefined ? (
          <p className="flex items-center gap-1 text-xs whitespace-nowrap">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                good ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta)}%
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </p>
        ) : (
          <span />
        )}
        {sparkline && <Sparkline data={sparkline} color={t.color} className="h-8 w-24" />}
      </div>
    </SpotlightCard>
  )
}
