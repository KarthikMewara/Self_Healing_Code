// Projects preview store. Seeded from src/services/mock-data.ts and held in a
// module-level store (useSyncExternalStore), so projects created, renamed,
// archived or deleted on /projects persist across navigation for the rest of
// the browser session -- and the details page can find brand-new projects.
// Nothing here talks to a backend.

import { useSyncExternalStore } from "react"

import { LANGUAGE_LABELS, toLanguageKey, type LanguageKey } from "@/lib/highlight"
import { projects as seedProjects, securityFindings } from "@/services/mock-data"
import { PREVIEW_NOW } from "@/services/mock/history"
import type { Project, ProjectHealth, SecurityFinding } from "@/types/domain"

export interface ProjectStats {
  resolved: number
  failed: number
  inProgress: number
  /** Mean time from submit to tested fix, in seconds. */
  avgFixSec: number
}

export interface ProjectRecord extends Project {
  languageKey: LanguageKey
  /** 0-100; null until the project has run a debug session. */
  healthScore: number | null
  lastActivityAt: number
  createdAt: number
  archived: boolean
  /** Created in this browser session, so it has no preview history. */
  isNew: boolean
  stats: ProjectStats
  /** The name it was seeded with (security findings are keyed by path). */
  seedName: string | null
}

export const HEALTH_META: Record<
  ProjectHealth,
  { label: string; tone: "success" | "warning" | "danger"; color: string }
