import {
  Activity,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Brain,
  ChartArea,
  CircleCheck,
  CircleX,
  Copy,
  FolderGit2,
  FolderKanban,
  FolderSearch,
  History as HistoryIcon,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Timer,
  Trash,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { Panel } from "@/components/app/panel"
import { PreviewBadge } from "@/components/app/preview-badge"
import { ProgressRing } from "@/components/app/progress-ring"
import { SegmentedControl } from "@/components/app/segmented-control"
import { StatCard } from "@/components/app/stat-card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { GlowButton } from "@/components/fx/glow-button"
import { NumberTicker } from "@/components/fx/number-ticker"
import { Reveal, Stagger, StaggerItem } from "@/components/fx/reveal"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { formatDate, formatDuration, formatIsoDay, formatRelative } from "@/components/history/format"
import { rowFromHistory } from "@/components/history/session-models"
import { SessionsTable } from "@/components/history/sessions-table"
import { HealthTrendChart, HealthTrendTable } from "@/components/projects/health-trend-chart"
import { LanguageLabel } from "@/components/projects/language-chip"
import { HealthBadge } from "@/components/projects/project-card"
import { RenameProjectDialog } from "@/components/projects/project-dialogs"
import { severityTone, StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { EASE_OUT, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { PREVIEW_NOW, sessionsForProject, type HistorySession } from "@/services/mock/history"
import { memoryForProject } from "@/services/mock/memory"
import {
  deleteProject,
  getProjectInsights,
  HEALTH_META,
  healthNarrative,
  setProjectArchived,
  useProject,
  type ProjectInsights,
  type ProjectRecord,
} from "@/services/mock/projects"

type TabKey = "overview" | "sessions" | "settings"

const TAB_KEYS: TabKey[] = ["overview", "sessions", "settings"]

function BackLink() {
  return (
    <Link
      to="/projects"
      className="group inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
      All projects
    </Link>
  )
}

function TrendChip({ change }: { change: number }) {
  if (change === 0) return null
  const up = change > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium",
        up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
      )}
    >
      <Icon className="size-3" />
      {up ? "+" : "−"}
      {Math.abs(change)} pts · 30d
    </span>
  )
}

function HealthHero({ project, insights }: { project: ProjectRecord; insights: ProjectInsights }) {
  const score = project.healthScore
  const meta = HEALTH_META[project.health]
  const glow = score === null ? "var(--primary)" : meta.color
  return (
    <SpotlightCard
      glow={glow}
      className="flex h-full flex-col items-center justify-center gap-5 p-5 text-center sm:flex-row sm:text-left lg:flex-col lg:text-center"
    >
      <div className="relative shrink-0">
        {score !== null && project.health === "critical" && (
          <span aria-hidden className="animate-ping-soft absolute inset-4 rounded-full bg-destructive/20" />
        )}
        <ProgressRing value={score ?? 0} size={128} stroke={9} tone={score === null ? "primary" : meta.tone}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {score === null ? "—" : <NumberTicker value={score} className="normal-nums" />}
            </span>
            <span className="mt-1.5 text-[11px] text-muted-foreground">of 100</span>
          </div>
        </ProgressRing>
      </div>
      <div className="min-w-0 space-y-2.5">
        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Health score</p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start lg:justify-center">
          <HealthBadge project={project} />
          <TrendChip change={insights.healthChange} />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{healthNarrative(project, insights)}</p>
      </div>
    </SpotlightCard>
  )
}

function StatusGlyph({ session }: { session: HistorySession }) {
  if (session.status === "resolved") return <CircleCheck className="size-4 shrink-0 text-success" aria-label="Resolved" />
  if (session.status === "failed") return <CircleX className="size-4 shrink-0 text-destructive" aria-label="Failed" />
  return <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="In progress" />
}

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="xs" render={<Link to={to} />} className="text-muted-foreground">
      {children}
      <ArrowRight />
    </Button>
  )
}

