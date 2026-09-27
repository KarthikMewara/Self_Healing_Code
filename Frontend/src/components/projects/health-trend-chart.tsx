import { useId } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis, type DotItemDotProps } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { HealthPoint } from "@/services/mock/projects"

const HEALTHY_AT = 80

const config = {
  score: { label: "Health score", color: "var(--primary)" },
} satisfies ChartConfig

/** 30-day health score: gradient wash, crosshair tooltip, labelled latest value. */
export function HealthTrendChart({ data, className }: { data: HealthPoint[]; className?: string }) {
  const gradientId = `health-fill-${useId().replace(/:/g, "")}`
  const lastIndex = data.length - 1

  const endDot = ({ cx, cy, index }: DotItemDotProps) => {
    if (index !== lastIndex || cx == null || cy == null) return <g key={`dot-${index}`} />
    return (
      <g key={`dot-${index}`}>
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="var(--color-score)"
          opacity={0.2}
          className="animate-ping-soft"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
        <circle cx={cx} cy={cy} r={4.5} fill="var(--color-score)" stroke="var(--background)" strokeWidth={2} />
        <text
          x={cx}
          y={cy - 13}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-semibold"
          paintOrder="stroke"
          stroke="var(--background)"
          strokeWidth={4}
        >
          {data[lastIndex].score}
        </text>
      </g>
    )
  }

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <AreaChart data={data} margin={{ top: 22, right: 18, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-score)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--color-score)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={36} tickMargin={4} />
        <ReferenceLine
          y={HEALTHY_AT}
          stroke="var(--success)"
          strokeOpacity={0.55}
          strokeDasharray="4 4"
          label={{ value: `Healthy ≥ ${HEALTHY_AT}`, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11, dy: -14 }}
        />
        <ChartTooltip cursor={{ stroke: "var(--border)", strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="score"
          type="monotone"
          stroke="var(--color-score)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={endDot}
          activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)" }}
          animationDuration={1300}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  )
}

/** The chart's table twin: every value reachable without hovering. */
export function HealthTrendTable({ data }: { data: HealthPoint[] }) {
  const rows = data.map((point, i) => ({ ...point, change: i ? point.score - data[i - 1].score : 0 })).reverse()
  return (
    <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/90 text-[11px] tracking-wide text-muted-foreground uppercase backdrop-blur">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Day</th>
            <th className="px-3 py-2 text-right font-medium">Health score</th>
            <th className="px-3 py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border/60">
              <td className="px-3 py-1.5 text-muted-foreground">{row.label}</td>
              <td className="px-3 py-1.5 text-right font-medium text-foreground tabular-nums">{row.score}</td>
              <td
                className={cn(
                  "px-3 py-1.5 text-right text-xs tabular-nums",
                  row.change > 0 ? "text-success" : row.change < 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {row.change > 0 ? `+${row.change}` : row.change < 0 ? `−${Math.abs(row.change)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
