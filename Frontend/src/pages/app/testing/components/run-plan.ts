// Turns a suite into a scripted, deterministic "run": a list of frames the
// runner plays back with timers. Each frame may append log lines, move one
// test to a new state and update the counters. Nothing here executes tests.

import { createRng, hashSeed } from "@/services/mock/prng"
import {
  logFileDone,
  logPreamble,
  logSummary,
  logTest,
  testFails,
  type LogLine,
  type RunTotals,
  type SuiteFile,
  type SuiteTest,
  type TestSuite,
} from "@/services/mock/testing"

export type TestState = "pending" | "running" | "passed" | "failed"

export interface RunFrame {
  delay: number
  logs: LogLine[]
  test?: { id: string; state: TestState; ms?: number }
  /** Index into `files` whose aggregate ("+N more") just finished. */
  fileDone?: number
  progress: number
  passed: number
  failed: number
}

export interface RunPlan {
  files: SuiteFile[]
  frames: RunFrame[]
  totals: RunTotals
  /** Tests that failed in this run, in order. */
  failures: SuiteTest[]
}

export function suiteFiles(suite: TestSuite, added: SuiteTest[]): SuiteFile[] {
  if (!added.length) return suite.files
  const ext = suite.language === "python" ? "py" : suite.language === "go" ? "go" : suite.language === "java" ? "java" : "ts"
  return [...suite.files, { path: `generated/ai_generated.test.${ext}`, tests: added, extra: 0, extraMs: 0 }]
}

/** What the UI shows after the first `index` frames have played. */
export function deriveRunView(frames: RunFrame[], index: number) {
  const applied = frames.slice(0, index)
  const logs: LogLine[] = []
  const tests = new Map<string, { state: TestState; ms?: number }>()
  const doneFiles = new Set<number>()
  for (const frame of applied) {
    logs.push(...frame.logs)
    if (frame.test) tests.set(frame.test.id, frame.test)
    if (frame.fileDone != null) doneFiles.add(frame.fileDone)
  }
  const last = applied[applied.length - 1]
  return {
    logs,
    tests,
    doneFiles,
    progress: last?.progress ?? 0,
    passed: last?.passed ?? 0,
    failed: last?.failed ?? 0,
  }
}

/**
 * @param runNumber 1-based count of runs of this suite this session (drives flaky tests)
 * @param speed     1 = normal pacing (~5s per suite); lower is faster (reduced motion)
 */
export function buildRunPlan(suite: TestSuite, added: SuiteTest[], runNumber: number, speed = 1): RunPlan {
  const files = suiteFiles(suite, added)
  const total = files.reduce((n, f) => n + f.tests.length + f.extra, 0)
  const rand = createRng(hashSeed(`${suite.id}#${runNumber}`))
  const baseMs = suite.files.reduce((n, f) => n + f.extraMs + f.tests.reduce((a, t) => a + t.ms, 0), 0)
  const overhead = Math.max(0, suite.durationMs - baseMs)

  const frames: RunFrame[] = []
  const failures: SuiteTest[] = []
  let passed = 0
  let failed = 0
  let done = 0
  let ordinal = 0
  let failedFiles = 0
  let testMs = 0
  const pct = () => (total ? (done / total) * 100 : 100)

  frames.push({ delay: 380 * speed, logs: logPreamble(suite, total), progress: 0, passed, failed })

  files.forEach((file, fileIndex) => {
    let filePassed = 0
    let fileFailed = 0
    let fileMs = 0
    for (const test of file.tests) {
      ordinal++
      const fails = testFails(test, runNumber)
      frames.push({
        delay: (90 + rand() * 90) * speed,
        logs: [],
        test: { id: test.id, state: "running" },
        progress: pct(),
        passed,
        failed,
      })
      done++
      fileMs += test.ms
      if (fails) {
        failed++
        fileFailed++
        failures.push(test)
      } else {
        passed++
        filePassed++
      }
      frames.push({
        delay: (150 + rand() * 170 + Math.min(test.ms, 3000) * 0.05) * speed,
        logs: logTest(suite, file, test, !fails, ordinal, pct()),
        test: { id: test.id, state: fails ? "failed" : "passed", ms: test.ms },
        progress: pct(),
        passed,
        failed,
      })
    }
    done += file.extra
    passed += file.extra
    filePassed += file.extra
    fileMs += file.extraMs
    testMs += fileMs
    if (fileFailed) failedFiles++
    frames.push({
      delay: (180 + rand() * 120) * speed,
      logs: logFileDone(suite, file, filePassed, fileFailed, fileMs),
      fileDone: fileIndex,
      progress: pct(),
      passed,
      failed,
    })
  })

  const totals: RunTotals = {
    passed,
    failed,
    total,
    files: files.length,
    failedFiles,
    durationMs: overhead + testMs,
  }
  frames.push({ delay: 320 * speed, logs: logSummary(suite, totals), progress: 100, passed, failed })

  return { files, frames, totals, failures }
}
