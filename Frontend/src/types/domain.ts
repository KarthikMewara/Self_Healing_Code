// Phase 2 / supporting-section types. Nothing here has a backend contract yet --
// every value that uses these types comes from src/services/mock-data.ts.

export type ProjectHealth = "healthy" | "attention" | "critical"

export interface Project {
  id: string
  name: string
  language: string
  description: string
  lastActivity: string
  health: ProjectHealth
  sessionsCount: number
}

export type SessionStatus = "resolved" | "failed" | "in_progress"

export interface DebugSessionSummary {
  id: string
  projectId: string
  projectName: string
  language: string
  errorSummary: string
  status: SessionStatus
  createdAt: string
}

export interface RepairHistoryEntry {
  id: string
  sessionId: string
  projectName: string
  summary: string
  appliedAt: string
  canRollback: boolean
}

export interface MemoryCase {
  id: string
  title: string
  language: string
  errorType: string
  similarity: number
  sessionId: string
  resolvedAt: string
}

export type Severity = "critical" | "high" | "medium" | "low"

export interface SecurityFinding {
  id: string
  title: string
  severity: Severity
  file: string
  description: string
  detectedAt: string
}

export interface TestRun {
  id: string
  name: string
  status: "passed" | "failed" | "running"
  passCount: number
  failCount: number
  durationMs: number
  ranAt: string
}

export interface RegressionTest {
  id: string
  name: string
  project: string
  lastStatus: "passed" | "failed"
  lastRun: string
}

export type ImpactLevel = "high" | "medium" | "low"

export interface PerformanceInsight {
  id: string
  title: string
  impact: ImpactLevel
  description: string
  metricBefore: string
  metricAfter: string
}

export interface AnalyticsPoint {
  date: string
  bugsFixed: number
  successRate: number
}
