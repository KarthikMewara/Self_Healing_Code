import { EyeOff, LoaderCircle, Radar, ShieldAlert, ShieldCheck } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { Panel } from "@/components/app/panel"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { EmptyState } from "@/components/empty-state"
import { Stagger, StaggerItem } from "@/components/fx/reveal"
import { useMotionPreference } from "@/components/motion-preference"
import { Button } from "@/components/ui/button"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { cn } from "@/lib/utils"
import { FindingRow } from "@/pages/app/security/components/finding-row"
import { RadarScanOverlay } from "@/pages/app/security/components/radar-scan"
import { FindingsTrend, SeverityDonut } from "@/pages/app/security/components/security-charts"
import { SEVERITY } from "@/pages/app/security/components/severity"
import { SeverityTiles } from "@/pages/app/security/components/severity-tiles"
import { MOCK_TODAY } from "@/services/mock/healing-series"
import {
  FINDINGS,
  FINDINGS_TREND,
  LAST_SCAN,
  RESCAN_FINDING,
  SCAN_STEPS,
  SEVERITIES,
  type FindingDetail,
} from "@/services/mock/security"
import type { Severity } from "@/types/domain"

type Filter = Severity | "all" | "ignored"

function countBySeverity(list: FindingDetail[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>
  for (const f of list) counts[f.severity]++
  return counts
}

function daysAgo(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number)
  return (MOCK_TODAY.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000
}

const bySeverity = (a: FindingDetail, b: FindingDetail) =>
  SEVERITY[a.severity].rank - SEVERITY[b.severity].rank || b.detectedAt.localeCompare(a.detectedAt)

export default function SecurityPage() {
  const ready = usePreviewLoad("security")
  const navigate = useNavigate()
  const { setDraft } = useDebugWorkspace()
  const { reduced } = useMotionPreference()

  const [findings, setFindings] = useState<FindingDetail[]>(FINDINGS)
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<Filter>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [scan, setScan] = useState({ running: false, progress: 0 })
  const [scanCount, setScanCount] = useState(0)
  const [discovered, setDiscovered] = useState(false)
  const [lastScan, setLastScan] = useState(LAST_SCAN)

  const open = findings.filter((f) => !ignored.has(f.id))
  const counts = countBySeverity(open)
  const recent = countBySeverity(open.filter((f) => daysAgo(f.detectedAt) < 7))
  const visible = (
    filter === "ignored"
      ? findings.filter((f) => ignored.has(f.id))
      : open.filter((f) => filter === "all" || f.severity === filter)
  ).sort(bySeverity)
  const lastWeek = FINDINGS_TREND[FINDINGS_TREND.length - 1]
  const trend = [...FINDINGS_TREND.slice(0, -1), { ...lastWeek, ...counts }]
  const severityFilter = filter === "all" || filter === "ignored" ? null : filter

  const reveal = useCallback(
    (id: string) => {
      setFilter("all")
      setExpanded(id)
      window.setTimeout(() => {
        document.getElementById(`finding-${id}`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" })
      }, 150)
    },
    [reduced],
  )

  const completeScan = () => {
    setScan({ running: false, progress: 100 })
    setScanCount((n) => n + 1)
    setLastScan("just now")
    if (!discovered) {
      setDiscovered(true)
      setFindings((prev) => [RESCAN_FINDING, ...prev])
      toast.warning("Scan complete — 1 new finding", {
        description: `${RESCAN_FINDING.title} · ${RESCAN_FINDING.project}`,
        action: { label: "View", onClick: () => reveal(RESCAN_FINDING.id) },
      })
    } else {
      setFindings((prev) => prev.map((f) => (f.isNew ? { ...f, isNew: false } : f)))
      toast.success("Scan complete — no new findings", {
        description: `${SCAN_STEPS.length} projects scanned · ${open.length} open findings`,
      })
    }
  }

  // Drive the simulated scan; completion happens in the interval callback.
  useEffect(() => {
    if (!scan.running) return
    const began = Date.now()
    const duration = reduced ? 800 : 4800
    const timer = window.setInterval(() => {
      const progress = Math.min(100, ((Date.now() - began) / duration) * 100)
      if (progress < 100) {
        setScan({ running: true, progress })
        return
      }
      window.clearInterval(timer)
      completeScan()
    }, 50)
    return () => window.clearInterval(timer)
    // completeScan is intentionally the version from the render that started the scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.running, reduced])

  const startScan = () => {
    if (scan.running) return
    setExpanded(null)
    setScan({ running: true, progress: 0 })
  }

  const cancelScan = useCallback(() => {
    setScan({ running: false, progress: 0 })
    toast.info("Scan cancelled", { description: "Findings are unchanged." })
  }, [])

  const fix = (f: FindingDetail) => {
    setDraft({
      language: f.language,
      source: f.draft.source,
      trace: f.draft.trace,
      context: f.draft.context,
      exampleId: undefined,
    })
    navigate("/debugger")
    toast.success("Loaded into AI Debugger", { description: `${f.title} — run the heal to generate a patch.` })
  }

  const restore = (id: string) =>
    setIgnored((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

  const ignore = (f: FindingDetail) => {
    setIgnored((prev) => new Set(prev).add(f.id))
    setExpanded((current) => (current === f.id ? null : current))
    toast("Finding ignored", {
      description: `${f.title} — moved to Ignored.`,
      action: { label: "Undo", onClick: () => restore(f.id) },
    })
  }

  const blips = [...open, ...(discovered ? [] : [RESCAN_FINDING])].map((f) => ({
    id: f.id,
    severity: f.severity,
    project: f.project,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Static analysis, secret scanning and dependency advisories across all 5 projects."
        icon={ShieldAlert}
        tone="danger"
        badge={<PreviewBadge />}
        actions={
          <>
            <span className="hidden text-xs text-muted-foreground md:inline">Last scan {lastScan}</span>
            <Button onClick={startScan} disabled={scan.running || !ready}>
              {scan.running ? <LoaderCircle className="animate-spin" /> : <Radar />}
              {scan.running ? `Scanning ${Math.round(scan.progress)}%` : "Re-scan"}
            </Button>
          </>
        }
      />

      {!ready ? (
        <PageSkeleton layout="charts" />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="relative">
            <Stagger key={scanCount} immediate className="space-y-4 md:space-y-6">
              <StaggerItem>
                <SeverityTiles
                  counts={counts}
                  recent={recent}
                  active={severityFilter}
                  onSelect={(sev) => setFilter(sev ?? "all")}
                />
              </StaggerItem>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
                <StaggerItem>
                  <SeverityDonut
                    counts={counts}
                    active={severityFilter}
                    onSelect={(sev) => setFilter(sev ?? "all")}
                    replayKey={scanCount}
                  />
                </StaggerItem>
                <StaggerItem className="min-w-0">
                  <FindingsTrend data={trend} />
                </StaggerItem>
              </div>
            </Stagger>
            <AnimatePresence>
              {scan.running && <RadarScanOverlay progress={scan.progress} blips={blips} onCancel={cancelScan} />}
            </AnimatePresence>
          </div>

          <Panel
            title="Findings"
            description={
              filter === "ignored"
                ? "Ignored findings stay out of the counts and charts until you restore them"
                : `${visible.length} ${filter === "all" ? "open" : SEVERITY[filter].label.toLowerCase()} · most severe first`
            }
            icon={ShieldAlert}
            className={cn("transition-opacity duration-300", scan.running && "pointer-events-none opacity-45")}
          >
            <div className="space-y-3" aria-busy={scan.running}>
              <div className="no-scrollbar -mx-1 overflow-x-auto px-1 py-0.5">
                <SegmentedControl<Filter>
                  size="sm"
                  value={filter}
                  onChange={setFilter}
                  aria-label="Filter findings"
                  options={[
                    { value: "all", label: "All", count: open.length },
                    ...SEVERITIES.map((sev) => ({ value: sev, label: SEVERITY[sev].label, count: counts[sev] })),
                    { value: "ignored", label: "Ignored", icon: <EyeOff />, count: ignored.size },
                  ]}
                />
              </div>

              {visible.length > 0 ? (
                <ul key={scanCount} className="relative space-y-2">
                  <AnimatePresence mode="popLayout">
                    {visible.map((f) => (
                      <FindingRow
                        key={f.id}
                        finding={f}
                        expanded={expanded === f.id}
                        ignored={ignored.has(f.id)}
                        onToggle={() => setExpanded((current) => (current === f.id ? null : f.id))}
                        onFix={() => fix(f)}
                        onIgnore={() => ignore(f)}
                        onRestore={() => {
                          restore(f.id)
                          toast.success("Finding restored", { description: f.title })
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title={filter === "ignored" ? "Nothing ignored" : `No ${filter === "all" ? "open" : SEVERITY[filter].label.toLowerCase()} findings`}
                  description={
                    filter === "ignored"
                      ? "Findings you ignore land here, so you can restore them later."
                      : "Nice — nothing at this severity right now. Re-scan after your next deploy."
                  }
                  actionLabel="Show all findings"
                  onAction={() => setFilter("all")}
                  className="py-12"
                />
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
