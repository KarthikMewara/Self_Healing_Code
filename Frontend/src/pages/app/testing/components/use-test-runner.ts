import { useCallback, useEffect, useRef, useState } from "react"

import { useMotionPreference } from "@/components/motion-preference"
import {
  REGRESSION_CASES,
  RUN_HISTORY_SEED,
  regressionOutcome,
  type RegressionCase,
  type RegressionStatus,
  type RunRecord,
  type SuiteTest,
  type TestSuite,
} from "@/services/mock/testing"

import { buildRunPlan, type RunPlan } from "./run-plan"

// ---------------------------------------------------------------------------
// Suite runner -- plays a RunPlan back frame by frame
// ---------------------------------------------------------------------------

export interface ActiveRun extends RunPlan {
  id: string
  suite: TestSuite
  runNumber: number
  /** Frames applied so far. */
  index: number
  status: "running" | "done" | "cancelled"
  startedAt: number
}

export interface TestRunnerApi {
  run: ActiveRun | null
  history: RunRecord[]
  start: (suite: TestSuite, added: SuiteTest[]) => void
  cancel: () => void
}

/** Owned by the page so a run keeps going while you look at another tab. */
export function useTestRunner(onFinish: (run: ActiveRun, record: RunRecord) => void): TestRunnerApi {
  const { reduced } = useMotionPreference()
  const [run, setRun] = useState<ActiveRun | null>(null)
  const [history, setHistory] = useState<RunRecord[]>(RUN_HISTORY_SEED)
  const runCounts = useRef<Record<string, number>>({})
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const start = useCallback(
    (suite: TestSuite, added: SuiteTest[]) => {
      const runNumber = (runCounts.current[suite.id] ?? 0) + 1
      runCounts.current[suite.id] = runNumber
      const plan = buildRunPlan(suite, added, runNumber, reduced ? 0.15 : 1)
      setRun({
        ...plan,
        id: `run_${Date.now().toString(36)}`,
        suite,
        runNumber,
        index: 0,
        status: "running",
        startedAt: Date.now(),
      })
    },
    [reduced],
  )

  useEffect(() => {
    if (!run || run.status !== "running") return
    const frame = run.frames[run.index]
    if (!frame) return
    const timer = setTimeout(() => {
      const next = run.index + 1
      if (next < run.frames.length) {
        setRun({ ...run, index: next })
        return
      }
      const finished: ActiveRun = { ...run, index: next, status: "done" }
      const record: RunRecord = {
        id: run.id,
        suiteId: run.suite.id,
        name: run.suite.name,
        status: run.totals.failed ? "failed" : "passed",
        passCount: run.totals.passed,
        failCount: run.totals.failed,
        durationMs: run.totals.durationMs,
        ranAt: "Just now",
        trigger: "Manual · you",
        at: Date.now(),
      }
      setRun(finished)
      setHistory((prev) => [record, ...prev])
      onFinishRef.current(finished, record)
    }, frame.delay)
    return () => clearTimeout(timer)
  }, [run])

  const cancel = useCallback(() => {
    setRun((r) => (r && r.status === "running" ? { ...r, status: "cancelled" } : r))
  }, [])

  return { run, history, start, cancel }
}

// ---------------------------------------------------------------------------
// Regression re-runs
// ---------------------------------------------------------------------------

export type RegressionRowStatus = RegressionStatus | "queued" | "running"

export interface RegressionRow extends RegressionCase {
  status: RegressionRowStatus
  /** Keyed history so new results slide in and old ones slide out. */
  trail: { key: string; status: RegressionStatus }[]
  attempts: number
  /** Epoch ms of the last re-run this session. */
  ranAt?: number
}

export interface RegressionApi {
  rows: RegressionRow[]
  busy: boolean
  rerun: (ids: string[], onComplete?: (results: { id: string; outcome: RegressionStatus }[]) => void) => void
}

export function useRegressionRuns(): RegressionApi {
  const { reduced } = useMotionPreference()
  const [rows, setRows] = useState<RegressionRow[]>(() =>
    REGRESSION_CASES.map((c) => ({
      ...c,
      status: c.lastStatus,
      attempts: 0,
      trail: c.history.map((status, i) => ({ key: `${c.id}-h${i}`, status })),
    })),
  )
  const attempts = useRef<Record<string, number>>({})
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => clearTimeout(t))
  }, [])

  const rerun = useCallback<RegressionApi["rerun"]>(
    (ids, onComplete) => {
      const results: { id: string; outcome: RegressionStatus }[] = []
      const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
      const set = (id: string, patch: (r: RegressionRow) => Partial<RegressionRow>) =>
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch(r) } : r)))

      ids.forEach((id, i) => {
        const test = REGRESSION_CASES.find((c) => c.id === id)
        if (!test) return
        const startAt = i * (reduced ? 40 : 240)
        const runFor = (reduced ? 0.25 : 1) * Math.min(1900, 550 + test.durationMs * 0.4)
        set(id, () => ({ status: startAt ? "queued" : "running" }))
        if (startAt) later(() => set(id, () => ({ status: "running" })), startAt)
        later(() => {
          const attempt = (attempts.current[id] ?? 0) + 1
          attempts.current[id] = attempt
          const outcome = regressionOutcome(test, attempt)
          results.push({ id, outcome })
          set(id, (r) => ({
            status: outcome,
            lastStatus: outcome,
            attempts: attempt,
            ranAt: Date.now(),
            trail: [...r.trail.slice(1), { key: `${id}-r${attempt}`, status: outcome }],
          }))
          if (results.length === ids.length) onComplete?.(results)
        }, startAt + runFor)
      })
    },
    [reduced],
  )

  const busy = rows.some((r) => r.status === "running" || r.status === "queued")
  return { rows, busy, rerun }
}
