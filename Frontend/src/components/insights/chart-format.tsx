import type { ReactNode } from "react"
import type { TooltipPayloadEntry, TooltipValueType } from "recharts"

import type { ChartConfig } from "@/components/ui/chart"

interface TooltipFormatterOptions {
  config: ChartConfig
  /** Turns a raw value into its display string: "6m 40s", "91.0%", "14 h". */
  format: (value: number, key: string) => string
  /** Which config key a payload row belongs to; defaults to its dataKey. */
  keyOf?: (item: TooltipPayloadEntry) => string
}

/**
 * A `formatter` for <ChartTooltipContent>. It keeps the stock row anatomy
 * (colour key, series label, mono value) and only formats the value. Use it
 * with the default "dot" indicator so the x-axis label stays in the header.
 */
export function tooltipFormatter({ config, format, keyOf }: TooltipFormatterOptions) {
  return function formatTooltipRow(
    value: TooltipValueType | undefined,
    name: string | number | undefined,
    item: TooltipPayloadEntry,
  ): ReactNode {
    const key = keyOf ? keyOf(item) : String(item.dataKey ?? name ?? "")
    const fill = typeof item.payload?.fill === "string" ? (item.payload.fill as string) : undefined
    const color = fill ?? item.color ?? "var(--primary)"
    const display = typeof value === "number" ? format(value, key) : String(value ?? "")

    return (
      <div className="flex w-full items-center gap-2">
        <span aria-hidden className="h-2.5 w-1 shrink-0 rounded-[2px]" style={{ background: color }} />
        <span className="flex-1 text-muted-foreground">{config[key]?.label ?? name}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{display}</span>
      </div>
    )
  }
}
