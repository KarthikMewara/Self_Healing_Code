// The master "heal log" behind every healing metric on Dashboard and Analytics.
//
// It is a synthetic, seeded list of heal attempts (one record per attempt) over
// the last 187 days. Each 30-day window is pinned to hand-picked totals, so the
// numbers the rest of the app quotes come out exactly: the latest 30 days hold
// 61 resolved heals, 6 failed (91% success) and a 6m 40s mean time to fix.
// Dashboard and Analytics both aggregate from this same log, so they can never
// disagree with each other.

import type { LanguageKey } from "@/lib/highlight"

import { apportion, createRng, pickWeighted, type Rand } from "./prng"

/**
 * Preview data is anchored to the newest timestamp in src/services/mock-data.ts
 * (the checkout-service fix on Sep 24), so generated series end on the same
 * "today" as the sessions, runs and findings they sit beside.
 */
export const MOCK_TODAY = new Date(2026, 8, 24)

export interface HealEvent {
  outcome: "resolved" | "failed"
  language: LanguageKey
  errorType: string
  /** Submit -> tested fix (resolved) or submit -> give-up (failed). */
  seconds: number
  /** Resolved by the first generated patch, without a retry. */
  firstAttempt: boolean
  /** Estimated engineer-hours a manual fix would have cost (resolved only). */
  saved: { debugging: number; review: number; tests: number }
}

export interface HealingDay {
  date: Date
  /** yyyy-mm-dd */
  iso: string
  /** "Sep 24" */
  label: string
  fixed: number
  failed: number
  events: HealEvent[]
}

interface WindowPlan {
  days: number
  fixed: number
  failed: number
  avgSeconds: number
  firstTry: number
}

// Oldest -> newest. Adoption grows and the healer gets faster and more
// accurate as AI Memory accumulates solved cases.
const PLAN: WindowPlan[] = [
  { days: 7, fixed: 6, failed: 3, avgSeconds: 660, firstTry: 0.6 },
  { days: 30, fixed: 28, failed: 10, avgSeconds: 640, firstTry: 0.62 },
  { days: 30, fixed: 33, failed: 10, avgSeconds: 600, firstTry: 0.66 },
  { days: 30, fixed: 38, failed: 9, avgSeconds: 560, firstTry: 0.7 },
  { days: 30, fixed: 41, failed: 8, avgSeconds: 520, firstTry: 0.73 },
  { days: 30, fixed: 52, failed: 8, avgSeconds: 455, firstTry: 0.77 },
  { days: 30, fixed: 61, failed: 6, avgSeconds: 400, firstTry: 0.82 },
]

// Sun..Sat -- teams ship (and break things) mid-week.
const WEEKDAY_FACTOR = [0.3, 1.05, 1.2, 1.15, 1.1, 0.95, 0.35]

const LANGUAGE_WEIGHTS: ReadonlyArray<readonly [LanguageKey, number]> = [
  ["typescript", 34],
  ["python", 22],
  ["go", 18],
  ["java", 12],
  ["javascript", 7],
  ["csharp", 3],
  ["ruby", 2],
  ["php", 2],
]

