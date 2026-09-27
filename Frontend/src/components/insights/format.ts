// Display formatters shared by the insight screens (Dashboard, Testing,
// Security, Performance, Analytics).

/** 400 -> "6m 40s", 38 -> "38s", 3725 -> "1h 2m". */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
  const h = Math.floor(s / 3600)
  return `${h}h ${Math.floor((s % 3600) / 60)}m`
}

/** 48200 -> "48.2s", 850 -> "850ms", 61300 -> "1m 01s". */
export function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return formatDuration(ms / 1000)
}

/** 18400 -> "18.4k", 1_250_000 -> "1.3M". */
export function formatCompact(value: number, decimals = 1) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`
  if (abs >= 10_000) return `${(value / 1000).toFixed(decimals)}k`
  return Math.round(value).toLocaleString()
}

/** A timestamp relative to `now`: "just now", "4m ago", "2h ago", "Yesterday", "3 days ago". */
export function formatRelative(at: number, now: number) {
  const diff = Math.max(0, now - at)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? "Yesterday" : `${d} days ago`
}

/** Elapsed stopwatch text: 7421 -> "0:07.4". */
export function formatStopwatch(ms: number) {
  const total = Math.max(0, ms) / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, "0")}`
}

/** "2026-09-24 09:12" -> "Sep 24, 09:12". */
export function formatStamp(stamp: string) {
  const [date, time] = stamp.split(" ")
  const [, m, d] = date.split("-").map(Number)
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]
  return time ? `${month} ${d}, ${time}` : `${month} ${d}`
}

export function pluralize(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}
