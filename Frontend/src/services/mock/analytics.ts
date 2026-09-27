// Analytics preview data for 7 / 30 / 90-day ranges. Every series is derived
// from the shared, seeded heal log in ./healing-series, so switching ranges is
// deterministic and the 30-day figures match the Dashboard exactly.

import type { LanguageKey } from "@/lib/highlight"

import {
  errorBreakdown,
  HEALING_DAYS,
  lastDays,
  pctChange,
  shortDate,
  totals,
  type HealingDay,
  type HealingTotals,
} from "./healing-series"
import { round } from "./prng"

export type Range = "7d" | "30d" | "90d"

export const RANGES: { value: Range; label: string; days: number; noun: string }[] = [
  { value: "7d", label: "7d", days: 7, noun: "7 days" },
  { value: "30d", label: "30d", days: 30, noun: "30 days" },
  { value: "90d", label: "90d", days: 90, noun: "90 days" },
]

export const rangeDays = (range: Range) => RANGES.find((r) => r.value === range)?.days ?? 30

export interface DailyPoint {
  label: string
  iso: string
  bugsFixed: number
  /** Bugs fixed on the matching day of the previous period. */
  previous: number
  /** 7-day rolling rates, %. */
  successRate: number
  firstAttempt: number
}

export interface SavedBucket {
  label: string
  /** Tooltip heading, e.g. "Week of Jun 30". */
  title: string
  debugging: number
  review: number
  tests: number
}

export type LanguageBucket = "typescript" | "python" | "go" | "java" | "other"

export const LANGUAGE_BUCKETS: { key: LanguageBucket; label: string; color: string }[] = [
  // Fixed order + colours follow the CVD-validated categorical sequence; "Other" is neutral.
  { key: "typescript", label: "TypeScript", color: "var(--chart-1)" },
  { key: "python", label: "Python", color: "var(--chart-3)" },
  { key: "go", label: "Go", color: "var(--chart-2)" },
  { key: "java", label: "Java", color: "var(--chart-4)" },
  { key: "other", label: "Other", color: "var(--muted-foreground)" },
]

const toBucket = (lang: LanguageKey): LanguageBucket =>
  lang === "typescript" || lang === "python" || lang === "go" || lang === "java" ? lang : "other"

function rolling(offset: number) {
  const t = totals(lastDays(7, offset))
  return { success: round(t.successRate, 1), first: round(t.firstAttemptRate, 1) }
}

/** Splits `days` into `count` near-equal consecutive buckets. */
function chunk(days: HealingDay[], count: number) {
  const size = days.length / count
  return Array.from({ length: count }, (_, i) => days.slice(Math.round(i * size), Math.round((i + 1) * size)))
}

export interface AnalyticsData {
  range: Range
  days: HealingDay[]
  current: HealingTotals
  previous: HealingTotals
  deltas: { fixed: number; successRate: number; hoursSaved: number; avgSeconds: number }
  sparklines: { fixed: number[]; successRate: number[]; hoursSaved: number[]; avgSeconds: number[] }
  daily: DailyPoint[]
  saved: SavedBucket[]
  languages: { key: LanguageBucket; label: string; color: string; value: number }[]
  errors: ReturnType<typeof errorBreakdown>
}

const cache = new Map<Range, AnalyticsData>()

export function getAnalytics(range: Range): AnalyticsData {
  const hit = cache.get(range)
  if (hit) return hit

  const n = rangeDays(range)
  const days = lastDays(n)
  const prevDays = lastDays(n, n)
  const current = totals(days)
  const previous = totals(prevDays)

  const daily: DailyPoint[] = days.map((day, i) => {
    const offset = n - 1 - i
    const r = rolling(offset)
    return {
      label: day.label,
      iso: day.iso,
      bugsFixed: day.fixed,
      previous: prevDays[i]?.fixed ?? 0,
      successRate: r.success,
      firstAttempt: r.first,
    }
  })

  const savedDays = range === "90d" ? chunk(days, 13) : days.map((d) => [d])
  const saved: SavedBucket[] = savedDays.map((group) => {
    const t = totals(group)
    const start = group[0]
    return {
      label: start.label,
      title: group.length > 1 ? `Week of ${shortDate(start.date)}` : start.label,
      debugging: round(t.saved.debugging, 1),
      review: round(t.saved.review, 1),
      tests: round(t.saved.tests, 1),
    }
  })

  const sparkGroups = chunk(days, n === 7 ? 7 : n === 30 ? 10 : 13)
  const spark = (metric: (t: HealingTotals) => number) => sparkGroups.map((g) => round(metric(totals(g)), 1))

  const byLanguage = new Map<LanguageBucket, number>()
  for (const day of days) {
    for (const e of day.events) {
      if (e.outcome !== "resolved") continue
      const key = toBucket(e.language)
      byLanguage.set(key, (byLanguage.get(key) ?? 0) + 1)
    }
  }

  const data: AnalyticsData = {
    range,
    days,
    current,
    previous,
    deltas: {
      fixed: pctChange(current.fixed, previous.fixed),
      successRate: pctChange(current.successRate, previous.successRate),
      hoursSaved: pctChange(current.hoursSaved, previous.hoursSaved),
      avgSeconds: pctChange(current.avgSeconds, previous.avgSeconds),
    },
    sparklines: {
      fixed: spark((t) => t.fixed),
      successRate: spark((t) => t.successRate),
      hoursSaved: spark((t) => t.hoursSaved),
      avgSeconds: spark((t) => t.avgSeconds),
    },
    daily,
    saved,
    languages: LANGUAGE_BUCKETS.map((b) => ({ ...b, value: byLanguage.get(b.key) ?? 0 })),
    errors: errorBreakdown(days, 7),
  }
  cache.set(range, data)
  return data
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** One row per day of the range -- exactly what the charts are drawn from. */
export function buildAnalyticsCsv(range: Range) {
  const { days } = getAnalytics(range)
  const n = rangeDays(range)
  const header = [
    "date",
    "bugs_fixed",
    "heals_failed",
    "success_rate_7d_pct",
    "first_patch_rate_7d_pct",
    "avg_time_to_fix_s",
    "hours_saved_debugging",
    "hours_saved_review",
    "hours_saved_tests",
  ]
  const rows = days.map((day, i) => {
    const t = totals([day])
    const r = rolling(n - 1 - i)
    return [
      day.iso,
      day.fixed,
      day.failed,
      r.success,
      r.first,
      t.fixed ? Math.round(t.avgSeconds) : "",
      round(t.saved.debugging, 2),
      round(t.saved.review, 2),
      round(t.saved.tests, 2),
    ]
  })
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
  const last = HEALING_DAYS[HEALING_DAYS.length - 1].iso
  return { csv: `${csv}\n`, filename: `healing-analytics-${range}-${last}.csv`, rows: rows.length }
}
