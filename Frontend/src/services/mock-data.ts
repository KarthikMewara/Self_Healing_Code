// Phase 2 / supporting-section data. Nothing here is backed by a real endpoint yet --
// see src/services/heal-api.ts for the parts that DO match a real contract.

import type {
  AnalyticsPoint,
  DebugSessionSummary,
  MemoryCase,
  PerformanceInsight,
  Project,
  RegressionTest,
  RepairHistoryEntry,
  SecurityFinding,
  TestRun,
} from "@/types/domain"

export const currentUser = {
  name: "Jordan Avery",
  email: "jordan@acme-robotics.dev",
  initials: "JA",
  companyName: "Acme Robotics",
  plan: "Team",
}

export const projects: Project[] = [
  {
    id: "proj_1",
    name: "checkout-service",
    language: "TypeScript",
    description: "Payment and checkout orchestration API",
    lastActivity: "2 hours ago",
    health: "attention",
    sessionsCount: 14,
  },
  {
    id: "proj_2",
    name: "ingest-pipeline",
    language: "Python",
    description: "Event ingestion and ETL workers",
    lastActivity: "Yesterday",
    health: "healthy",
    sessionsCount: 8,
  },
  {
    id: "proj_3",
    name: "routing-gateway",
    language: "Go",
    description: "Internal service mesh routing layer",
    lastActivity: "3 days ago",
    health: "critical",
    sessionsCount: 21,
  },
  {
    id: "proj_4",
    name: "web-dashboard",
    language: "TypeScript",
    description: "Customer-facing analytics dashboard",
    lastActivity: "5 days ago",
    health: "healthy",
    sessionsCount: 5,
  },
  {
    id: "proj_5",
    name: "auth-service",
    language: "Java",
    description: "Tenant authentication and session issuing",
    lastActivity: "1 week ago",
    health: "healthy",
    sessionsCount: 11,
  },
]

export const debugSessions: DebugSessionSummary[] = [
  {
    id: "sess_a1",
    projectId: "proj_1",
    projectName: "checkout-service",
    language: "TypeScript",
    errorSummary: "TypeError: Cannot read properties of undefined (reading 'total')",
    status: "resolved",
    createdAt: "2026-09-24 09:12",
  },
  {
    id: "sess_a2",
    projectId: "proj_3",
    projectName: "routing-gateway",
    language: "Go",
    errorSummary: "panic: runtime error: invalid memory address or nil pointer dereference",
    status: "in_progress",
    createdAt: "2026-09-24 08:47",
  },
  {
    id: "sess_a3",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    language: "Python",
    errorSummary: "KeyError: 'tenant_id' missing from event payload",
    status: "resolved",
    createdAt: "2026-09-23 17:05",
  },
  {
    id: "sess_a4",
    projectId: "proj_5",
    projectName: "auth-service",
    language: "Java",
    errorSummary: "NullPointerException at TokenValidator.verify(TokenValidator.java:88)",
    status: "failed",
    createdAt: "2026-09-23 11:32",
  },
  {
    id: "sess_a5",
    projectId: "proj_4",
    projectName: "web-dashboard",
    language: "TypeScript",
    errorSummary: "Maximum update depth exceeded in <ChartPanel />",
    status: "resolved",
    createdAt: "2026-09-22 14:50",
  },
]

export const repairHistory: RepairHistoryEntry[] = [
  {
    id: "repair_1",
    sessionId: "sess_a1",
    projectName: "checkout-service",
    summary: "Added null guard before accessing cart.total in applyDiscount()",
    appliedAt: "2026-09-24 09:14",
    canRollback: true,
  },
  {
    id: "repair_2",
    sessionId: "sess_a3",
    projectName: "ingest-pipeline",
    summary: "Default tenant_id to event source header when payload omits it",
    appliedAt: "2026-09-23 17:09",
    canRollback: true,
  },
  {
    id: "repair_3",
    sessionId: "sess_a5",
    projectName: "web-dashboard",
    summary: "Memoized chart series transform to break the setState loop",
    appliedAt: "2026-09-22 14:53",
    canRollback: false,
  },
]

export const memoryCases: MemoryCase[] = [
  {
    id: "case_1",
    title: "Undefined cart total after coupon removal",
    language: "TypeScript",
    errorType: "TypeError",
    similarity: 94,
    sessionId: "sess_a1",
    resolvedAt: "2026-09-24",
  },
  {
    id: "case_2",
    title: "Nil pointer on cold-start route table",
    language: "Go",
    errorType: "panic",
    similarity: 88,
    sessionId: "sess_a2",
    resolvedAt: "2026-09-18",
  },
  {
    id: "case_3",
    title: "Missing tenant_id on legacy webhook producer",
    language: "Python",
    errorType: "KeyError",
    similarity: 81,
    sessionId: "sess_a3",
    resolvedAt: "2026-09-10",
  },
  {
    id: "case_4",
    title: "Infinite re-render from unstable chart props",
    language: "TypeScript",
    errorType: "RangeError",
    similarity: 76,
    sessionId: "sess_a5",
    resolvedAt: "2026-08-29",
  },
]

