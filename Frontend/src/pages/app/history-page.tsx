import {
  Bug,
  Download,
  History as HistoryIcon,
  Search,
  SearchX,
  Wrench,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Kbd } from "@/components/app/kbd"
import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { Panel } from "@/components/app/panel"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { Reveal } from "@/components/fx/reveal"
import { RepairTimeline, type RepairBusy, type RepairEntryView } from "@/components/history/repair-timeline"
import { SessionDetailSheet } from "@/components/history/session-detail-sheet"
import {
  detailFromHistory,
  IN_FLIGHT_ID,
  liveDetail,
  liveRows,
  rowFromHistory,
  type SessionDetailModel,
  type SessionRow,
} from "@/components/history/session-models"
import { SessionsTable } from "@/components/history/sessions-table"
import { useMotionPreference } from "@/components/motion-preference"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"
import {
  findHistorySession,
  getRepairState,
  historySessions,
  PREVIEW_NOW,
  repairRecords,
  setRepairState,
  useRepairStates,
  type RepairRecord,
} from "@/services/mock/history"
import { getProjects } from "@/services/mock/projects"
import { getHealingHistory } from "@/services/heal-api"
import type { LiveHistoryItem } from "@/types/contract"
import type { SessionStatus } from "@/types/domain"

type View = "sessions" | "repairs"
type StatusFilter = "all" | SessionStatus
type RepairFilter = "all" | "applied" | "rolled_back" | "locked"

const PREVIEW_ROWS = historySessions.map((s) => rowFromHistory(s, PREVIEW_NOW))

function without<T>(record: Record<string, T>, key: string) {
  const next = { ...record }
  delete next[key]
  return next
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Wall clock for live rows; ticks faster while a heal is running. */
function useNow(fast: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), fast ? 1000 : 15_000)
    return () => clearInterval(t)
  }, [fast])
  return now
}

