// History preview data: the literal audit log of debug sessions and applied
// repairs. It extends the canonical records in src/services/mock-data.ts (same
// ids, projects, summaries and timestamps) with older sessions and the detail a
// session sheet needs. Deterministic -- identical on every load.
//
// Repair rollback state lives in a tiny module-level store so a rollback made
// on /history survives navigating away and back within the browser session.

import { useSyncExternalStore } from "react"

import { debugSessions, repairHistory } from "@/services/mock-data"
import type { HealStep } from "@/types/contract"
import type { DebugSessionSummary, RepairHistoryEntry } from "@/types/domain"

/**
 * "Now" for the preview dataset. Mock timestamps are relative to this moment
 * (the checkout-service fix at 09:12 on Sep 24 is "2 hours ago"), matching the
 * Sep 24 anchor the Dashboard and Analytics series use.
 */
export const PREVIEW_NOW = new Date(2026, 8, 24, 11, 20).getTime()

/** Parses the mock-data "2026-09-24 09:12" stamp format as local time. */
export function parseStamp(stamp: string): number {
  const [date, time = "00:00"] = stamp.trim().split(" ")
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm).getTime()
}

export const PIPELINE_STEPS: HealStep[] = ["retrieval", "analysis", "generation", "testing"]

export type StageState = "done" | "failed" | "running" | "pending"

export interface SessionStage {
  step: HealStep
  state: StageState
  message: string
  durationSec?: number
}

export interface HistorySession extends DebugSessionSummary {
  at: number
  /** File the failure was traced to. */
  file: string
  /** Time spent in the pipeline (so far, for a running session). */
  durationSec: number
  attempts: number
  tests?: { passed: number; total: number }
  stages: SessionStage[]
  fixSummary?: string
  /** Why a failed session stopped. */
  outcomeNote?: string
}

const GAVE_UP = "Failed to resolve error after 3 attempts. Please manually review."

function stage(step: HealStep, message: string, durationSec?: number, state: StageState = "done"): SessionStage {
  return { step, state, message, durationSec }
}

type SessionDetail = Omit<HistorySession, keyof DebugSessionSummary | "at">

// Detail for the five canonical sessions in mock-data.ts.
const CANONICAL_DETAIL: Record<string, SessionDetail> = {
  sess_a1: {
    file: "src/pricing/discount.ts",
    durationSec: 118,
    attempts: 1,
    tests: { passed: 6, total: 6 },
    fixSummary: "Added null guard before accessing cart.total in applyDiscount()",
    stages: [
      stage("retrieval", "Matched 3 similar TypeError cases in checkout-service — best match 94%.", 4),
      stage("analysis", "discount.ts:4 reads cart.total, but carts.find() returned undefined after the coupon was removed.", 11),
      stage("generation", "Replaced the non-null assertion with a fallback to the newest cart and a CheckoutError.", 38),
      stage("testing", "6 of 6 tests passed, including a replay of the coupon-removal request.", 65),
    ],
  },
  sess_a2: {
    file: "router/gateway.go",
    durationSec: 214,
    attempts: 2,
    stages: [
      stage("retrieval", "Recalled 2 cold-start incidents from routing-gateway — best match 88%.", 5),
      stage("analysis", "Gateway.Resolve dereferences a nil *RouteTable while tables are still loading.", 14),
      stage(
        "generation",
        "Attempt 2 of 3 — the first patch failed 3 integration tests; drafting a warm-up fallback.",
        undefined,
        "running",
      ),
      stage("testing", "Waiting for a candidate patch.", undefined, "pending"),
    ],
  },
  sess_a3: {
    file: "ingest/events.py",
    durationSec: 236,
    attempts: 1,
    tests: { passed: 5, total: 5 },
    fixSummary: "Default tenant_id to event source header when payload omits it",
    stages: [
      stage("retrieval", "Retrieved 3 similar KeyError cases from ingest-pipeline — best match 81%.", 3),
      stage("analysis", 'events.py:2 indexes event["tenant_id"]; legacy webhook producers send it as the x-tenant-id header.', 9),
      stage("generation", "Added a header fallback and a dead-letter path for events with no tenant.", 71),
      stage("testing", "5 of 5 tests passed, including a replay of the failing webhook payload.", 153),
    ],
  },
  sess_a4: {
    file: "src/TokenValidator.java",
    durationSec: 212,
    attempts: 3,
    tests: { passed: 58, total: 59 },
    outcomeNote: GAVE_UP,
    stages: [
      stage("retrieval", "Matched 1 similar NullPointerException in auth-service — best match 79%.", 4),
      stage("analysis", "TokenValidator.java:88 calls header.substring() on a null header from the refresh flow.", 12),
      stage("generation", "Generated 3 candidate patches across 3 attempts.", 64),
      stage(
        "testing",
        "Every candidate left \"rotates refresh tokens across tenants\" failing (58 of 59 passed).",
        132,
        "failed",
      ),
    ],
  },
  sess_a5: {
    file: "src/components/ChartPanel.tsx",
    durationSec: 171,
    attempts: 1,
    tests: { passed: 4, total: 4 },
    fixSummary: "Memoized chart series transform to break the setState loop",
    stages: [
      stage("retrieval", "Recalled an earlier re-render loop in web-dashboard — best match 76%.", 3),
      stage("analysis", "ChartPanel rebuilds its options object every render, so the effect that sets the series re-runs forever.", 10),
      stage("generation", "Moved the options to a module constant and derived the series with useMemo.", 42),
      stage("testing", "4 of 4 tests passed, including \"ChartPanel does not re-render on stable props\".", 116),
    ],
  },
}

