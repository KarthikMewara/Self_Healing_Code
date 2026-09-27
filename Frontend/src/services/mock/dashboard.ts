// Dashboard preview data. KPIs, the 14-day chart and the error breakdown are
// all aggregated from the shared heal log (./healing-series), so they match the
// Analytics screen number for number.

import { debugSessions, projects } from "@/services/mock-data"

import { errorBreakdown, lastDays, pctChange, totals, type HealingTotals } from "./healing-series"
import { round } from "./prng"

const now30 = totals(lastDays(30))
const prev30 = totals(lastDays(30, 30))

/** A rolling 30-day value, sampled weekly over the last 8 weeks (oldest first). */
function weekly30(metric: (t: HealingTotals) => number) {
  return [49, 42, 35, 28, 21, 14, 7, 0].map((offset) => round(metric(totals(lastDays(30, offset))), 1))
}

export const DASHBOARD_KPIS = {
  activeProjects: { value: projects.length, delta: 25, sparkline: [3, 3, 4, 4, 4, 4, 5, 5] },
  bugsFixed: {
    value: now30.fixed,
    delta: pctChange(now30.fixed, prev30.fixed),
    sparkline: weekly30((t) => t.fixed),
  },
  avgTimeToFix: {
    value: Math.round(now30.avgSeconds),
    delta: pctChange(now30.avgSeconds, prev30.avgSeconds),
    sparkline: weekly30((t) => t.avgSeconds),
  },
  successRate: {
    value: Math.round(now30.successRate),
    delta: pctChange(now30.successRate, prev30.successRate),
    sparkline: weekly30((t) => t.successRate),
  },
}

// ---------------------------------------------------------------------------
// Healing activity (last 14 days)
// ---------------------------------------------------------------------------

export interface ActivityPoint {
  label: string
  iso: string
  healed: number
  failed: number
  /** 7-day rolling fix success rate, %. */
  successRate: number
}

export const HEALING_ACTIVITY: ActivityPoint[] = lastDays(14).map((day, i) => ({
  label: day.label,
  iso: day.iso,
  healed: day.fixed,
  failed: day.failed,
  successRate: round(totals(lastDays(7, 13 - i)).successRate, 1),
}))

const last14 = totals(lastDays(14))
const prev14 = totals(lastDays(14, 14))

export const HEALING_ACTIVITY_SUMMARY = {
  healed: last14.fixed,
  healedDelta: pctChange(last14.fixed, prev14.fixed),
  successRate: round(last14.successRate, 1),
  /** Percentage points vs the prior 14 days. */
  successDeltaPts: round(last14.successRate - prev14.successRate, 1),
}

// ---------------------------------------------------------------------------
// Pipeline stage timings (30-day averages; they add up to the 6m 40s KPI)
// ---------------------------------------------------------------------------

export type PipelineStage = "retrieval" | "analysis" | "generation" | "testing"

export interface StageTiming {
  stage: PipelineStage
  label: string
  detail: string
  /** Mean seconds, last 30 days. */
  avg: number
  p95: number
  /** Mean seconds, the 30 days before. */
  prevAvg: number
}

export const STAGE_TIMINGS: StageTiming[] = [
  {
    stage: "retrieval",
    label: "Retrieval",
    detail: "Similar cases from AI Memory and your indexed docs",
    avg: 38,
    p95: 74,
    prevAvg: 42,
  },
  {
    stage: "analysis",
    label: "Analysis",
    detail: "Trace parsing, AST and data-flow of the failing path",
    avg: 112,
    p95: 196,
    prevAvg: 130,
  },
  {
    stage: "generation",
    label: "Generation",
    detail: "Candidate patches, ranked by blast radius",
    avg: 146,
    p95: 262,
    prevAvg: 164,
  },
  {
    stage: "testing",
    label: "Testing",
    detail: "Your suite plus generated regression tests, sandboxed",
    avg: 104,
    p95: 188,
    prevAvg: 119,
  },
]

// ---------------------------------------------------------------------------
// Top error types (30 days)
// ---------------------------------------------------------------------------

export const TOP_ERRORS = errorBreakdown(lastDays(30), 6)

// ---------------------------------------------------------------------------
// Recent sessions -- extra columns for src/services/mock-data.ts debugSessions
// ---------------------------------------------------------------------------

export const RECENT_SESSIONS = debugSessions.slice(0, 5)

export const SESSION_META: Record<string, { durationSec: number | null; outcome: string }> = {
  sess_a1: { durationSec: 142, outcome: "Null guard + 6 passing tests" },
  sess_a2: { durationSec: null, outcome: "Generating patch · attempt 2 of 3" },
  sess_a3: { durationSec: 251, outcome: "tenant_id fallback + 4 passing tests" },
  sess_a4: { durationSec: 588, outcome: "Patch failed 1 of 59 tests" },
  sess_a5: { durationSec: 317, outcome: "Memoized series + 3 passing tests" },
}

