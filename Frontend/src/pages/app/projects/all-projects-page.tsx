import {
  Archive,
  ArchiveRestore,
  ArrowDownWideNarrow,
  CircleCheck,
  CircleX,
  FolderKanban,
  FolderSearch,
  LayoutGrid,
  List,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Kbd } from "@/components/app/kbd"
import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { PreviewBadge } from "@/components/app/preview-badge"
import { ProgressRing } from "@/components/app/progress-ring"
import { SegmentedControl } from "@/components/app/segmented-control"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { GlowButton } from "@/components/fx/glow-button"
import { NumberTicker } from "@/components/fx/number-ticker"
import { Reveal } from "@/components/fx/reveal"
import { LanguageDot, LanguageLabel } from "@/components/projects/language-chip"
import { ProjectCard, type ProjectView } from "@/components/projects/project-card"
import { CreateProjectDialog, RenameProjectDialog } from "@/components/projects/project-dialogs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { EASE_OUT, SPRING, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import {
  deleteProject,
  getProjectInsights,
  renameProject,
  setProjectArchived,
  useProjects,
  type ProjectRecord,
} from "@/services/mock/projects"
import type { ProjectHealth } from "@/types/domain"

type SortKey = "recent" | "name" | "health"
type HealthFilter = "all" | ProjectHealth

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recent activity",
  name: "Name (A–Z)",
  health: "Health (lowest first)",
}

const VIEW_KEY = "shad:projects-view"

function readView(): ProjectView {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
  } catch {
    return "grid"
  }
}

const HEALTH_FILTERS: { key: ProjectHealth; label: string; icon: typeof CircleCheck; bar: string; text: string }[] = [
  { key: "healthy", label: "Healthy", icon: CircleCheck, bar: "bg-success", text: "text-success" },
  { key: "attention", label: "Needs attention", icon: TriangleAlert, bar: "bg-warning", text: "text-warning" },
  { key: "critical", label: "Critical", icon: CircleX, bar: "bg-destructive", text: "text-destructive" },
]