type SessionSeed = Omit<HistorySession, "at">

// Older sessions (not in mock-data.ts). Per-project counts stay within each
// project's sessionsCount, and failures match each project's record.
const OLDER_SESSIONS: SessionSeed[] = [
  {
    id: "sess_b01",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "TypeScript",
    errorSummary: "TypeError: Cannot read properties of null (reading 'amount')",
    status: "resolved",
    createdAt: "2026-09-19 10:41",
    file: "src/pricing/line-total.ts",
    durationSec: 204,
    attempts: 1,
    tests: { passed: 7, total: 7 },
    fixSummary: "Price free-sample line items at zero in lineTotal()",
    stages: [
      stage("retrieval", "Matched 4 similar null-read cases in checkout-service — best match 86%.", 5),
      stage("analysis", "Free-sample line items are created without a price record, so item.price is null at line-total.ts:2.", 13),
      stage("generation", "Priced price-less items at zero in the order currency.", 52),
      stage("testing", "7 of 7 tests passed.", 134),
    ],
  },
  {
    id: "sess_b02",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    errorSummary: "panic: runtime error: invalid memory address or nil pointer dereference",
    status: "resolved",
    createdAt: "2026-09-18 16:10",
    file: "router/gateway.go",
    durationSec: 693,
    attempts: 2,
    tests: { passed: 79, total: 79 },
    fixSummary: "Return ErrRouteTableWarming instead of dereferencing a nil route table",
    stages: [
      stage("retrieval", "No close match in memory — the nearest case scored 61%.", 6),
      stage("analysis", "Route tables load asynchronously after a cold start; early requests hit a nil *RouteTable.", 21),
      stage("generation", "Attempt 2 of 2 — added ErrRouteTableWarming and a 503 with Retry-After.", 186),
      stage("testing", "79 of 79 integration tests passed.", 480),
    ],
  },
  {
    id: "sess_b03",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    errorSummary: 'NullPointerException: Cannot invoke "Tenant.issuerUrl()" because "tenant" is null',
    status: "resolved",
    createdAt: "2026-09-16 14:57",
    file: "src/RefreshTokenService.java",
    durationSec: 287,
    attempts: 1,
    tests: { passed: 59, total: 59 },
    fixSummary: "Reject refresh tokens whose tenant no longer exists",
    stages: [
      stage("retrieval", "Matched 2 similar NullPointerExceptions in auth-service — best match 71%.", 4),
      stage("analysis", "Refresh tokens outlive deleted tenants; findById() returns null at RefreshTokenService.java:3.", 15),
      stage("generation", "Throw InvalidGrantException for tokens whose tenant is gone.", 58),
      stage("testing", "59 of 59 tests passed.", 210),
    ],
  },
  {
    id: "sess_b04",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    errorSummary: "fatal error: concurrent map writes",
    status: "failed",
    createdAt: "2026-09-14 09:26",
    file: "health/checker.go",
    durationSec: 402,
    attempts: 3,
    tests: { passed: 76, total: 79 },
    outcomeNote: GAVE_UP,
    stages: [
      stage("retrieval", "No similar case in memory for concurrent map writes.", 5),
      stage("analysis", "Health probes and the config reloader write the same map without a lock.", 19),
      stage("generation", "Tried a sync.Mutex, a sync.Map and a copy-on-write snapshot across 3 attempts.", 128),
      stage("testing", "3 race-detector tests failed on every candidate (76 of 79 passed).", 250, "failed"),
    ],
  },
  {
    id: "sess_b05",
    projectId: "proj_4",
    projectName: "web-dashboard",
    language: "TypeScript",
    errorSummary: "TypeError: Cannot read properties of undefined (reading 'values')",
    status: "resolved",
    createdAt: "2026-09-11 13:02",
    file: "src/charts/SeriesTooltip.tsx",
    durationSec: 166,
    attempts: 1,
    tests: { passed: 12, total: 12 },
    fixSummary: "Tooltip skips series removed by the active filter",
    stages: [
      stage("retrieval", "Matched 2 similar TypeError cases in web-dashboard — best match 67%.", 3),
      stage("analysis", "The legend filter removes a series while the tooltip still holds its key.", 9),
      stage("generation", "Render nothing for a series that is no longer visible.", 31),
      stage("testing", "12 of 12 tests passed.", 123),
    ],
  },
  {
    id: "sess_b06",
    projectId: "proj_4",
    projectName: "web-dashboard",
    language: "TypeScript",
    errorSummary: "Error: Rendered more hooks than during the previous render.",
    status: "resolved",
    createdAt: "2026-09-09 16:34",
    file: "src/pages/Reports.tsx",
    durationSec: 149,
    attempts: 1,
    tests: { passed: 9, total: 9 },
    fixSummary: "Moved the loading early-return below every hook in Reports",
    stages: [
      stage("retrieval", "No close match in memory — the nearest case scored 54%.", 3),
      stage("analysis", "Reports returns early before its useMemo call while the report is still loading.", 8),
      stage("generation", "Moved the loading return below every hook.", 27),
      stage("testing", "9 of 9 tests passed.", 111),
    ],
  },
  {
    id: "sess_b07",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    errorSummary: "panic: send on closed channel",
    status: "resolved",
    createdAt: "2026-09-08 22:13",
    file: "upstream/pool.go",
    durationSec: 311,
    attempts: 1,
    tests: { passed: 79, total: 79 },
    fixSummary: "Close the results channel only after every worker has exited",
    stages: [
      stage("retrieval", "Matched 1 similar shutdown panic — best match 58%.", 5),
      stage("analysis", "Shutdown closes p.results while workers are still finishing in-flight requests.", 16),
      stage("generation", "Signal workers through a quit channel, wait for them, then close results.", 64),
      stage("testing", "79 of 79 integration tests passed under -race.", 226),
    ],
  },
  {
    id: "sess_b08",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    language: "Python",
    errorSummary: "KeyError: 'occurred_at'",
    status: "resolved",
    createdAt: "2026-09-06 11:48",
    file: "ingest/timestamps.py",
    durationSec: 198,
    attempts: 1,
    tests: { passed: 14, total: 14 },
    fixSummary: "Read occurred_at from the v2 meta envelope with a v1 fallback",
    stages: [
      stage("retrieval", "Recalled the tenant_id KeyError fix from ingest-pipeline — best match 74%.", 3),
      stage("analysis", "v2 producers moved occurred_at into a nested meta envelope.", 10),
      stage("generation", "Read the v2 location first, fall back to v1, reject events with neither.", 44),
      stage("testing", "14 of 14 tests passed.", 141),
    ],
  },
  {
    id: "sess_b09",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "JavaScript",
    errorSummary: "TypeError: Cannot read properties of undefined (reading 'percentOff')",
    status: "resolved",
    createdAt: "2026-09-02 15:20",
    file: "cart.js",
    durationSec: 142,
    attempts: 1,
    tests: { passed: 6, total: 6 },
    fixSummary: "Default a missing coupon to a 0% discount in checkoutTotal()",
    stages: [
      stage("retrieval", "Searched checkout-service for similar TypeError cases — best match 91%.", 4),
      stage("analysis", "cart.coupon is undefined when a shopper checks out without a coupon.", 9),
      stage("generation", "Read the coupon with optional chaining and default to 0% off.", 29),
      stage("testing", "6 of 6 tests passed.", 100),
    ],
  },
  {
    id: "sess_b10",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    errorSummary: "ConcurrentModificationException at SessionRegistry.evictExpired(SessionRegistry.java:64)",
    status: "failed",
    createdAt: "2026-09-01 10:05",
    file: "src/SessionRegistry.java",
    durationSec: 356,
    attempts: 3,
    tests: { passed: 57, total: 59 },
    outcomeNote: GAVE_UP,
    stages: [
      stage("retrieval", "No similar case in memory.", 4),
      stage("analysis", "evictExpired() removes entries from the HashMap it is iterating over.", 13),
      stage("generation", "Tried Iterator.remove(), a ConcurrentHashMap and removeIf() across 3 attempts.", 97),
      stage("testing", "2 session-expiry tests failed on every candidate (57 of 59 passed).", 242, "failed"),
    ],
  },
  {
    id: "sess_b11",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "TypeScript",
    errorSummary: "RangeError: Invalid time value",
    status: "resolved",
    createdAt: "2026-08-29 18:42",
    file: "src/shipping/eta.ts",
    durationSec: 133,
    attempts: 1,
    tests: { passed: 8, total: 8 },
    fixSummary: "Skip the delivery ETA when the carrier returns no date",
    stages: [
      stage("retrieval", "Matched 1 similar date-parsing case — best match 63%.", 3),
      stage("analysis", "eta.ts calls toISOString() on new Date(undefined) when the carrier omits estimated_delivery.", 9),
      stage("generation", "Return null for a missing date and let the UI show \"ETA pending\".", 26),
      stage("testing", "8 of 8 tests passed.", 95),
    ],
  },
  {
    id: "sess_b12",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    language: "Python",
    errorSummary: "AttributeError: 'NoneType' object has no attribute 'decode'",
    status: "resolved",
    createdAt: "2026-08-27 07:55",
    file: "ingest/codec.py",
    durationSec: 121,
    attempts: 1,
    tests: { passed: 11, total: 11 },
    fixSummary: "Skip tombstone messages with a null value in decode()",
    stages: [
      stage("retrieval", "No close match in memory — the nearest case scored 49%.", 3),
      stage("analysis", "Compacted topics emit tombstones whose value is None; decode() calls .decode() on it.", 8),
      stage("generation", "Return None for tombstones and let the consumer skip them.", 22),
      stage("testing", "11 of 11 tests passed.", 88),
    ],
  },
  {
    id: "sess_b13",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    language: "Python",
    errorSummary: "TimeoutError: warehouse flush exceeded 60s",
    status: "resolved",
    createdAt: "2026-08-24 13:37",
    file: "ingest/sinks/warehouse.py",
    durationSec: 377,
    attempts: 2,
    tests: { passed: 10, total: 10 },
    fixSummary: "Flush the warehouse sink in 5,000-row chunks",
    stages: [
      stage("retrieval", "No similar case in memory.", 4),
      stage("analysis", "A backfill queued 1.2M rows and flush() sends them in one INSERT that outlives the 60s timeout.", 17),
      stage("generation", "Attempt 2 of 2 — chunked flushes with a per-chunk timeout.", 91),
      stage("testing", "10 of 10 tests passed, including a 1M-row backfill.", 265),
    ],
  },
  {
    id: "sess_b14",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    errorSummary: "panic: runtime error: index out of range [0] with length 0",
    status: "resolved",
    createdAt: "2026-08-21 20:03",
    file: "router/table.go",
    durationSec: 158,
    attempts: 1,
    tests: { passed: 4, total: 4 },
    fixSummary: "Return nil from Primary() for hosts without routes",
    stages: [
      stage("retrieval", "Matched 2 previous cold-start incidents in routing-gateway — best match 84%.", 5),
      stage("analysis", "Primary() indexes routes[0] on a host whose route slice is still empty.", 11),
      stage("generation", "Added an empty-slice guard that returns nil instead of panicking.", 33),
      stage("testing", "4 of 4 tests passed, including an empty-table cold start.", 109),
    ],
  },
  {
    id: "sess_b15",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    errorSummary: 'NullPointerException: Cannot invoke "String.substring(int)" because "header" is null',
    status: "resolved",
    createdAt: "2026-08-14 12:30",
    file: "src/TokenValidator.java",
    durationSec: 176,
    attempts: 1,
    tests: { passed: 4, total: 4 },
    fixSummary: "Reject requests without a Bearer header before parsing the token",
    stages: [
      stage("retrieval", "Searched auth-service history for NullPointerExceptions in request filters.", 4),
      stage("analysis", "Load-balancer health checks arrive without an Authorization header, so header is null.", 12),
      stage("generation", "Guard against a missing or non-Bearer header before parsing.", 31),
      stage("testing", "4 of 4 tests passed.", 129),
    ],
  },
]