function DetailRow({ label, children, copy }: { label: string; children: ReactNode; copy?: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
        <span className="min-w-0 truncate">{children}</span>
        {copy && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`Copy ${label.toLowerCase()}`}
                  onClick={() => {
                    navigator.clipboard?.writeText(copy).catch(() => undefined)
                    toast.success(`${label} copied`, { description: copy })
                  }}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                />
              }
            >
              <Copy className="size-3" />
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        )}
      </dd>
    </div>
  )
}

const tabMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE_OUT },
}

export default function ProjectDetailsPage() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const ready = usePreviewLoad(`project:${projectId ?? "unknown"}`)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { draft, setDraft } = useDebugWorkspace()
  const [chartView, setChartView] = useState<"chart" | "table">("chart")
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameKey, setRenameKey] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const tabParam = searchParams.get("tab")
  const tab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "overview"
  const setTab = (next: TabKey) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === "overview") params.delete("tab")
        else params.set("tab", next)
        return params
      },
      { replace: true },
    )

  if (!project) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={FolderSearch}
          title="Project not found"
          description="It may have been deleted, or the link points at a project from another workspace."
          actionLabel="Back to projects"
          onAction={() => navigate("/projects")}
        />
      </div>
    )
  }

  const insights = getProjectInsights(project)
  const meta = HEALTH_META[project.health]
  const sessions = sessionsForProject(project.id)
  const memory = memoryForProject(project.id)
  const recent = sessions.slice(0, 4)
  const hasData = project.healthScore !== null

  const startSession = () => {
    // Pre-select the project's language, but never clobber code already typed.
    if (!draft.source.trim()) setDraft({ language: project.languageKey, exampleId: undefined })
    navigate("/debugger")
  }

  const toggleArchive = () => {
    const next = !project.archived
    setProjectArchived(project.id, next)
    toast(next ? `Archived ${project.name}` : `Restored ${project.name}`, {
      action: { label: "Undo", onClick: () => setProjectArchived(project.id, !next) },
    })
  }

  const tabs: { value: TabKey; label: string; icon: LucideIcon; count?: number }[] = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "sessions", label: "Debug sessions", icon: HistoryIcon, count: sessions.length },
    { value: "settings", label: "Settings", icon: Settings2 },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink />
        <PageHeader
          title={<span className="font-mono tracking-tight">{project.name}</span>}
          icon={FolderKanban}
          tone={hasData ? meta.tone : "primary"}
          badge={
            <>
              <PreviewBadge />
              {project.archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
            </>
          }
          description={
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{project.description}</span>
              <LanguageLabel language={project.language} />
              <span className="text-xs">Last activity {project.lastActivity.toLowerCase()}</span>
            </span>
          }
          actions={
            <>
              <Button variant="outline" render={<Link to={`/history?project=${project.id}`} />}>
                <HistoryIcon /> History
              </Button>
              <GlowButton onClick={startSession}>
                <Sparkles /> New debug session
              </GlowButton>
            </>
          }
        />
      </div>

      {project.archived && (
        <Reveal y={8} blur={false}>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm">
            <Archive className="size-4 text-warning" />
            <span className="text-foreground">This project is archived and hidden from the projects grid.</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={toggleArchive}>
              <ArchiveRestore /> Restore
            </Button>
          </div>
        </Reveal>
      )}

      {!ready ? (
        <PageSkeleton layout="dashboard" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
            <Reveal y={12} blur={false}>
              <HealthHero project={project} insights={insights} />
            </Reveal>
            {hasData ? (
              <Stagger immediate stagger={0.07} className="grid gap-4 sm:grid-cols-2">
                <StaggerItem>
                  <StatCard
                    label="Debug sessions"
                    value={project.sessionsCount}
                    icon={Activity}
                    tone="primary"
                    delta={insights.deltas?.sessions}
                    deltaLabel="vs prior 30 days"
                    sparkline={insights.sessionsTrend}
                    to={`/projects/${project.id}?tab=sessions`}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Fix success rate"
                    value={Math.round(insights.successRate ?? 0)}
                    suffix="%"
                    icon={CircleCheck}
                    tone="success"
                    delta={insights.deltas?.success}
                    deltaLabel="vs prior 30 days"
                    sparkline={insights.successTrend}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Avg time to fix"
                    value={project.stats.avgFixSec}
                    format={(v) => formatDuration(v)}
                    icon={Timer}
                    tone="info"
                    delta={insights.deltas?.fixTime}
                    positiveIsGood={false}
                    deltaLabel="vs prior 30 days"
                    sparkline={insights.fixTimeTrend}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Open vulnerabilities"
                    value={insights.vulnerabilities.length}
                    icon={insights.vulnerabilities.length ? ShieldAlert : ShieldCheck}
                    tone={insights.vulnerabilities.length ? "danger" : "success"}
                    to="/security"
                  />
                </StaggerItem>
              </Stagger>
            ) : (
              <Reveal y={12} blur={false} delay={0.05}>
                <div className="glass flex h-full flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-border p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                    <Sparkles className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">No sessions yet</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Sessions, fix rate, time to fix and findings appear here once the first debug session for{" "}
                      <span className="font-mono text-foreground">{project.name}</span> finishes.
                    </p>
                  </div>
                  <Button onClick={startSession}>
                    Start a debug session <ArrowRight />
                  </Button>
                </div>
              </Reveal>
            )}
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="gap-4">
            <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="h-9 bg-muted/60">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="relative px-3 data-active:bg-transparent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent"
                  >
                    {tab === t.value && (
                      <motion.span
                        layoutId="project-tab-pill"
                        transition={SPRING}
                        className="absolute inset-0 rounded-md border border-border bg-background shadow-sm dark:bg-accent"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <t.icon className="size-3.5" />
                      {t.label}
                      {t.count !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[10px] tabular-nums",
                            tab === t.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {t.count}
                        </span>
                      )}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview">
              <motion.div {...tabMotion} className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <Panel
                  title="Health score"
                  description="Daily score over the last 30 days · healthy at 80 and above"
                  icon={ChartArea}
                  action={
                    hasData && (
                      <SegmentedControl
                        size="sm"
                        aria-label="Health data view"
                        value={chartView}
                        onChange={setChartView}
                        options={[
                          { value: "chart", label: "Chart", icon: <ChartArea /> },
                          { value: "table", label: "Table", icon: <Table2 /> },
                        ]}
                      />
                    )
                  }
                >
                  {hasData ? (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={chartView}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                      >
                        {chartView === "chart" ? (
                          <HealthTrendChart data={insights.healthTrend} />
                        ) : (
                          <HealthTrendTable data={insights.healthTrend} />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
                      <ChartArea className="size-6 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">No health data yet</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        The score starts once a debug session finishes for this project.
                      </p>
                    </div>
                  )}
                </Panel>

                <div className="space-y-4">
                  <Panel
                    title="Recent sessions"
                    icon={HistoryIcon}
                    padded={false}
                    action={sessions.length > 0 && <PanelLink to={`/projects/${project.id}?tab=sessions`}>All</PanelLink>}
                  >
                    {recent.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">No sessions yet.</p>
                    ) : (
                      <ul className="divide-y divide-border/60">
                        {recent.map((s) => (
                          <li key={s.id}>
                            <Link
                              to={`/history?session=${s.id}`}
                              className="group flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
                            >
                              <StatusGlyph session={s} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-xs text-foreground">{s.errorSummary}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {formatRelative(s.at, PREVIEW_NOW)}
                                  {s.status !== "in_progress" && ` · ${formatDuration(s.durationSec)}`}
                                </p>
                              </div>
                              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel title="Open findings" icon={ShieldAlert} action={<PanelLink to="/security">Security</PanelLink>}>
                    {insights.vulnerabilities.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="size-4 text-success" /> No open findings for this project.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {insights.vulnerabilities.map((v) => (
                          <li key={v.id} className="rounded-lg border border-border/70 bg-background/40 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <StatusBadge tone={severityTone(v.severity)}>
                                {v.severity[0].toUpperCase() + v.severity.slice(1)}
                              </StatusBadge>
                              <span className="text-[11px] text-muted-foreground">{formatIsoDay(v.detectedAt)}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-foreground">{v.title}</p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{v.file}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel title="In AI Memory" icon={Brain} padded={false} action={<PanelLink to="/ai-memory">Memory</PanelLink>}>
                    {memory.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Resolved cases from this project will appear here.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border/60">
                        {memory.slice(0, 3).map((c) => (
                          <li key={c.id}>
                            <Link
                              to={`/ai-memory?case=${c.id}`}
                              className="group flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
                            >
                              <ProgressRing value={c.similarity} size={30} stroke={3} tone="info">
                                <span className="text-[9px] font-semibold text-foreground tabular-nums">{c.similarity}</span>
                              </ProgressRing>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] text-foreground">{c.title}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.errorType}</p>
                              </div>
                              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="sessions">
              <motion.div {...tabMotion}>
                <Panel
                  title="Debug sessions"
                  icon={HistoryIcon}
                  padded={false}
                  description={
                    sessions.length
                      ? `The ${sessions.length} most recent of ${project.sessionsCount} sessions. Select one to open it in History.`
                      : undefined
                  }
                  action={sessions.length > 0 && <PanelLink to={`/history?project=${project.id}`}>Open in History</PanelLink>}
                >
                  {sessions.length === 0 ? (
                    <EmptyState
                      icon={Sparkles}
                      title="No sessions yet"
                      description="Paste broken code and its trace into the AI Debugger to run the first one."
                      actionLabel="Start a debug session"
                      onAction={startSession}
                      className="m-4 border-0 bg-transparent py-12"
                    />
                  ) : (
                    <SessionsTable
                      rows={sessions.map((s) => rowFromHistory(s, PREVIEW_NOW))}
                      showProject={false}
                      onOpen={(row) => navigate(`/history?session=${row.id}`)}
                    />
                  )}
                </Panel>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div {...tabMotion} className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Panel title="Project details" icon={Settings2} description="Read-only in this preview.">
                  <dl className="-my-2.5 divide-y divide-border/60">
                    <DetailRow label="Name" copy={project.name}>
                      <span className="font-mono">{project.name}</span>
                    </DetailRow>
                    <DetailRow label="Project ID" copy={project.id}>
                      <span className="font-mono text-muted-foreground">{project.id}</span>
                    </DetailRow>
                    <DetailRow label="Primary language">
                      <LanguageLabel language={project.language} className="text-sm text-foreground" />
                    </DetailRow>
                    <DetailRow label="Created">{formatDate(project.createdAt)}</DetailRow>
                    <DetailRow label="Sessions to date">
                      <span className="tabular-nums">{project.sessionsCount}</span>
                    </DetailRow>
                    <DetailRow label="Repository">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground">Not connected</span>
                        <Tooltip>
                          <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50" />}>
                            <Button size="xs" variant="outline" disabled>
                              <FolderGit2 /> Connect GitHub
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Coming soon — repository sync has no backend yet.</TooltipContent>
                        </Tooltip>
                      </span>
                    </DetailRow>
                  </dl>
                </Panel>

                <div className="space-y-4">
                  <div className="rounded-xl border border-info/25 bg-info/6 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 size-4 shrink-0 text-info" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Nothing to tune here — by design</p>
                        <p className="text-sm text-muted-foreground">
                          Per-project settings have no backend yet. How the AI retrieves context, generates and tests a
                          fix is decided entirely by the backend, so this screen only describes the project.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Panel title="Manage" icon={SlidersHorizontal}>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setRenameKey((k) => k + 1)
                          setRenameOpen(true)
                        }}
                      >
                        <Pencil /> Rename project
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={toggleArchive}>
                        {project.archived ? <ArchiveRestore /> : <Archive />}
                        {project.archived ? "Restore project" : "Archive project"}
                      </Button>
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setDeleteOpen(true)}>
                        <Trash /> Delete project
                      </Button>
                    </div>
                  </Panel>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <RenameProjectDialog
        key={`${project.id}-${renameKey}`}
        project={project}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRenamed={(renamed) => toast.success(`Renamed to ${renamed.name}`)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${project.name}?`}
        description="This removes the project from this workspace. Its preview sessions stay in History, but the project itself can't be restored."
        confirmLabel="Delete project"
        onConfirm={() => {
          const name = project.name
          deleteProject(project.id)
          navigate("/projects")
          toast.success(`Deleted ${name}`)
        }}
      />
    </div>
  )
}