export default function HistoryPage() {
  const ready = usePreviewLoad("history")
  const { reduced } = useMotionPreference()
  const ws = useDebugWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionParam = searchParams.get("session")
  const repairParam = searchParams.get("repair")
  const projectParam = searchParams.get("project")
  const view: View = searchParams.get("view") === "repairs" && !sessionParam ? "repairs" : "sessions"

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shownModel, setShownModel] = useState<SessionDetailModel | null>(null)
  const [highlight, setHighlight] = useState<{ id: string; nonce: number } | null>(null)
  const [repairHighlight, setRepairHighlight] = useState<{ id: string; nonce: number } | null>(null)
  const [repairFilter, setRepairFilter] = useState<RepairFilter>("all")
  const [rollbackTarget, setRollbackTarget] = useState<RepairRecord | null>(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [busy, setBusy] = useState<Record<string, RepairBusy>>({})
  const repairStates = useRepairStates()
  const searchRef = useRef<HTMLInputElement>(null)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId

  const running = ws.status === "analyzing"
  const now = useNow(running)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }

  const updateParams = (patch: Record<string, string | null>) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )

  const setView = (next: View) => updateParams({ view: next === "repairs" ? "repairs" : null, session: null, repair: null })

  // ---------------------------------------------------------------------------
  // Sessions (Live SQLite sessions.db + In-memory + Preview)
  // ---------------------------------------------------------------------------

  const [dbSessions, setDbSessions] = useState<LiveHistoryItem[]>([])

  useEffect(() => {
    getHealingHistory()
      .then((res) => {
        if (res.status === "success" && Array.isArray(res.data)) {
          setDbSessions(res.data)
        }
      })
      .catch((e) => console.warn("Failed to fetch SQLite sessions:", e))
  }, [])

  const dbRows: SessionRow[] = useMemo(() => {
    return dbSessions.map((item, idx) => {
      const isPy = item.original_code.includes("def ") || item.original_code.includes("import ")
      const isJs = item.original_code.includes("function") || item.original_code.includes("const ")
      const lang = isPy ? "python" : isJs ? "javascript" : "typescript"
      const firstLine = item.original_code.split("\n")[0] || "Code Repair Session"
      return {
        id: item.session_id,
        status: "resolved",
        errorSummary: `${item.session_id.slice(0, 8)}: ${firstLine.slice(0, 45)}`,
        language: lang,
        projectName: "Self-Healing Engine (SQLite)",
        at: now - (idx + 1) * 30_000,
        now,
        live: true,
      }
    })
  }, [dbSessions, now])

  const live = useMemo(() => liveRows(ws, now), [ws, now])
  const allRows = useMemo(() => [...live, ...dbRows, ...PREVIEW_ROWS], [live, dbRows])
  const allRowsRef = useRef(allRows)
  allRowsRef.current = allRows

  const projectName = projectParam
    ? (getProjects().find((p) => p.id === projectParam)?.name ??
      historySessions.find((s) => s.projectId === projectParam)?.projectName ??
      projectParam)
    : null

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter(
      (r) =>
        (!projectParam || r.projectId === projectParam) &&
        (!q ||
          `${r.id} ${r.errorSummary} ${r.projectName ?? "ai debugger"} ${LANGUAGE_LABELS[toLanguageKey(r.language)]}`
            .toLowerCase()
            .includes(q)),
    )
  }, [allRows, projectParam, query])

  const counts = useMemo(
    () => ({
      all: scoped.length,
      resolved: scoped.filter((r) => r.status === "resolved").length,
      failed: scoped.filter((r) => r.status === "failed").length,
      in_progress: scoped.filter((r) => r.status === "in_progress").length,
    }),
    [scoped],
  )

  const visibleRows = useMemo(
    () => (statusFilter === "all" ? scoped : scoped.filter((r) => r.status === statusFilter)),
    [scoped, statusFilter],
  )

  const model = useMemo<SessionDetailModel | null>(() => {
    if (!selectedId) return null
    const dbMatch = dbSessions.find((s) => s.session_id === selectedId)
    if (dbMatch) {
      return {
        id: dbMatch.session_id,
        status: "resolved",
        errorSummary: `SQLite Session: ${dbMatch.session_id}`,
        language: dbMatch.original_code.includes("def ") ? "python" : "javascript",
        projectName: "Self-Healing Engine (SQLite)",
        at: now,
        now,
        live: true,
        running: false,
        selfHealing: "result",
        fixSummary: dbMatch.explanation,
        outcomeNote: "Historical fix retrieved from SQLite database memory.",
        stages: [
          { step: "retrieval", state: "done", message: "Retrieved matched AST context from ChromaDB" },
          { step: "analysis", state: "done", message: "Formulated patch with OmniRoute" },
          { step: "generation", state: "done", message: "Verified AST invariant" },
          { step: "testing", state: "done", message: "Saved to sessions.db" },
        ],
      }
    }
    const mock = findHistorySession(selectedId)
    if (mock) return detailFromHistory(mock, PREVIEW_NOW)
    return liveDetail(selectedId, ws, now) ?? null
  }, [selectedId, ws, now, dbSessions])
  // Keep the last model around so the sheet's exit animation has content.
  if (model && model !== shownModel) setShownModel(model)

  const openSession = (id: string) => {
    selectedRef.current = id
    setSelectedId(id)
    updateParams({ session: id, view: null, repair: null })
  }

  const closeSession = () => {
    selectedRef.current = null
    setSelectedId(null)
    updateParams({ session: null })
  }

  // Deep link: /history?session=<id> scrolls to the row, pulses it, opens it.
  useEffect(() => {
    if (!ready || !sessionParam || sessionParam === selectedRef.current) return
    const exists = allRowsRef.current.some((r) => r.id === sessionParam)
    if (!exists) {
      toast.error("Session not found", { description: `${sessionParam} isn't in this preview's history.` })
      updateParams({ session: null })
      return
    }
    setStatusFilter("all")
    setQuery("")
    if (projectParam && !allRowsRef.current.some((r) => r.id === sessionParam && r.projectId === projectParam)) {
      updateParams({ project: null })
    }
    setHighlight({ id: sessionParam, nonce: Date.now() })
    const scroll = setTimeout(() => {
      document
        .getElementById(`session-row-${sessionParam}`)
        ?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
    }, 120)
    const open = setTimeout(() => {
      selectedRef.current = sessionParam
      setSelectedId(sessionParam)
    }, 700)
    return () => {
      clearTimeout(scroll)
      clearTimeout(open)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sessionParam])

  // Watching the in-flight heal? Follow it to its finished record.
  const latestCompleted = ws.completed[0]?.sessionId
  useEffect(() => {
    if (selectedRef.current === IN_FLIGHT_ID && ws.status !== "analyzing" && latestCompleted) {
      openSession(latestCompleted)
      setHighlight({ id: latestCompleted, nonce: Date.now() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.status, latestCompleted])

  // ---------------------------------------------------------------------------
  // Repairs
  // ---------------------------------------------------------------------------

  const repairEntries = useMemo<RepairEntryView[]>(
    () =>
      repairRecords.map((record) => ({
        record,
        state: repairStates[record.id]?.state ?? "applied",
        changedAt: repairStates[record.id]?.changedAt,
        busy: busy[record.id],
      })),
    [repairStates, busy],
  )

  const projectRepairs = useMemo(
    () => repairEntries.filter((e) => !projectParam || e.record.projectId === projectParam),
    [repairEntries, projectParam],
  )

  const repairCounts = useMemo(
    () => ({
      all: projectRepairs.length,
      applied: projectRepairs.filter((e) => e.record.canRollback && e.state === "applied").length,
      rolled_back: projectRepairs.filter((e) => e.state === "rolled_back").length,
      locked: projectRepairs.filter((e) => !e.record.canRollback).length,
    }),
    [projectRepairs],
  )

  const visibleRepairs = useMemo(
    () =>
      projectRepairs.filter((e) => {
        if (repairFilter === "applied") return e.record.canRollback && e.state === "applied"
        if (repairFilter === "rolled_back") return e.state === "rolled_back"
        if (repairFilter === "locked") return !e.record.canRollback
        return true
      }),
    [projectRepairs, repairFilter],
  )

  const focusRepair = (id: string) => {
    setRepairFilter("all")
    setRepairHighlight({ id, nonce: Date.now() })
    later(() => {
      document.getElementById(`repair-${id}`)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
    }, 350)
  }

  // Deep link: /history?repair=<id>
  useEffect(() => {
    if (!ready || !repairParam) return
    if (!repairRecords.some((r) => r.id === repairParam)) return
    updateParams({ view: "repairs", session: null })
    focusRepair(repairParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, repairParam])

  const viewRepairFromSheet = (repairId: string) => {
    closeSession()
    updateParams({ view: "repairs", session: null, repair: repairId })
  }

  const startRollback = (record: RepairRecord) => {
    if (!record.canRollback || getRepairState(record.id) !== "applied") return
    setBusy((b) => ({ ...b, [record.id]: "rolling_back" }))
    later(() => {
      setRepairState(record.id, "rolled_back")
      setBusy((b) => without(b, record.id))
      toast.success(`Rolled back in ${record.projectName}`, {
        description: `“${record.summary}” · preview only, no repository was changed.`,
        action: { label: "Restore", onClick: () => startRestore(record) },
      })
    }, 1400)
  }

  const startRestore = (record: RepairRecord) => {
    // A toast's "Restore" can outlive the state it was offered for.
    if (getRepairState(record.id) !== "rolled_back") return
    setBusy((b) => ({ ...b, [record.id]: "restoring" }))
    later(() => {
      setRepairState(record.id, "applied")
      setBusy((b) => without(b, record.id))
      toast.success("Fix restored", { description: `Re-applied “${record.summary}” in ${record.projectName}.` })
    }, 1100)
  }

  // ---------------------------------------------------------------------------

  // "/" focuses the session search.
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

  const exportCurrent = () => {
    if (view === "sessions") {
      downloadCsv("debug-sessions.csv", [
        ["session_id", "status", "project", "language", "error", "started_at", "duration_seconds"],
        ...visibleRows.map((r: SessionRow) => [
          r.id,
          r.status,
          r.projectName ?? "ai-debugger",
          LANGUAGE_LABELS[toLanguageKey(r.language)],
          r.errorSummary,
          new Date(r.at).toISOString(),
          r.durationSec !== undefined ? Math.round(r.durationSec) : "",
        ]),
      ])
      toast.success(`Exported ${visibleRows.length} session${visibleRows.length === 1 ? "" : "s"}`, {
        description: "debug-sessions.csv",
      })
    } else {
      downloadCsv("repair-history.csv", [
        ["repair_id", "session_id", "project", "summary", "applied_at", "state", "can_roll_back"],
        ...visibleRepairs.map((e) => [
          e.record.id,
          e.record.sessionId,
          e.record.projectName,
          e.record.summary,
          new Date(e.record.at).toISOString(),
          e.state,
          e.record.canRollback ? "yes" : "no",
        ]),
      ])
      toast.success(`Exported ${visibleRepairs.length} repair${visibleRepairs.length === 1 ? "" : "s"}`, {
        description: "repair-history.csv",
      })
    }
  }

  const clearSessionFilters = () => {
    setQuery("")
    setStatusFilter("all")
    updateParams({ project: null })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        icon={HistoryIcon}
        tone="primary"
        badge={<PreviewBadge />}
        description={
          <>
            The audit log — every debug session and every applied repair, exactly as it happened. For the patterns the AI
            learned from them, see{" "}
            <Link to="/ai-memory" className="text-primary hover:underline">
              AI Memory
            </Link>
            .
          </>
        }
        actions={
          <Button variant="outline" onClick={exportCurrent} disabled={!ready}>
            <Download /> Export CSV
          </Button>
        }
      />

      {!ready ? (
        <PageSkeleton layout="table" />
      ) : (
        <>
          <Reveal y={8} blur={false}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="no-scrollbar max-w-full overflow-x-auto">
                <SegmentedControl
                  aria-label="History view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "sessions", label: "Debug sessions", icon: <Bug />, count: allRows.length },
                    { value: "repairs", label: "Repair history", icon: <Wrench />, count: repairRecords.length },
                  ]}
                />
              </div>
              {projectName && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/50 pr-1 pl-3 text-xs text-foreground">
                  Project: <span className="font-mono font-medium">{projectName}</span>
                  <button
                    type="button"
                    aria-label="Show all projects"
                    onClick={() => updateParams({ project: null })}
                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>
          </Reveal>

          <AnimatePresence mode="wait" initial={false}>
            {view === "sessions" ? (
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="scrollbar-thin max-w-full overflow-x-auto">
                    <SegmentedControl
                      size="sm"
                      aria-label="Filter by status"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "all", label: "All", count: counts.all },
                        { value: "resolved", label: "Resolved", count: counts.resolved },
                        { value: "failed", label: "Failed", count: counts.failed },
                        { value: "in_progress", label: "In progress", count: counts.in_progress },
                      ]}
                    />
                  </div>
                  <div className="relative ml-auto min-w-0 flex-1 basis-56 sm:max-w-xs">
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
                      placeholder="Search errors, projects, ids…"
                      aria-label="Search sessions"
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
                </div>

                {visibleRows.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title="No sessions match"
                    description={
                      query.trim()
                        ? `Nothing matches “${query.trim()}” with the current filters.`
                        : "No session matches the current filters."
                    }
                    actionLabel="Clear filters"
                    onAction={clearSessionFilters}
                  />
                ) : (
                  <Panel
                    padded={false}
                    title="Debug sessions"
                    icon={Bug}
                    description={
                      live.length
                        ? `${visibleRows.filter((r) => r.live).length} real heals from this browser session · ${visibleRows.filter((r) => !r.live).length} preview sessions`
                        : "Select a session for its pipeline timeline. Heals you run in the AI Debugger appear at the top."
                    }
                  >
                    <SessionsTable rows={visibleRows} highlight={highlight} onOpen={(row) => openSession(row.id)} />
                  </Panel>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="repairs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="scrollbar-thin max-w-full overflow-x-auto">
                    <SegmentedControl
                      size="sm"
                      aria-label="Filter repairs"
                      value={repairFilter}
                      onChange={setRepairFilter}
                      options={[
                        { value: "all", label: "All", count: repairCounts.all },
                        { value: "applied", label: "Applied", count: repairCounts.applied },
                        { value: "rolled_back", label: "Rolled back", count: repairCounts.rolled_back },
                        { value: "locked", label: "Locked", count: repairCounts.locked },
                      ]}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Rollbacks here are simulated — no repository is changed.</p>
                </div>

                {visibleRepairs.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title={repairFilter === "rolled_back" ? "Nothing rolled back" : "No repairs here"}
                    description={
                      repairFilter === "rolled_back"
                        ? "Every applied fix is still in place. Roll one back from the timeline to see it here."
                        : "No repair matches the current filter."
                    }
                    actionLabel="Show all repairs"
                    onAction={() => {
                      setRepairFilter("all")
                      updateParams({ project: null })
                    }}
                  />
                ) : (
                  <RepairTimeline
                    entries={visibleRepairs}
                    now={PREVIEW_NOW}
                    clock={now}
                    highlight={repairHighlight}
                    onRollback={(record) => {
                      setRollbackTarget(record)
                      setRollbackOpen(true)
                    }}
                    onRestore={startRestore}
                    onOpenSession={openSession}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <SessionDetailSheet
        model={model ?? shownModel}
        open={Boolean(model)}
        onOpenChange={(open) => !open && closeSession()}
        onViewRepair={viewRepairFromSheet}
      />

      <ConfirmDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        title="Roll back this fix?"
        description={
          rollbackTarget
            ? `This reverts “${rollbackTarget.summary}” in ${rollbackTarget.projectName} and marks the repair as rolled back. You can restore it from this timeline afterwards.`
            : ""
        }
        confirmLabel="Roll back"
        onConfirm={() => rollbackTarget && startRollback(rollbackTarget)}
      />
    </div>
  )
}
