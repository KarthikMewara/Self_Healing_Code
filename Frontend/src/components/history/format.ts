// Date/duration formatting shared by the Projects, AI Memory and History
// screens. Fixed "en-US" locale so preview labels are identical everywhere.

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
const MONTH_DAY_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const FULL = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now", "12 min ago", "2 hours ago", "yesterday", "5 days ago", "Aug 14". */
export function formatRelative(at: number, now: number) {
  const diff = Math.max(0, now - at)
  if (diff < 45_000) return "just now"
  if (diff < 90_000) return "1 min ago"
  if (diff < 45 * MINUTE) return `${Math.round(diff / MINUTE)} min ago`
  if (diff < 90 * MINUTE) return "1 hour ago"
  if (diff < 22 * HOUR) return `${Math.round(diff / HOUR)} hours ago`
  if (diff < 36 * HOUR) return "yesterday"
  if (diff < 26 * DAY) return `${Math.round(diff / DAY)} days ago`
  return MONTH_DAY.format(at)
}

/** 48 -> "48s", 118 -> "1m 58s", 3720 -> "1h 02m". */
export function formatDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return r ? `${m}m ${String(r).padStart(2, "0")}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, "0")}m`
}

export const formatDay = (at: number) => MONTH_DAY.format(at)
export const formatDate = (at: number) => MONTH_DAY_YEAR.format(at)
export const formatDateTime = (at: number) => MONTH_DAY_TIME.format(at)
export const formatFull = (at: number) => FULL.format(at)

function startOfDay(at: number) {
  const d = new Date(at)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Calendar-day key, for grouping. */
export const dayKey = (at: number) => startOfDay(at)

/** "Today", "Yesterday", or "Tue, Sep 22". */
export function formatDayLabel(at: number, now: number) {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return WEEKDAY_MONTH_DAY.format(at)
}

/** "2026-09-24" -> "Sep 24" (date-only mock stamps, parsed as local time). */
export function formatIsoDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return MONTH_DAY.format(new Date(y, m - 1, d))
}

export function isoDayToMs(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}