const ERROR_TYPES: Record<LanguageKey, ReadonlyArray<readonly [string, number]>> = {
  typescript: [
    ["TypeError", 70],
    ["RangeError", 30],
  ],
  javascript: [
    ["TypeError", 80],
    ["ReferenceError", 20],
  ],
  python: [
    ["KeyError", 55],
    ["AttributeError", 45],
  ],
  go: [
    ["nil pointer dereference", 75],
    ["index out of range", 25],
  ],
  java: [["NullPointerException", 1]],
  csharp: [["NullReferenceException", 1]],
  ruby: [["NoMethodError", 1]],
  php: [["TypeError", 1]],
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function shortDate(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

function isoDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

function makeEvent(rand: Rand, outcome: HealEvent["outcome"], plan: WindowPlan): HealEvent {
  const language = pickWeighted(rand, LANGUAGE_WEIGHTS)
  const errorType = pickWeighted(rand, ERROR_TYPES[language])
  // Skewed spread: most heals are quick, a few drag on.
  const spread = 0.45 + rand() * rand() * 1.9
  const resolved = outcome === "resolved"
  return {
    outcome,
    language,
    errorType,
    seconds: plan.avgSeconds * spread * (resolved ? 1 : 1.6),
    firstAttempt: resolved && rand() < plan.firstTry,
    saved: resolved
      ? { debugging: 0.8 + rand() * 0.9, review: 0.2 + rand() * 0.3, tests: 0.25 + rand() * 0.4 }
      : { debugging: 0, review: 0, tests: 0 },
  }
}

/**
 * Places `count` items across the window one per equal-width segment (weighted
 * by activity inside each segment), so rare events such as failed heals are
 * spread out instead of clumping into a single week.
 */
function stratify(weights: number[], count: number, rand: Rand): number[] {
  const out = weights.map(() => 0)
  const width = weights.length / Math.max(1, count)
  for (let k = 0; k < count; k++) {
    const from = Math.floor(k * width)
    const to = Math.max(from + 1, Math.floor((k + 1) * width))
    const slice = weights.slice(from, to)
    let roll = rand() * slice.reduce((a, b) => a + b, 0)
    let index = from
    for (let i = 0; i < slice.length; i++) {
      roll -= slice[i]
      if (roll <= 0) {
        index = from + i
        break
      }
    }
    out[index] += 1
  }
  return out
}

function buildSeries(): HealingDay[] {
  const rand = createRng(25)
  const totalDays = PLAN.reduce((n, w) => n + w.days, 0)
  const days: HealingDay[] = []

  for (const plan of PLAN) {
    const start = days.length
    const dates = Array.from({ length: plan.days }, (_, i) => {
      const date = new Date(MOCK_TODAY)
      date.setDate(date.getDate() - (totalDays - 1 - (start + i)))
      return date
    })
    const weights = dates.map((date) => WEEKDAY_FACTOR[date.getDay()] * (0.55 + rand() * 0.9))
    const fixedPerDay = apportion(weights, plan.fixed)
    const failedPerDay = stratify(weights, plan.failed, rand)

    const windowDays = dates.map<HealingDay>((date, i) => ({
      date,
      iso: isoDate(date),
      label: shortDate(date),
      fixed: fixedPerDay[i],
      failed: failedPerDay[i],
      events: [
        ...Array.from({ length: fixedPerDay[i] }, () => makeEvent(rand, "resolved", plan)),
        ...Array.from({ length: failedPerDay[i] }, () => makeEvent(rand, "failed", plan)),
      ],
    }))

    // Pin the window's mean time-to-fix exactly to the plan.
    const resolved = windowDays.flatMap((d) => d.events.filter((e) => e.outcome === "resolved"))
    const mean = resolved.reduce((s, e) => s + e.seconds, 0) / Math.max(1, resolved.length)
    for (const e of resolved) e.seconds *= plan.avgSeconds / mean

    days.push(...windowDays)
  }
  return days
}

/** Oldest first; the last entry is MOCK_TODAY. */
export const HEALING_DAYS: HealingDay[] = buildSeries()

/** The `count` days ending `offset` days before MOCK_TODAY (oldest first). */
export function lastDays(count: number, offset = 0): HealingDay[] {
  const end = HEALING_DAYS.length - offset
  return HEALING_DAYS.slice(Math.max(0, end - count), end)
}

export interface HealingTotals {
  fixed: number
  failed: number
  attempted: number
  /** % of attempts that ended in a tested fix. */
  successRate: number
  /** % of attempts fixed by the first generated patch. */
  firstAttemptRate: number
  /** Mean seconds to a tested fix. */
  avgSeconds: number
  hoursSaved: number
  saved: { debugging: number; review: number; tests: number }
}

export function totals(days: HealingDay[]): HealingTotals {
  let fixed = 0
  let failed = 0
  let first = 0
  let seconds = 0
  const saved = { debugging: 0, review: 0, tests: 0 }
  for (const day of days) {
    for (const e of day.events) {
      if (e.outcome === "failed") {
        failed++
        continue
      }
      fixed++
      seconds += e.seconds
      if (e.firstAttempt) first++
      saved.debugging += e.saved.debugging
      saved.review += e.saved.review
      saved.tests += e.saved.tests
    }
  }
  const attempted = fixed + failed
  return {
    fixed,
    failed,
    attempted,
    successRate: attempted ? (fixed / attempted) * 100 : 0,
    firstAttemptRate: attempted ? (first / attempted) * 100 : 0,
    avgSeconds: fixed ? seconds / fixed : 0,
    hoursSaved: saved.debugging + saved.review + saved.tests,
    saved,
  }
}

/** Resolved-heal counts grouped by a key, largest first. */
export function countResolved<K extends string>(days: HealingDay[], key: (e: HealEvent) => K) {
  const counts = new Map<K, number>()
  for (const day of days) {
    for (const e of day.events) {
      if (e.outcome !== "resolved") continue
      const k = key(e)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export interface ErrorTypeStat {
  type: string
  count: number
  /** Languages this error type was healed in, most frequent first. */
  languages: LanguageKey[]
  avgSeconds: number
}

/** Resolved heals by error type: the `top` largest plus an "Other" remainder. */
export function errorBreakdown(days: HealingDay[], top = 7) {
  const byType = new Map<string, { count: number; seconds: number; langs: Map<LanguageKey, number> }>()
  for (const day of days) {
    for (const e of day.events) {
      if (e.outcome !== "resolved") continue
      const entry = byType.get(e.errorType) ?? { count: 0, seconds: 0, langs: new Map() }
      entry.count++
      entry.seconds += e.seconds
      entry.langs.set(e.language, (entry.langs.get(e.language) ?? 0) + 1)
      byType.set(e.errorType, entry)
    }
  }
  const all: ErrorTypeStat[] = [...byType.entries()]
    .map(([type, v]) => ({
      type,
      count: v.count,
      avgSeconds: v.seconds / v.count,
      languages: [...v.langs.entries()].sort((a, b) => b[1] - a[1]).map(([lang]) => lang),
    }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  const items = all.slice(0, top)
  const other = all.slice(top).reduce((n, s) => n + s.count, 0)
  return { items, other, total: all.reduce((n, s) => n + s.count, 0), distinct: all.length }
}

/** Percent change from `previous` to `current`, rounded; 0 when there is no baseline. */
export function pctChange(current: number, previous: number) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}