export const historySessions: HistorySession[] = [
  ...debugSessions.map((s) => ({ ...s, ...CANONICAL_DETAIL[s.id], at: parseStamp(s.createdAt) })),
  ...OLDER_SESSIONS.map((s) => ({ ...s, at: parseStamp(s.createdAt) })),
].sort((a, b) => b.at - a.at)

export function findHistorySession(id: string | null | undefined) {
  return id ? historySessions.find((s) => s.id === id) : undefined
}

export function sessionsForProject(projectId: string) {
  return historySessions.filter((s) => s.projectId === projectId)
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

export interface RepairFile {
  path: string
  added: number
  removed: number
}

export interface RepairRecord extends RepairHistoryEntry {
  projectId: string
  language: string
  at: number
  files: RepairFile[]
  tests: { passed: number; total: number }
  /** Why the fix can't be rolled back (only when canRollback is false). */
  lockedReason?: string
}

type RepairDetail = Pick<RepairRecord, "projectId" | "language" | "files" | "tests" | "lockedReason">

const CANONICAL_REPAIRS: Record<string, RepairDetail> = {
  repair_1: {
    projectId: "proj_1",
    language: "TypeScript",
    files: [{ path: "src/pricing/discount.ts", added: 5, removed: 1 }],
    tests: { passed: 6, total: 6 },
  },
  repair_2: {
    projectId: "proj_2",
    language: "Python",
    files: [{ path: "ingest/events.py", added: 3, removed: 1 }],
    tests: { passed: 5, total: 5 },
  },
  repair_3: {
    projectId: "proj_4",
    language: "TypeScript",
    files: [{ path: "src/components/ChartPanel.tsx", added: 3, removed: 6 }],
    tests: { passed: 4, total: 4 },
    lockedReason: "Superseded — ChartPanel.tsx was rewritten after this fix, so the patch can no longer be reversed cleanly.",
  },
}

const OLDER_REPAIRS: Omit<RepairRecord, "at">[] = [
  {
    id: "repair_4",
    sessionId: "sess_b01",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "TypeScript",
    summary: "Price free-sample line items at zero in lineTotal()",
    appliedAt: "2026-09-19 10:44",
    canRollback: true,
    files: [{ path: "src/pricing/line-total.ts", added: 5, removed: 1 }],
    tests: { passed: 7, total: 7 },
  },
  {
    id: "repair_5",
    sessionId: "sess_b02",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    summary: "Return ErrRouteTableWarming instead of dereferencing a nil route table",
    appliedAt: "2026-09-18 16:22",
    canRollback: true,
    files: [
      { path: "router/gateway.go", added: 6, removed: 2 },
      { path: "router/serve.go", added: 4, removed: 1 },
    ],
    tests: { passed: 79, total: 79 },
  },
  {
    id: "repair_6",
    sessionId: "sess_b03",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    summary: "Reject refresh tokens whose tenant no longer exists",
    appliedAt: "2026-09-16 15:02",
    canRollback: true,
    files: [{ path: "src/RefreshTokenService.java", added: 3, removed: 0 }],
    tests: { passed: 59, total: 59 },
  },
  {
    id: "repair_7",
    sessionId: "sess_b05",
    projectId: "proj_4",
    projectName: "web-dashboard",
    language: "TypeScript",
    summary: "Tooltip skips series removed by the active filter",
    appliedAt: "2026-09-11 13:05",
    canRollback: false,
    lockedReason: "Locked — web-dashboard v4.2 shipped with this fix. Roll it back by deploying a new release instead.",
    files: [{ path: "src/charts/SeriesTooltip.tsx", added: 1, removed: 0 }],
    tests: { passed: 12, total: 12 },
  },
  {
    id: "repair_8",
    sessionId: "sess_b07",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    summary: "Close the results channel only after every worker has exited",
    appliedAt: "2026-09-08 22:18",
    canRollback: true,
    files: [{ path: "upstream/pool.go", added: 3, removed: 1 }],
    tests: { passed: 79, total: 79 },
  },
  {
    id: "repair_9",
    sessionId: "sess_b08",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    language: "Python",
    summary: "Read occurred_at from the v2 meta envelope with a v1 fallback",
    appliedAt: "2026-09-06 11:51",
    canRollback: true,
    files: [{ path: "ingest/timestamps.py", added: 5, removed: 1 }],
    tests: { passed: 14, total: 14 },
  },
  {
    id: "repair_10",
    sessionId: "sess_b09",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "JavaScript",
    summary: "Default a missing coupon to a 0% discount in checkoutTotal()",
    appliedAt: "2026-09-02 15:22",
    canRollback: false,
    lockedReason: "Outside the 21-day rollback window — fixes this old are locked once they ship in a tagged release.",
    files: [{ path: "cart.js", added: 1, removed: 1 }],
    tests: { passed: 6, total: 6 },
  },
  {
    id: "repair_11",
    sessionId: "sess_b15",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    summary: "Reject requests without a Bearer header before parsing the token",
    appliedAt: "2026-08-14 12:33",
    canRollback: false,
    lockedReason: "Locked as a security fix — reverting it would re-open 500s on unauthenticated health checks.",
    files: [{ path: "src/TokenValidator.java", added: 3, removed: 0 }],
    tests: { passed: 4, total: 4 },
  },
]

export const repairRecords: RepairRecord[] = [
  ...repairHistory.map((r) => ({ ...r, ...CANONICAL_REPAIRS[r.id], at: parseStamp(r.appliedAt) })),
  ...OLDER_REPAIRS.map((r) => ({ ...r, at: parseStamp(r.appliedAt) })),
].sort((a, b) => b.at - a.at)

export function repairForSession(sessionId: string) {
  return repairRecords.find((r) => r.sessionId === sessionId)
}

export type RepairState = "applied" | "rolled_back"

export interface RepairStatus {
  state: RepairState
  /** When the state last changed (real clock); undefined = as seeded. */
  changedAt?: number
}

let repairStates: Record<string, RepairStatus> = {}
const repairListeners = new Set<() => void>()

function subscribeRepairs(listener: () => void) {
  repairListeners.add(listener)
  return () => {
    repairListeners.delete(listener)
  }
}

const getRepairStates = () => repairStates

/** Rollback state per repair id (missing = applied). */
export function useRepairStates() {
  return useSyncExternalStore(subscribeRepairs, getRepairStates, getRepairStates)
}

export function getRepairState(id: string): RepairState {
  return repairStates[id]?.state ?? "applied"
}

export function setRepairState(id: string, state: RepairState) {
  repairStates = { ...repairStates, [id]: { state, changedAt: Date.now() } }
  repairListeners.forEach((listener) => listener())
}