/** Average health plus a distribution bar whose legend doubles as a filter. */
function FleetHealth({
  projects,
  filter,
  onFilter,
}: {
  projects: ProjectRecord[]
  filter: HealthFilter
  onFilter: (filter: HealthFilter) => void
}) {
  const scored = projects.filter((p) => p.healthScore !== null)
  const avg = scored.length ? Math.round(scored.reduce((sum, p) => sum + (p.healthScore ?? 0), 0) / scored.length) : 0
  const counts = HEALTH_FILTERS.map((h) => ({ ...h, count: scored.filter((p) => p.health === h.key).length }))
  const unscored = projects.length - scored.length
  const tone = avg >= 80 ? "success" : avg >= 60 ? "warning" : "danger"

  return (
    <div className="glass flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-center gap-3">
        <ProgressRing value={avg} size={52} stroke={4.5} tone={tone} animateOnView={false}>
          <span className="text-sm font-semibold text-foreground">
            <NumberTicker value={avg} startOnView={false} />
          </span>
        </ProgressRing>
        <div>
          <p className="text-sm font-medium text-foreground">Fleet health</p>
          <p className="text-xs text-muted-foreground">
            Average of {scored.length} scored project{scored.length === 1 ? "" : "s"}
            {unscored > 0 && ` · ${unscored} new`}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          {counts.map(
            (h, i) =>
              h.count > 0 && (
                <motion.div
                  key={h.key}
                  className={cn(
                    "h-full origin-left rounded-full transition-opacity duration-300",
                    h.bar,
                    filter !== "all" && filter !== h.key && "opacity-25",
                  )}
                  style={{ flexGrow: h.count, flexBasis: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE_OUT }}
                />
              ),
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by health">
          {counts.map((h) => {
            const active = filter === h.key
            return (
              <button
                key={h.key}
                type="button"
                aria-pressed={active}
                disabled={h.count === 0}
                onClick={() => onFilter(active ? "all" : h.key)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40",
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-background/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                )}
              >
                <h.icon className={cn("size-3.5", !active && h.text)} />
                {h.label}
                <span className="tabular-nums opacity-70">{h.count}</span>
              </button>
            )
          })}
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => onFilter("all")}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AllProjectsPage() {
  const ready = usePreviewLoad("projects")
  const navigate = useNavigate()
  const all = useProjects()
  const [query, setQuery] = useState("")
  const [language, setLanguage] = useState("all")
  const [health, setHealth] = useState<HealthFilter>("all")
  const [sort, setSort] = useState<SortKey>("recent")
  const [view, setViewState] = useState<ProjectView>(readView)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  // Targets outlive their dialog's open flag so exit animations keep their content.
  const [renameTarget, setRenameTarget] = useState<{ project: ProjectRecord; key: number } | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  // Stagger the cards only on the first paint after the skeleton.
  const [staggered, setStaggered] = useState(false)

  const active = useMemo(() => all.filter((p) => !p.archived), [all])
  const archived = useMemo(() => all.filter((p) => p.archived), [all])

  const languages = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of active) counts.set(p.language, (counts.get(p.language) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [active])
  const languageItems = useMemo(
    () => ({ all: "All languages", ...Object.fromEntries(languages.map(([l]) => [l, l])) }),
    [languages],
  )
  // A language whose last project was archived/deleted can't stay selected.
  const languageFilter = language === "all" || languages.some(([l]) => l === language) ? language : "all"

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = active.filter(
      (p) =>
        (languageFilter === "all" || p.language === languageFilter) &&
        (health === "all" || (p.healthScore !== null && p.health === health)) &&
        (!q || `${p.name} ${p.description} ${p.language}`.toLowerCase().includes(q)),
    )
    const byName = (a: ProjectRecord, b: ProjectRecord) => a.name.localeCompare(b.name)
    return [...list].sort((a, b) => {
      if (sort === "name") return byName(a, b)
      if (sort === "health") return (a.healthScore ?? 101) - (b.healthScore ?? 101) || byName(a, b)
      return b.lastActivityAt - a.lastActivityAt || byName(a, b)
    })
  }, [active, query, languageFilter, health, sort])

  useEffect(() => {
    if (!ready || staggered) return
    const t = setTimeout(() => setStaggered(true), 900)
    return () => clearTimeout(t)
  }, [ready, staggered])

  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => setHighlightId(null), 2800)
    return () => clearTimeout(t)
  }, [highlightId])

  // "/" focuses search, like most developer tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const setView = (next: ProjectView) => {
    setViewState(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Non-fatal: the layout just won't be remembered.
    }
  }

  const filtersActive = query.trim() !== "" || languageFilter !== "all" || health !== "all"
  const clearFilters = () => {
    setQuery("")
    setLanguage("all")
    setHealth("all")
  }

  const openCreate = () => {
    setCreateKey((k) => k + 1)
    setCreateOpen(true)
  }

  const handleCreated = (project: ProjectRecord) => {
    clearFilters()
    setSort("recent")
    setHighlightId(project.id)
    toast.success(`Created ${project.name}`, {
      description: "Preview only — it lives in this browser session.",
      action: { label: "Open", onClick: () => navigate(`/projects/${project.id}`) },
    })
  }

  const archive = (project: ProjectRecord) => {
    setProjectArchived(project.id, true)
    toast(`Archived ${project.name}`, {
      description: "Hidden from the grid. Its sessions and repairs are kept.",
      action: {
        label: "Undo",
        onClick: () => {
          setProjectArchived(project.id, false)
          toast.success(`Restored ${project.name}`)
        },
      },
    })
  }

  const restore = (project: ProjectRecord) => {
    setProjectArchived(project.id, false)
    toast.success(`Restored ${project.name}`)
  }

  const askRename = (project: ProjectRecord) => {
    setRenameTarget({ project, key: Date.now() })
    setRenameOpen(true)
  }

  const askDelete = (project: ProjectRecord) => {
    setDeleteTarget(project)
    setDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        icon={FolderKanban}
        tone="primary"
        badge={<PreviewBadge />}
        description="Every codebase the healer works on, scored for health. Open one for its sessions, trends and findings."
        actions={
          <GlowButton onClick={openCreate}>
            <Plus /> New project
          </GlowButton>
        }
      />

      {!ready ? (
        <PageSkeleton layout="cards" />
      ) : (
        <>
          <Reveal y={10} blur={false}>
            <FleetHealth projects={active} filter={health} onFilter={setHealth} />
          </Reveal>

          <Reveal y={10} blur={false} delay={0.05}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("")
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="h-8 pr-9 pl-8"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
                )}
              </div>

              <Select value={languageFilter} onValueChange={(v) => v && setLanguage(v)} items={languageItems}>
                <SelectTrigger className="h-8 min-w-36" aria-label="Filter by language">
                  <SelectValue>
                    {(v: string) =>
                      v === "all" ? (
                        "All languages"
                      ) : (
                        <>
                          <LanguageDot language={v} />
                          {v}
                        </>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {languages.map(([lang, count]) => (
                    <SelectItem key={lang} value={lang}>
                      <LanguageDot language={lang} />
                      {lang}
                      <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">{count}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)} items={SORT_LABELS}>
                <SelectTrigger className="h-8 min-w-44" aria-label="Sort projects">
                  <ArrowDownWideNarrow className="text-muted-foreground" />
                  <SelectValue>{(v: SortKey) => SORT_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground tabular-nums lg:inline">
                  {filtered.length} of {active.length}
                </span>
                {archived.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setArchivedOpen(true)}>
                    <Archive /> {archived.length} archived
                  </Button>
                )}
                <SegmentedControl
                  aria-label="Layout"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "grid", label: <span className="sr-only sm:not-sr-only">Grid</span>, icon: <LayoutGrid /> },
                    { value: "list", label: <span className="sr-only sm:not-sr-only">List</span>, icon: <List /> },
                  ]}
                />
              </div>
            </div>
          </Reveal>

          {filtered.length === 0 ? (
            active.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create a project to group one codebase's debug sessions, repairs and memory."
                actionLabel="New project"
                onAction={openCreate}
                secondaryLabel={archived.length ? `View ${archived.length} archived` : undefined}
                onSecondary={archived.length ? () => setArchivedOpen(true) : undefined}
              />
            ) : (
              <EmptyState
                icon={FolderSearch}
                title="No projects match"
                description={
                  query.trim()
                    ? `Nothing matches “${query.trim()}” with the current filters.`
                    : "No project matches the current filters."
                }
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            )
          ) : (
            <LayoutGroup>
              <div
                className={cn(
                  "relative",
                  view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2",
                )}
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((project, i) => (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: EASE_OUT } }}
                      transition={{
                        default: { ...SPRING_SOFT, delay: staggered ? 0 : i * 0.055 },
                        layout: SPRING,
                      }}
                      className="min-w-0"
                    >
                      <ProjectCard
                        project={project}
                        view={view}
                        sessionsTrend={getProjectInsights(project).sessionsTrend}
                        highlighted={highlightId === project.id}
                        onRename={askRename}
                        onArchive={archive}
                        onDelete={askDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          )}

          {filtersActive && filtered.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Showing {filtered.length} of {active.length} projects ·{" "}
              <button type="button" onClick={clearFilters} className="text-primary hover:underline">
                Clear filters
              </button>
            </p>
          )}
        </>
      )}

      <CreateProjectDialog key={`create-${createKey}`} open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

      <RenameProjectDialog
        key={`rename-${renameTarget?.key ?? 0}`}
        project={renameTarget?.project ?? null}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRenamed={(project, previous) =>
          toast.success(`Renamed to ${project.name}`, {
            action: {
              label: "Undo",
              onClick: () => {
                renameProject(project.id, previous)
                toast(`Name restored to ${previous}`)
              },
            },
          })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${deleteTarget?.name ?? "project"}?`}
        description="This removes the project from this workspace. Its preview sessions stay in History, but the project itself can't be restored."
        confirmLabel="Delete project"
        onConfirm={() => {
          if (!deleteTarget) return
          deleteProject(deleteTarget.id)
          toast.success(`Deleted ${deleteTarget.name}`)
        }}
      />

      <Dialog open={archivedOpen} onOpenChange={setArchivedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archived projects</DialogTitle>
            <DialogDescription>Restore a project to bring it back to the grid with everything attached.</DialogDescription>
          </DialogHeader>
          {archived.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing archived.
            </p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {archived.map((project) => (
                  <motion.li
                    key={project.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                  >
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-medium text-foreground">{project.name}</p>
                        <LanguageLabel language={project.language} className="mt-0.5" />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => restore(project)}>
                        <ArchiveRestore /> Restore
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
