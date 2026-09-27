import { ChartArea, Hourglass, Table2, Target } from "lucide-react"
import { useId, useState } from "react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { Panel } from "@/components/app/panel"
import { SegmentedControl } from "@/components/app/segmented-control"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useMotionPreference } from "@/components/motion-preference"
import { tooltipFormatter } from "@/components/insights/chart-format"
import { svgSafeId } from "@/components/insights/hooks"
import { LegendToggle } from "@/components/insights/legend-toggle"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RANGES, type AnalyticsData } from "@/services/mock/analytics"

const noun = (data: AnalyticsData) => RANGES.find((r) => r.value === data.range)?.noun ?? "30 days"
const ANIM_MS = 750

// ---------------------------------------------------------------------------
// Bugs fixed over time
// ---------------------------------------------------------------------------

const bugsConfig = {
  bugsFixed: { label: "Bugs fixed", color: "var(--chart-1)" },
  previous: { label: "Previous period", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export function BugsFixedChart({ data }: { data: AnalyticsData }) {
  const { reduced } = useMotionPreference()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [view, setView] = useState<"chart" | "table">("chart")
  const gid = `bugs-${svgSafeId(useId())}`

  return (
    <Panel
      title="Bugs fixed over time"
      description={`Per day · last ${noun(data)} against the ${noun(data)} before`}
      icon={ChartArea}
      className="h-full min-w-0"
      action={
        <SegmentedControl<"chart" | "table">
          size="sm"
          value={view}
          onChange={setView}
          aria-label="Show as"
          options={[
            { value: "chart", label: "Chart", icon: <ChartArea /> },
            { value: "table", label: "Table", icon: <Table2 /> },
          ]}
        />
      }
    >
      <LegendToggle
        className="mb-2 -ml-2"
        hidden={hidden}
        onHiddenChange={setHidden}
        items={[
          { key: "bugsFixed", label: "Bugs fixed", color: "var(--chart-1)", shape: "rect", value: data.current.fixed },
          {
            key: "previous",
            label: "Previous period",
            color: "var(--muted-foreground)",
            shape: "line",
            value: data.previous.fixed,
          },
        ]}
      />
      {view === "chart" ? (
        <ChartContainer config={bugsConfig} className="aspect-auto h-64 w-full">
          <ComposedChart data={data.daily} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-bugsFixed)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--color-bugsFixed)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
            <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent />} />
            <Area
              dataKey="bugsFixed"
              type="monotone"
              stroke="var(--color-bugsFixed)"
              strokeWidth={2}
              fill={`url(#${gid})`}
              hide={hidden.has("bugsFixed")}
              isAnimationActive={!reduced}
              animationDuration={ANIM_MS}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)" }}
            />
            <Line
              dataKey="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              dot={false}
              hide={hidden.has("previous")}
              isAnimationActive={!reduced}
              animationDuration={ANIM_MS}
            />
          </ComposedChart>
        </ChartContainer>
      ) : (
        <div className="scrollbar-thin h-64 overflow-auto rounded-lg border border-border">
          <Table className="min-w-[420px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3 text-xs text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Bugs fixed</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Previous</TableHead>
                <TableHead className="pr-3 text-right text-xs text-muted-foreground">Success (7d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.daily].reverse().map((p) => (
                <TableRow key={p.iso}>
                  <TableCell className="pl-3 text-xs text-foreground">{p.label}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{p.bugsFixed}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{p.previous}</TableCell>
                  <TableCell className="pr-3 text-right text-xs tabular-nums">{p.successRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Fix success rate
// ---------------------------------------------------------------------------

const successConfig = {
  successRate: { label: "Fix success", color: "var(--chart-3)" },
  firstAttempt: { label: "First-patch pass", color: "var(--chart-2)" },
} satisfies ChartConfig

const pct = (v: number) => `${v.toFixed(1)}%`

export function SuccessRateChart({ data }: { data: AnalyticsData }) {
  const { reduced } = useMotionPreference()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const last = data.daily[data.daily.length - 1]

  return (
    <Panel
      title="Fix success rate"
      description="7-day rolling · share of heals that ended in a tested fix"
      icon={Target}
      className="h-full min-w-0"
    >
      <LegendToggle
        className="mb-2 -ml-2"
        hidden={hidden}
        onHiddenChange={setHidden}
        items={[
          { key: "successRate", label: "Fix success", color: "var(--chart-3)", shape: "line", value: pct(last.successRate) },
          { key: "firstAttempt", label: "First-patch pass", color: "var(--chart-2)", shape: "line", value: pct(last.firstAttempt) },
        ]}
      />
      <ChartContainer config={successConfig} className="aspect-auto h-56 w-full">
        <LineChart data={data.daily} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[(min: number) => Math.max(0, Math.floor((min - 4) / 10) * 10), 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={<ChartTooltipContent formatter={tooltipFormatter({ config: successConfig, format: pct })} />}
          />
          <ReferenceLine
            y={90}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.45}
            strokeDasharray="4 4"
            label={{ value: "target 90%", position: "insideBottomLeft", fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Line
            dataKey="successRate"
            type="monotone"
            stroke="var(--color-successRate)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)" }}
            hide={hidden.has("successRate")}
            isAnimationActive={!reduced}
            animationDuration={ANIM_MS}
          />
          <Line
            dataKey="firstAttempt"
            type="monotone"
            stroke="var(--color-firstAttempt)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)" }}
            hide={hidden.has("firstAttempt")}
            isAnimationActive={!reduced}
            animationDuration={ANIM_MS}
          />
        </LineChart>
      </ChartContainer>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Time saved (stacked bars)
// ---------------------------------------------------------------------------

const SAVED_KEYS = ["debugging", "review", "tests"] as const

const savedConfig = {
  debugging: { label: "Debugging", color: "var(--chart-1)" },
  review: { label: "Code review", color: "var(--chart-3)" },
  tests: { label: "Writing tests", color: "var(--chart-2)" },
} satisfies ChartConfig

export function TimeSavedChart({ data }: { data: AnalyticsData }) {
  const { reduced } = useMotionPreference()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visibleKeys = SAVED_KEYS.filter((k) => !hidden.has(k))
  const topKey = visibleKeys[visibleKeys.length - 1]
  const total = visibleKeys.reduce((n, k) => n + data.current.saved[k], 0)
  const weekly = data.range === "90d"

  return (
    <Panel
      title="Time saved"
      description={`Estimated engineer-hours · ${weekly ? "per week" : "per day"} vs a manual fix`}
      icon={Hourglass}
      className="h-full min-w-0"
      action={
        <span className="text-right text-xs text-muted-foreground">
          <span className="block text-lg font-semibold text-foreground">
            <NumberTicker value={total} decimals={0} suffix=" h" duration={0.8} />
          </span>
          ≈ {Math.round(total / 8)} engineer-days
        </span>
      }
    >
      <LegendToggle
        className="mb-2 -ml-2"
        hidden={hidden}
        onHiddenChange={setHidden}
        items={SAVED_KEYS.map((key) => ({
          key,
          label: String(savedConfig[key].label),
          color: savedConfig[key].color,
          shape: "rect" as const,
          value: `${Math.round(data.current.saved[key])} h`,
        }))}
      />
      <ChartContainer config={savedConfig} className="aspect-auto h-56 w-full">
        <BarChart data={data.saved} margin={{ top: 8, right: 6, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={34} tickFormatter={(v: number) => `${v}h`} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={
              <ChartTooltipContent
                labelFormatter={(label, payload) => (payload?.[0]?.payload?.title as string | undefined) ?? label}
                formatter={tooltipFormatter({ config: savedConfig, format: (v) => `${v.toFixed(1)} h` })}
              />
            }
          />
          {SAVED_KEYS.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="saved"
              fill={`var(--color-${key})`}
              stroke="var(--card)"
              strokeWidth={1.5}
              maxBarSize={24}
              radius={key === topKey ? [4, 4, 0, 0] : 0}
              hide={hidden.has(key)}
              isAnimationActive={!reduced}
              animationDuration={ANIM_MS}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Estimate: your team's historical time-to-resolve for similar bugs, minus the time the healer took.
      </p>
    </Panel>
  )
}