export const securityFindings: SecurityFinding[] = [
  {
    id: "sec_1",
    title: "Hardcoded default admin credentials in seed script",
    severity: "critical",
    file: "routing-gateway/scripts/seed.go",
    description: "A fallback admin/admin credential pair is used when env vars are unset.",
    detectedAt: "2026-09-24",
  },
  {
    id: "sec_2",
    title: "Outdated JWT library with known signature bypass",
    severity: "high",
    file: "auth-service/pom.xml",
    description: "jjwt 0.9.1 is affected by a documented signature validation bypass.",
    detectedAt: "2026-09-22",
  },
  {
    id: "sec_3",
    title: "Verbose error responses leak stack traces",
    severity: "medium",
    file: "checkout-service/src/middleware/errors.ts",
    description: "Unhandled errors return the raw stack trace to the client in all environments.",
    detectedAt: "2026-09-20",
  },
  {
    id: "sec_4",
    title: "Missing rate limit on password reset endpoint",
    severity: "medium",
    file: "auth-service/src/ResetController.java",
    description: "The endpoint can be called without throttling, enabling enumeration.",
    detectedAt: "2026-09-15",
  },
  {
    id: "sec_5",
    title: "Dependency with unpatched ReDoS advisory",
    severity: "low",
    file: "web-dashboard/package.json",
    description: "A transitive dependency has an open low-severity ReDoS advisory.",
    detectedAt: "2026-09-11",
  },
]

export const testRuns: TestRun[] = [
  { id: "run_1", name: "checkout-service / full suite", status: "passed", passCount: 142, failCount: 0, durationMs: 48200, ranAt: "2026-09-24 09:14" },
  { id: "run_2", name: "routing-gateway / integration", status: "failed", passCount: 76, failCount: 3, durationMs: 61300, ranAt: "2026-09-24 08:50" },
  { id: "run_3", name: "ingest-pipeline / unit", status: "passed", passCount: 210, failCount: 0, durationMs: 22100, ranAt: "2026-09-23 17:09" },
  { id: "run_4", name: "auth-service / unit", status: "failed", passCount: 58, failCount: 1, durationMs: 15800, ranAt: "2026-09-23 11:35" },
]

export const regressionTests: RegressionTest[] = [
  { id: "reg_1", name: "applyDiscount() keeps total non-negative", project: "checkout-service", lastStatus: "passed", lastRun: "2026-09-24 09:14" },
  { id: "reg_2", name: "route table survives cold start", project: "routing-gateway", lastStatus: "failed", lastRun: "2026-09-24 08:50" },
  { id: "reg_3", name: "ingest handles payload missing tenant_id", project: "ingest-pipeline", lastStatus: "passed", lastRun: "2026-09-23 17:09" },
  { id: "reg_4", name: "ChartPanel does not re-render on stable props", project: "web-dashboard", lastStatus: "passed", lastRun: "2026-09-22 14:53" },
]

export const performanceInsights: PerformanceInsight[] = [
  {
    id: "perf_1",
    title: "N+1 query in order history endpoint",
    impact: "high",
    description: "Each order fetches its line items in a separate query. Batch-loading would cut round trips significantly.",
    metricBefore: "820ms p95",
    metricAfter: "140ms p95 (projected)",
  },
  {
    id: "perf_2",
    title: "Unbounded in-memory cache in routing-gateway",
    impact: "medium",
    description: "The route cache has no eviction policy and grows with every unique path seen.",
    metricBefore: "612MB RSS after 24h",
    metricAfter: "180MB RSS (projected)",
  },
  {
    id: "perf_3",
    title: "Redundant re-fetch on dashboard tab switch",
    impact: "low",
    description: "Switching tabs re-requests data that was already loaded in the last 30 seconds.",
    metricBefore: "4 requests / tab switch",
    metricAfter: "1 request / tab switch (projected)",
  },
]

export const analyticsSeries: AnalyticsPoint[] = [
  { date: "Sep 18", bugsFixed: 6, successRate: 82 },
  { date: "Sep 19", bugsFixed: 9, successRate: 85 },
  { date: "Sep 20", bugsFixed: 4, successRate: 79 },
  { date: "Sep 21", bugsFixed: 11, successRate: 88 },
  { date: "Sep 22", bugsFixed: 8, successRate: 90 },
  { date: "Sep 23", bugsFixed: 13, successRate: 91 },
  { date: "Sep 24", bugsFixed: 10, successRate: 93 },
]

export const dashboardStats = {
  activeProjects: projects.length,
  bugsFixed30d: 61,
  avgTimeToFix: "6m 40s",
  fixSuccessRate: "91%",
}

export const activityFeed = [
  { id: "act_1", text: "Fixed undefined cart total in checkout-service", time: "2h ago" },
  { id: "act_2", text: "Found 1 critical vulnerability in routing-gateway", time: "5h ago" },
  { id: "act_3", text: "Resolved KeyError in ingest-pipeline", time: "Yesterday" },
  { id: "act_4", text: "Regression suite passed for web-dashboard", time: "2 days ago" },
]