// ---------------------------------------------------------------------------
// "Needs you" chips in the hero
// ---------------------------------------------------------------------------

export const ATTENTION_ITEMS = [
  { id: "critical", label: "1 critical finding", detail: "routing-gateway", to: "/security", tone: "danger" as const },
  {
    id: "tests",
    label: "3 failing tests",
    detail: "routing-gateway / integration",
    to: "/testing?suite=routing-integration",
    tone: "warning" as const,
  },
  { id: "review", label: "1 heal needs review", detail: "auth-service", to: "/history?session=sess_a4", tone: "info" as const },
]

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export type FeedKind = "heal" | "security" | "test" | "memory" | "performance" | "review"

export interface FeedTemplate {
  kind: FeedKind
  title: string
  project: string
  detail?: string
  /** Where clicking the event goes. */
  to: string
}

export interface FeedSeed extends FeedTemplate {
  id: string
  minutesAgo: number
}

/** What was already on the feed when the page opened (newest first). */
export const FEED_SEED: FeedSeed[] = [
  {
    id: "act_1",
    kind: "heal",
    title: "Fixed undefined cart total",
    project: "checkout-service",
    detail: "Null guard in applyDiscount() · 6/6 tests passed",
    to: "/history?session=sess_a1",
    minutesAgo: 118,
  },
  {
    id: "act_5",
    kind: "memory",
    title: "Saved a new case to AI Memory",
    project: "checkout-service",
    detail: "Undefined cart total after coupon removal",
    to: "/ai-memory",
    minutesAgo: 116,
  },
  {
    id: "act_2",
    kind: "security",
    title: "Found 1 critical vulnerability",
    project: "routing-gateway",
    detail: "Hardcoded default admin credentials in scripts/seed.go",
    to: "/security",
    minutesAgo: 296,
  },
  {
    id: "act_3",
    kind: "heal",
    title: "Resolved KeyError: 'tenant_id'",
    project: "ingest-pipeline",
    detail: "Falls back to the event source header",
    to: "/history?session=sess_a3",
    minutesAgo: 1090,
  },
  {
    id: "act_6",
    kind: "review",
    title: "Heal needs review",
    project: "auth-service",
    detail: "Patch failed 1 of 59 tests in TokenValidatorTest",
    to: "/history?session=sess_a4",
    minutesAgo: 1422,
  },
  {
    id: "act_4",
    kind: "test",
    title: "Regression suite passed",
    project: "web-dashboard",
    detail: "ChartPanel does not re-render on stable props",
    to: "/testing?tab=regression",
    minutesAgo: 2890,
  },
]

/** Simulated events the live feed cycles through, in order. */
export const FEED_POOL: FeedTemplate[] = [
  {
    kind: "heal",
    title: "Healed TypeError in formatPrice()",
    project: "checkout-service",
    detail: "Tested fix · 6/6 tests passed · 1m 58s",
    to: "/history",
  },
  {
    kind: "memory",
    title: "Matched a 91% similar case in AI Memory",
    project: "ingest-pipeline",
    detail: "Reusing the tenant_id fallback from Sep 10",
    to: "/ai-memory",
  },
  {
    kind: "test",
    title: "Unit suite passed",
    project: "auth-service",
    detail: "59/59 tests · 15.8s",
    to: "/testing",
  },
  {
    kind: "performance",
    title: "Spotted an N+1 query in GET /orders/history",
    project: "checkout-service",
    detail: "Projected p95 820ms → 140ms with batch loading",
    to: "/performance",
  },
  {
    kind: "heal",
    title: "Resolved nil pointer dereference in (*Table).Lookup",
    project: "routing-gateway",
    detail: "Tested fix · 9/9 tests passed · 4m 12s",
    to: "/history",
  },
  {
    kind: "security",
    title: "New advisory for a transitive dependency",
    project: "web-dashboard",
    detail: "Low · ReDoS in a date-parsing helper",
    to: "/security",
  },
  {
    kind: "review",
    title: "Heal paused for review",
    project: "routing-gateway",
    detail: "Candidate patch touched 3 files, over the auto-apply limit",
    to: "/history",
  },
  {
    kind: "test",
    title: "Generated 5 regression tests for applyDiscount()",
    project: "checkout-service",
    detail: "Coverage 58% → 81% (projected)",
    to: "/testing?tab=generator",
  },
  {
    kind: "heal",
    title: "Fixed AttributeError on a None event.source",
    project: "ingest-pipeline",
    detail: "Tested fix · 12/12 tests passed · 3m 05s",
    to: "/history",
  },
  {
    kind: "memory",
    title: "Saved a new case to AI Memory",
    project: "routing-gateway",
    detail: "Nil route table on cold start",
    to: "/ai-memory",
  },
]
