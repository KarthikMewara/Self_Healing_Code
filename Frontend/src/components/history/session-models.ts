// View models for session rows and the session detail sheet. Preview sessions
// come from src/services/mock/history.ts; live ones are REAL heals finished (or
// running) in this browser tab, read from the debug workspace context.

import type { StatusTone } from "@/components/status-badge"
import type { CompletedHeal, TimedStatusEvent, WorkspaceStatus } from "@/context/debug-workspace"
import { parseStackTrace } from "@/lib/stack-trace"
import { PIPELINE_STEPS, repairForSession, type HistorySession, type StageState } from "@/services/mock/history"
import { memoryForSession } from "@/services/mock/memory"
import type { HealRequest, HealStep } from "@/types/contract"
import type { SessionStatus } from "@/types/domain"

export const STATUS_META: Record<SessionStatus, { label: string; tone: StatusTone }> = {
  resolved: { label: "Resolved", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  in_progress: { label: "In progress", tone: "pending" },
}

export const STEP_LABELS: Record<HealStep, string> = {
  retrieval: "Retrieval",
  analysis: "Analysis",
  generation: "Generation",
  testing: "Testing",
}

/** Row id of a heal that is running right now (it has no session id yet). */
export const IN_FLIGHT_ID = "in-flight"

export interface SessionRow {
  id: string
  status: SessionStatus
  errorSummary: string
  language: string
  projectId?: string
  projectName?: string
  at: number
  /** Relative-time anchor: preview "now" for mock rows, the real clock for live ones. */
  now: number
  durationSec?: number
  /** A real heal from this browser session. */
  live?: boolean
  /** In-flight heals: the stage it is on. */
  runningStep?: HealStep
}

export interface DetailStage {
  step: HealStep
  state: StageState
  message: string
  durationSec?: number
}

export interface SessionDetailModel {
  id: string
  status: SessionStatus
  errorSummary: string
  language: string
  projectId?: string
  projectName?: string
  at: number
  now: number
  durationSec?: number
  attempts?: number
  tests?: { passed: number; total: number }
  file?: string
  stages: DetailStage[]
  stagesNote?: string
  fixSummary?: string
  outcomeNote?: string
  live: boolean
  running: boolean
  /** Offer "Open in Self Healing" (the current result, or the heal in flight). */
  selfHealing: "result" | "live" | null
  repair?: { id: string; summary: string }
  memoryCase?: { id: string; title: string; similarity: number }
}

export function rowFromHistory(s: HistorySession, now: number): SessionRow {
  return {
    id: s.id,
    status: s.status,
    errorSummary: s.errorSummary,
    language: s.language,
    projectId: s.projectId,
    projectName: s.projectName,
    at: s.at,
    now,
    durationSec: s.durationSec,
  }
}

export function detailFromHistory(s: HistorySession, now: number): SessionDetailModel {
  const repair = repairForSession(s.id)
  const memory = memoryForSession(s.id)
  return {
    id: s.id,
    status: s.status,
    errorSummary: s.errorSummary,
    language: s.language,
    projectId: s.projectId,
    projectName: s.projectName,
    at: s.at,
    now,
    durationSec: s.durationSec,
    attempts: s.attempts,
    tests: s.tests,
    file: s.file,
    stages: s.stages,
    fixSummary: s.fixSummary,
    outcomeNote: s.outcomeNote,
    live: false,
    running: s.status === "in_progress",
    selfHealing: null,
    repair: repair ? { id: repair.id, summary: repair.summary } : undefined,
    memoryCase: memory ? { id: memory.id, title: memory.title, similarity: memory.similarity } : undefined,
  }
}

/** The live slice of the debug workspace these models read. */
export interface LiveWorkspace {
  status: WorkspaceStatus
  request: HealRequest | null
  statusEvents: TimedStatusEvent[]
  startedAt: number | null
  finishedAt: number | null
  result: { session_id: string } | null
  errorMessage: string | null
  completed: CompletedHeal[]
}

export function summarizeTrace(trace: string) {
  const { errorType, message } = parseStackTrace(trace)
  if (errorType) return `${errorType}: ${message ?? ""}`.trim()
  return trace.split("\n")[0]?.slice(0, 120) || "Unknown error"
}

function currentStep(events: TimedStatusEvent[]): HealStep {
  return events[events.length - 1]?.step ?? "retrieval"
}

/** Real heals from this tab, newest first -- the in-flight one on top. */
export function liveRows(ws: LiveWorkspace, now: number): SessionRow[] {
  const rows: SessionRow[] = ws.completed.map((c) => ({
    id: c.sessionId,
    status: c.outcome === "resolved" ? "resolved" : "failed",
    errorSummary: c.errorSummary,
    language: c.language,
    at: c.finishedAt,
    now,
    durationSec: c.durationMs / 1000,
    live: true,
  }))
  if (ws.status === "analyzing" && ws.request) {
    rows.unshift({
      id: IN_FLIGHT_ID,
      status: "in_progress",
      errorSummary: summarizeTrace(ws.request.error_trace),
      language: ws.request.language,
      at: ws.startedAt ?? now,
      now,
      live: true,
      runningStep: currentStep(ws.statusEvents),
    })
  }
  return rows
}

/** Stages rebuilt from the real telemetry events of the latest run. */
function stagesFromEvents(events: TimedStatusEvent[], endAt: number | null, outcome: "resolved" | "failed" | "running") {
  return PIPELINE_STEPS.map((step, i): DetailStage => {
    const event = events.find((e) => e.step === step)
    const next = events.find((e) => PIPELINE_STEPS.indexOf(e.step) > i)
    if (!event) {
      return {
        step,
        state: outcome === "running" ? (i === 0 && events.length === 0 ? "running" : "pending") : "done",
        message: outcome === "running" ? (i === 0 ? "Starting the pipeline…" : "Waiting for the previous stage.") : "No telemetry received for this stage.",
      }
    }
    const isLast = !next
    const until = next?.at ?? (outcome === "running" ? undefined : endAt ?? undefined)
    let state: StageState = "done"
    if (isLast && outcome === "running") state = "running"
    if (isLast && outcome === "failed") state = "failed"
    return {
      step,
      state,
      message: event.message,
      durationSec: until !== undefined ? Math.max(0, (until - event.at) / 1000) : undefined,
    }
  })
}

export function liveDetail(id: string, ws: LiveWorkspace, now: number): SessionDetailModel | undefined {
  if (id === IN_FLIGHT_ID) {
    if (ws.status !== "analyzing" || !ws.request) return undefined
    return {
      id,
      status: "in_progress",
      errorSummary: summarizeTrace(ws.request.error_trace),
      language: ws.request.language,
      at: ws.startedAt ?? now,
      now,
      durationSec: ws.startedAt ? (now - ws.startedAt) / 1000 : undefined,
      stages: stagesFromEvents(ws.statusEvents, null, "running"),
      stagesNote: "Live telemetry from the heal running in this tab.",
      live: true,
      running: true,
      selfHealing: "live",
    }
  }

  const heal = ws.completed.find((c) => c.sessionId === id)
  if (!heal) return undefined
  // Stage telemetry in the workspace belongs to the most recent finished run.
  const isLatest = ws.completed[0]?.sessionId === id && ws.status !== "analyzing" && ws.statusEvents.length > 0
  const outcome = heal.outcome
  const stages: DetailStage[] = isLatest
    ? stagesFromEvents(ws.statusEvents, ws.finishedAt ?? heal.finishedAt, outcome)
    : PIPELINE_STEPS.map((step, i) => ({
        step,
        state: outcome === "failed" && i === PIPELINE_STEPS.length - 1 ? "failed" : "done",
        message: "Completed — per-stage telemetry isn't kept for older runs.",
      }))

  return {
    id,
    status: outcome === "resolved" ? "resolved" : "failed",
    errorSummary: heal.errorSummary,
    language: heal.language,
    at: heal.finishedAt,
    now,
    durationSec: heal.durationMs / 1000,
    stages,
    stagesNote: isLatest
      ? "Real telemetry from this browser session."
      : "Stage timings are kept for the most recent run in this tab only.",
    outcomeNote:
      outcome === "failed"
        ? isLatest && ws.errorMessage
          ? ws.errorMessage
          : "This heal ended with an error. The message is only kept for the most recent run."
        : undefined,
    live: true,
    running: false,
    selfHealing: ws.status === "complete" && ws.result?.session_id === id ? "result" : null,
  }
}