> = {
  healthy: { label: "Healthy", tone: "success", color: "var(--success)" },
  attention: { label: "Needs attention", tone: "warning", color: "var(--warning)" },
  critical: { label: "Critical", tone: "danger", color: "var(--destructive)" },
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

interface SeedExtra {
  healthScore: number
  hoursAgo: number
  created: [number, number, number]
  stats: ProjectStats
  /** % change vs the prior 30 days. */
  deltas: { sessions: number; success: number; fixTime: number }
  /** Sessions per day, last 14 days (oldest first). */
  sessionsTrend: number[]
  /** Health score keyframes over the last 30 days: [dayIndex 0-29, score]. */
  healthKeys: [number, number][]
}

// resolved + failed + inProgress == sessionsCount for every project; across all
// five that is 53 resolved / 5 failed -> the 91% fix rate the Dashboard quotes.
const SEED_EXTRA: Record<string, SeedExtra> = {
  proj_1: {
    healthScore: 71,
    hoursAgo: 2,
    created: [2025, 10, 4],
    stats: { resolved: 13, failed: 1, inProgress: 0, avgFixSec: 312 },
    deltas: { sessions: 17, success: 4, fixTime: -12 },
    sessionsTrend: [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1],
    healthKeys: [[0, 82], [9, 84], [14, 80], [19, 66], [24, 69], [29, 71]],
  },
  proj_2: {
    healthScore: 92,
    hoursAgo: 26,
    created: [2026, 0, 19],
    stats: { resolved: 8, failed: 0, inProgress: 0, avgFixSec: 245 },
    deltas: { sessions: 14, success: 0, fixTime: -8 },
    sessionsTrend: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    healthKeys: [[0, 86], [8, 85], [16, 89], [23, 90], [29, 92]],
  },
  proj_3: {
    healthScore: 43,
    hoursAgo: 72,
    created: [2025, 7, 27],
    stats: { resolved: 18, failed: 2, inProgress: 1, avgFixSec: 570 },
    deltas: { sessions: 31, success: -6, fixTime: 22 },
    sessionsTrend: [0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 0, 1, 2],
    healthKeys: [[0, 68], [7, 66], [12, 61], [18, 58], [23, 52], [26, 47], [29, 43]],
  },
  proj_4: {
    healthScore: 96,
    hoursAgo: 120,
    created: [2026, 2, 2],
    stats: { resolved: 5, failed: 0, inProgress: 0, avgFixSec: 210 },
    deltas: { sessions: -20, success: 0, fixTime: -15 },
    sessionsTrend: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    healthKeys: [[0, 90], [11, 92], [20, 95], [29, 96]],
  },
  proj_5: {
    healthScore: 84,
    hoursAgo: 168,
    created: [2025, 9, 13],
    stats: { resolved: 9, failed: 2, inProgress: 0, avgFixSec: 435 },
    deltas: { sessions: 10, success: -9, fixTime: 6 },
    sessionsTrend: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
    healthKeys: [[0, 88], [10, 90], [17, 89], [26, 85], [29, 84]],
  },
}

function seedRecord(p: Project): ProjectRecord {
  const extra = SEED_EXTRA[p.id]
  const [y, m, d] = extra?.created ?? [2026, 0, 1]
  return {
    ...p,
    languageKey: toLanguageKey(p.language),
    healthScore: extra?.healthScore ?? null,
    lastActivityAt: PREVIEW_NOW - (extra?.hoursAgo ?? 24) * HOUR,
    createdAt: new Date(y, m, d).getTime(),
    archived: false,
    isNew: false,
    stats: extra?.stats ?? { resolved: 0, failed: 0, inProgress: 0, avgFixSec: 0 },
    seedName: p.name,
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let records: ProjectRecord[] = seedProjects.map(seedRecord)
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => records

function commit(next: ProjectRecord[]) {
  records = next
  listeners.forEach((listener) => listener())
}

/** Every project, archived ones included (filter on `archived`). */
export function useProjects() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useProject(id: string | undefined) {
  const all = useProjects()
  return id ? all.find((p) => p.id === id) : undefined
}

export function getProjects() {
  return records
}

export interface NewProjectInput {
  name: string
  languageKey: LanguageKey
  description: string
}

export function createProject(input: NewProjectInput): ProjectRecord {
  // Preview data is anchored in the past; a project created now must still
  // sort as the most recent one.
  const now = Math.max(Date.now(), PREVIEW_NOW + 60_000)
  const record: ProjectRecord = {
    id: `proj_${now.toString(36)}`,
    name: input.name.trim(),
    language: LANGUAGE_LABELS[input.languageKey],
    languageKey: input.languageKey,
    description: input.description.trim() || "No description yet.",
    lastActivity: "Just now",
    health: "healthy",
    sessionsCount: 0,
    healthScore: null,
    lastActivityAt: now,
    createdAt: now,
    archived: false,
    isNew: true,
    stats: { resolved: 0, failed: 0, inProgress: 0, avgFixSec: 0 },
    seedName: null,
  }
  commit([record, ...records])
  return record
}

export function renameProject(id: string, name: string) {
  commit(records.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)))
}

export function setProjectArchived(id: string, archived: boolean) {
  commit(records.map((p) => (p.id === id ? { ...p, archived } : p)))
}

export function deleteProject(id: string) {
  commit(records.filter((p) => p.id !== id))
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Returns an error message, or null when the name is usable. */
export function validateProjectName(raw: string, exceptId?: string): string | null {
  const name = raw.trim()
  if (!name) return "Give the project a name."
  if (name.length < 3) return "Use at least 3 characters."
  if (name.length > 40) return "Keep it to 40 characters or fewer."
  if (!KEBAB.test(name)) return "Use lowercase letters, numbers and single hyphens (kebab-case)."
  const clash = records.find((p) => p.id !== exceptId && p.name === name)
  if (clash) return clash.archived ? `An archived project is already called ${name}.` : `A project named ${name} already exists.`
  return null
}

/** Best-effort kebab-case version of whatever was typed. */
export function toKebabCase(raw: string) {
  return raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "")
}

// ---------------------------------------------------------------------------
// Insights (deterministic, derived per project)
// ---------------------------------------------------------------------------

export interface HealthPoint {
  /** "Sep 24" */
  label: string
  score: number
}

export interface ProjectInsights {
  healthTrend: HealthPoint[]
  /** Score change across the 30-day window. */
  healthChange: number
  sessionsTrend: number[]
  successTrend: number[]
  fixTimeTrend: number[]
  deltas: { sessions: number; success: number; fixTime: number } | null
  vulnerabilities: SecurityFinding[]
  /** resolved / (resolved + failed), 0-100; null without finished sessions. */
  successRate: number | null
}

function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

function interpolate(keys: [number, number][], day: number) {
  for (let i = 1; i < keys.length; i++) {
    const [d0, v0] = keys[i - 1]
    const [d1, v1] = keys[i]
    if (day <= d1) return v0 + ((v1 - v0) * (day - d0)) / Math.max(1, d1 - d0)
  }
  return keys[keys.length - 1][1]
}

/** A short series drifting from `start` to `end` with seeded wobble, kept within [min, max]. */
function drift(rand: () => number, start: number, end: number, points: number, wobble: number, max = Infinity) {
  return Array.from({ length: points }, (_, i) => {
    const base = start + ((end - start) * i) / (points - 1)
    const noise = i === points - 1 ? 0 : (rand() - 0.5) * 2 * wobble
    return Math.round(Math.min(max, Math.max(0, base + noise)) * 10) / 10
  })
}

const insightCache = new Map<string, ProjectInsights>()

export function getProjectInsights(project: ProjectRecord): ProjectInsights {
  const cached = insightCache.get(project.id)
  if (cached) return cached

  const extra = SEED_EXTRA[project.id]
  const finished = project.stats.resolved + project.stats.failed
  const successRate = finished ? (project.stats.resolved / finished) * 100 : null
  const vulnerabilities = project.seedName
    ? securityFindings.filter((f) => f.file.startsWith(`${project.seedName}/`))
    : []

  if (!extra || project.healthScore === null) {
    const empty: ProjectInsights = {
      healthTrend: [],
      healthChange: 0,
      sessionsTrend: [],
      successTrend: [],
      fixTimeTrend: [],
      deltas: null,
      vulnerabilities,
      successRate,
    }
    insightCache.set(project.id, empty)
    return empty
  }

  const rand = createRng(hashSeed(project.id))
  const healthTrend = Array.from({ length: 30 }, (_, day) => {
    const base = interpolate(extra.healthKeys, day)
    const noise = day === 29 ? 0 : (rand() - 0.5) * 3.2
    const score = day === 29 ? project.healthScore! : Math.round(Math.min(100, Math.max(0, base + noise)))
    return { label: DAY_LABEL.format(PREVIEW_NOW - (29 - day) * DAY), score }
  })

  const rate = successRate ?? 100
  const insights: ProjectInsights = {
    healthTrend,
    healthChange: healthTrend[29].score - healthTrend[0].score,
    sessionsTrend: extra.sessionsTrend,
    successTrend: drift(rand, Math.min(100, rate / (1 + extra.deltas.success / 100)), rate, 12, 1.6, 100),
    fixTimeTrend: drift(rand, project.stats.avgFixSec / (1 + extra.deltas.fixTime / 100), project.stats.avgFixSec, 12, 18),
    deltas: extra.deltas,
    vulnerabilities,
    successRate,
  }
  insightCache.set(project.id, insights)
  return insights
}

/** One sentence on why a project scores the way it does. */
export function healthNarrative(project: ProjectRecord, insights: ProjectInsights) {
  if (project.healthScore === null) return "Health is scored once the first debug session finishes."
  const parts: string[] = []
  const open = insights.vulnerabilities.length
  const severe = insights.vulnerabilities.filter((v) => v.severity === "critical" || v.severity === "high").length
  if (open) {
    parts.push(
      severe
        ? `${open} open finding${open === 1 ? "" : "s"} (${severe === open ? "" : `${severe} `}high severity)`
        : `${open} open finding${open === 1 ? "" : "s"}`,
    )
  }
  if (project.stats.failed) parts.push(`${project.stats.failed} failed session${project.stats.failed === 1 ? "" : "s"}`)
  if (project.stats.inProgress) parts.push(`${project.stats.inProgress} heal in progress`)
  const change = insights.healthChange
  const trend = change === 0 ? "Flat over 30 days" : `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} pts in 30 days`
  return `${trend} · ${parts.length ? parts.join(" · ") : "nothing open"}.`
}
