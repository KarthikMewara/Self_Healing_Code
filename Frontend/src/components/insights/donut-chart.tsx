import { useMemo } from "react"
import { Pie, PieChart, Sector, type PieSectorShapeProps } from "recharts"

import { NumberTicker } from "@/components/fx/number-ticker"
import { useMotionPreference } from "@/components/motion-preference"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

export interface DonutDatum {
  key: string
  label: string
  value: number
  /** Any CSS colour. Keep it tied to the entity, never to its rank. */
  color: string
}

interface DonutChartProps {
  /** Every slice in a fixed order -- hiding one never repaints the others. */
  data: DonutDatum[]
  hidden?: ReadonlySet<string>
  centerLabel: string
  /** Defaults to the sum of the visible slices. */
  centerValue?: number
  centerFormat?: (value: number) => string
  onSliceClick?: (key: string) => void
  /** Emphasises one slice and dims the rest. */
  activeKey?: string | null
  /** Change it to replay the entrance sweep (e.g. after a re-scan). */
  replayKey?: string | number
  className?: string
}

/** Donut with a counting centre total, hover-grow sectors and 2px gaps. */
export function DonutChart({
  data,
  hidden,
  centerLabel,
  centerValue,
  centerFormat,
  onSliceClick,
  activeKey,
  replayKey,
  className,
}: DonutChartProps) {
  const { reduced } = useMotionPreference()
  const config = useMemo(
    () => Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }])) satisfies ChartConfig,
    [data],
  )
  const visible = data.filter((d) => !hidden?.has(d.key) && d.value > 0).map((d) => ({ ...d, fill: d.color }))
  const total = centerValue ?? visible.reduce((n, d) => n + d.value, 0)

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[220px]", className)}>
      <ChartContainer key={replayKey} config={config} className="aspect-square h-full w-full">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie
            data={visible}
            dataKey="value"
            nameKey="key"
            innerRadius="64%"
            outerRadius="88%"
            paddingAngle={visible.length > 1 ? 3 : 0}
            cornerRadius={5}
            stroke="none"
            isAnimationActive={!reduced}
            animationBegin={120}
            animationDuration={950}
            animationEasing="ease-out"
            className={onSliceClick ? "cursor-pointer" : undefined}
            onClick={onSliceClick ? (sector) => onSliceClick(String(sector.payload?.key ?? "")) : undefined}
            shape={(props: PieSectorShapeProps) => (
              <Sector
                {...props}
                outerRadius={props.isActive ? props.outerRadius + 5 : props.outerRadius}
                opacity={activeKey && props.payload?.key !== activeKey ? 0.32 : 1}
                style={{ transition: "opacity 200ms ease" }}
              />
            )}
          />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          <NumberTicker value={total} format={centerFormat} />
        </span>
        <span className="max-w-[60%] text-[11px] leading-tight text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  )
}
