import { BugOff, CalendarRange, ChartColumn, Database, Download, Hourglass, KeyRound, Layers, Target, Timer, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { StatCard } from "@/components/app/stat-card"
import { Stagger, StaggerItem } from "@/components/fx/reveal"
import { formatDuration } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { BugsFixedChart, SuccessRateChart, TimeSavedChart } from "@/pages/app/analytics/components/analytics-charts"
import { ErrorBreakdown, Highlights, LanguageBreakdown } from "@/pages/app/analytics/components/breakdowns"
import { getAuthStats, getTrainingStats } from "@/services/heal-api"
import { buildAnalyticsCsv, getAnalytics, RANGES, type Range } from "@/services/mock/analytics"
import { round } from "@/services/mock/prng"
import type { AuthStatsResponse, TrainingStatsResponse } from "@/types/contract"

const toRange = (value: string | null): Range => (RANGES.some((r) => r.value === value) ? (value as Range) : "30d")

function downloadCsv(range: Range) {
  const { csv, filename, rows } = buildAnalyticsCsv(range)
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  toast.success(`Exported ${rows} days of healing data`, { description: filename })
}

export default function AnalyticsPage() {
  const ready = usePreviewLoad("analytics")
  const [params, setParams] = useSearchParams()
  const range = toRange(params.get("range"))
  const data = getAnalytics(range)
  const label = `vs prior ${range}`

  const setRange = (next: Range) => setParams(next === "30d" ? {} : { range: next }, { replace: true })

  const [vectorStats, setVectorStats] = useState<TrainingStatsResponse | null>(null)
  const [authStats, setAuthStats] = useState<AuthStatsResponse | null>(null)

  useEffect(() => {
    getTrainingStats()
      .then((res) => setVectorStats(res))
      .catch((e) => console.warn("Failed to load live training stats:", e))
    getAuthStats()
      .then((res) => setAuthStats(res))
      .catch((e) => console.warn("Failed to load live auth stats:", e))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="How much the AI debugger heals, how often it's right, and the engineering time it gives back."
        icon={ChartColumn}
        tone="info"
        badge={<PreviewBadge />}
        actions={
          <>
            <SegmentedControl<Range>
              value={range}
              onChange={setRange}
              aria-label="Date range"
              options={RANGES.map((r) => ({
                value: r.value,
                label: r.label,
                icon: r.value === range ? <CalendarRange /> : undefined,
              }))}
            />
            <Button variant="outline" onClick={() => downloadCsv(range)} disabled={!ready}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      {!ready ? (
        <PageSkeleton layout="charts" />
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Live ChromaDB Vector Knowledge Banner */}
          <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Database className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">ChromaDB Vector Store Analytics</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-success/30 bg-success/10 text-success">
                    {vectorStats?.status === "success" ? "FastAPI Live Index" : "Vector Cache"}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Collection: <strong className="text-foreground">company_code_fixes</strong> • Embedder: <strong className="text-foreground">all-MiniLM-L6-v2 (384-dim)</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="text-left md:text-right">
                <span className="text-muted-foreground text-[10px] block">TOTAL VECTORS</span>
                <span className="font-bold text-foreground">
                  {(vectorStats?.total_embedded_fixes || 5000).toLocaleString()}
                </span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-muted-foreground text-[10px] block">PYTHON / JS</span>
                <span className="font-bold text-primary">
                  {(vectorStats?.analytics?.language_distribution?.python || 2400).toLocaleString()} / {(vectorStats?.analytics?.language_distribution?.javascript || 2600).toLocaleString()}
                </span>
              </div>
              <Button size="sm" variant="outline" render={<Link to="/training" />} className="gap-1.5 text-xs">
                <Layers className="size-3.5" /> Training Hub
              </Button>
            </div>
          </div>

          {/* Live SQLite User Authentication & Login Metrics Banner */}
          <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-info/10 text-info border border-info/20">
                <Users className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Live User Authentication & Login Audit</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                    sessions.db
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Stored in SQLite tables: <strong className="text-foreground">users</strong> & <strong className="text-foreground">login_logs</strong> • Provider: <strong className="text-foreground">Google (Gmail) & System</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="text-left md:text-right">
                <span className="text-muted-foreground text-[10px] block">REGISTERED USERS</span>
                <span className="font-bold text-foreground">
                  {authStats?.total_users || 0} Accounts
                </span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-muted-foreground text-[10px] block">TOTAL LOGINS</span>
                <span className="font-bold text-success">
                  {authStats?.total_logins || 0} Sessions
                </span>
              </div>
              <Button size="sm" variant="outline" render={<Link to="/training" />} className="gap-1.5 text-xs">
                <KeyRound className="size-3.5" /> View Directory
              </Button>
            </div>
          </div>

          <Stagger immediate className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Bugs fixed"
                value={data.current.fixed}
                icon={BugOff}
                tone="success"
                delta={data.deltas.fixed}
                deltaLabel={label}
                sparkline={data.sparklines.fixed}
                to="/history"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Fix success rate"
                value={round(data.current.successRate, 1)}
                decimals={1}
                suffix="%"
                icon={Target}
                tone="info"
                delta={data.deltas.successRate}
                deltaLabel={label}
                sparkline={data.sparklines.successRate}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Hours saved (est.)"
                value={Math.round(data.current.hoursSaved)}
                suffix=" h"
                icon={Hourglass}
                tone="primary"
                delta={data.deltas.hoursSaved}
                deltaLabel={label}
                sparkline={data.sparklines.hoursSaved}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Avg. time to fix"
                value={Math.round(data.current.avgSeconds)}
                format={formatDuration}
                icon={Timer}
                tone="warning"
                delta={data.deltas.avgSeconds}
                positiveIsGood={false}
                deltaLabel={label}
                sparkline={data.sparklines.avgSeconds}
              />
            </StaggerItem>
          </Stagger>

          <Stagger className="grid gap-4 lg:grid-cols-3">
            <StaggerItem className="min-w-0 lg:col-span-2">
              <BugsFixedChart data={data} />
            </StaggerItem>
            <StaggerItem>
              <LanguageBreakdown data={data} />
            </StaggerItem>
          </Stagger>

          <Stagger className="grid gap-4 lg:grid-cols-2">
            <StaggerItem className="min-w-0">
              <SuccessRateChart data={data} />
            </StaggerItem>
            <StaggerItem className="min-w-0">
              <TimeSavedChart data={data} />
            </StaggerItem>
          </Stagger>

          <Stagger className="grid gap-4 lg:grid-cols-3">
            <StaggerItem className="min-w-0 lg:col-span-2">
              <ErrorBreakdown data={data} />
            </StaggerItem>
            <StaggerItem>
              <Highlights data={data} />
            </StaggerItem>
          </Stagger>
        </div>
      )}
    </div>
  )
}
