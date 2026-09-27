import { Activity, Bug, Target } from "lucide-react"
import { useId, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis, type DotItemDotProps } from "recharts"

import { Panel } from "@/components/app/panel"
import { SegmentedControl } from "@/components/app/segmented-control"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useMotionPreference } from "@/components/motion-preference"
import { tooltipFormatter } from "@/components/insights/chart-format"
import { DeltaPill } from "@/components/insights/delta-pill"
import { svgSafeId } from "@/components/insights/hooks"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { HEALING_ACTIVITY, HEALING_ACTIVITY_SUMMARY } from "@/services/mock/dashboard"

type Metric = "healed" | "successRate"

const config = {
  healed: { label: "Bugs healed", color: "var(--chart-1)" },
  successRate: { label: "Success rate (7-day)", color: "var(--chart-3)" },
} satisfies ChartConfig

const AVG_PER_DAY = HEALING_ACTIVITY_SUMMARY.healed / HEALING_ACTIVITY.length
const SUCCESS_TARGET = 90
const LAST = HEALING_ACTIVITY.length - 1

const format = (value: number, key: string) => (key === "successRate" ? `${value.toFixed(1)}%` : `${value}`)

/** Pulsing "now" marker on the newest point; nothing on the others. */
function EndDot({ cx, cy, index, stroke }: Pick<DotItemDotProps, "cx" | "cy" | "index" | "stroke">) {
  if (index !== LAST || cx == null || cy == null) return null
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={stroke}
        opacity={0.25}
        className="animate-ping-soft"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle cx={cx} cy={cy} r={4.5} fill={stroke} stroke="var(--background)" strokeWidth={2} />
    </g>
  )
}

export function HealingActivityChart() {
  const [metric, setMetric] = useState<Metric>("healed")
  const { reduced } = useMotionPreference()
  const gradientId = `heal-fill-${svgSafeId(useId())}`
  const isRate = metric === "successRate"
  const color = `var(--color-${metric})`

  return (
    <Panel
      title="Healing activity"
      description="Last 14 days, all projects"
      icon={Activity}
      className="h-full"
      action={
        <SegmentedControl
          size="sm"
          value={metric}
          onChange={setMetric}
          aria-label="Chart metric"
          options={[
            { value: "healed", label: "Bugs healed", icon: <Bug /> },
            { value: "successRate", label: "Success rate", icon: <Target /> },
          ]}
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            <NumberTicker
              value={isRate ? HEALING_ACTIVITY_SUMMARY.successRate : HEALING_ACTIVITY_SUMMARY.healed}
              decimals={isRate ? 1 : 0}
              suffix={isRate ? "%" : ""}
              duration={0.9}
            />
          </p>
          <p className="text-xs text-muted-foreground">
            {isRate ? "fix success over the last 14 days" : "bugs healed in the last 14 days"}
          </p>
        </div>
        {isRate ? (
          <DeltaPill value={HEALING_ACTIVITY_SUMMARY.successDeltaPts} unit=" pts" label="vs prior 14 days" />
        ) : (
          <DeltaPill value={HEALING_ACTIVITY_SUMMARY.healedDelta} label="vs prior 14 days" />
        )}
      </div>

      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <AreaChart data={HEALING_ACTIVITY} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={isRate ? 40 : 28}
            allowDecimals={false}
            domain={isRate ? [80, 100] : [0, (max: number) => Math.max(4, Math.ceil(max + 1))]}
            tickFormatter={(v: number) => (isRate ? `${v}%` : `${v}`)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={<ChartTooltipContent formatter={tooltipFormatter({ config, format })} />}
          />
          <ReferenceLine
            y={isRate ? SUCCESS_TARGET : AVG_PER_DAY}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.45}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: isRate ? `target ${SUCCESS_TARGET}%` : `avg ${AVG_PER_DAY.toFixed(1)}/day`,
              position: "insideTopLeft",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
          <Area
            dataKey={metric}
            type="monotone"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduced}
            animationDuration={900}
            animationEasing="ease-out"
            dot={(props: DotItemDotProps) => (
              <EndDot key={props.index} cx={props.cx} cy={props.cy} index={props.index} stroke={color} />
            )}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)", fill: color }}
          />
        </AreaChart>
      </ChartContainer>
    </Panel>
  )
}
