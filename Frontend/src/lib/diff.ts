import { diffLines, diffWordsWithSpace } from "diff"

import { highlightLines, type Token } from "@/lib/highlight"

export type DiffRowType = "add" | "remove" | "context"

export interface DiffRow {
  type: DiffRowType
  oldNo?: number
  newNo?: number
  text: string
  tokens: Token[]
  /** Word-level changed character ranges within this line. */
  emphasis: [number, number][]
}

function countLines(value: string) {
  if (!value) return 0
  const trimmed = value.endsWith("\n") ? value.slice(0, -1) : value
  return trimmed.split("\n").length
}

/**
 * Line diff with syntax tokens taken from the full before/after files (so
 * multi-line constructs keep their colours) plus word-level emphasis on lines
 * that were modified rather than wholly added or removed.
 */
export function computeDiffRows(original: string, updated: string, language = "javascript"): DiffRow[] {
  const oldTokens = highlightLines(original, language)
  const newTokens = highlightLines(updated, language)
  const oldText = original.split("\n")
  const newText = updated.split("\n")
  const rows: DiffRow[] = []
  let o = 0
  let n = 0

  for (const part of diffLines(original, updated)) {
    const count = countLines(part.value)
    for (let k = 0; k < count; k++) {
      if (part.added) {
        rows.push({ type: "add", newNo: n + 1, text: newText[n] ?? "", tokens: newTokens[n] ?? [], emphasis: [] })
        n++
      } else if (part.removed) {
        rows.push({ type: "remove", oldNo: o + 1, text: oldText[o] ?? "", tokens: oldTokens[o] ?? [], emphasis: [] })
        o++
      } else {
        rows.push({
          type: "context",
          oldNo: o + 1,
          newNo: n + 1,
          text: newText[n] ?? "",
          tokens: newTokens[n] ?? [],
          emphasis: [],
        })
        o++
        n++
      }
    }
  }

  // Pair each run of removals with the run of additions right after it and
  // mark the words that actually changed.
  let i = 0
  while (i < rows.length) {
    if (rows[i].type !== "remove") {
      i++
      continue
    }
    const removes: DiffRow[] = []
    while (i < rows.length && rows[i].type === "remove") removes.push(rows[i++])
    const adds: DiffRow[] = []
    while (i < rows.length && rows[i].type === "add") adds.push(rows[i++])
    const pairs = Math.min(removes.length, adds.length)
    for (let p = 0; p < pairs; p++) {
      const before = removes[p]
      const after = adds[p]
      let oi = 0
      let ni = 0
      const oldRanges: [number, number][] = []
      const newRanges: [number, number][] = []
      let changed = 0
      for (const c of diffWordsWithSpace(before.text, after.text)) {
        if (c.removed) {
          oldRanges.push([oi, oi + c.value.length])
          oi += c.value.length
          changed += c.value.length
        } else if (c.added) {
          newRanges.push([ni, ni + c.value.length])
          ni += c.value.length
          changed += c.value.length
        } else {
          oi += c.value.length
          ni += c.value.length
        }
      }
      // Only worth emphasising when most of the line survived.
      const total = Math.max(1, before.text.length + after.text.length)
      if (changed / total < 0.6) {
        before.emphasis = oldRanges.filter(([a, b]) => before.text.slice(a, b).trim())
        after.emphasis = newRanges.filter(([a, b]) => after.text.slice(a, b).trim())
      }
    }
  }

  return rows
}

export interface SplitRow {
  left?: DiffRow
  right?: DiffRow
}

export function toSplitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = []
  let i = 0
  while (i < rows.length) {
    const r = rows[i]
    if (r.type === "context") {
      out.push({ left: r, right: r })
      i++
      continue
    }
    const removes: DiffRow[] = []
    while (i < rows.length && rows[i].type === "remove") removes.push(rows[i++])
    const adds: DiffRow[] = []
    while (i < rows.length && rows[i].type === "add") adds.push(rows[i++])
    const max = Math.max(removes.length, adds.length)
    for (let k = 0; k < max; k++) out.push({ left: removes[k], right: adds[k] })
  }
  return out
}

export type DiffSegment<T> = { kind: "rows"; rows: T[] } | { kind: "collapsed"; id: number; rows: T[] }

/**
 * Folds long unchanged stretches (keeping `context` lines around each change)
 * into collapsed segments the viewer can expand on click.
 */
export function collapseUnchanged<T>(rows: T[], isContext: (row: T) => boolean, context = 3): DiffSegment<T>[] {
  const changed = rows.map((r) => !isContext(r))
  const keep = rows.map((_, idx) => {
    for (let d = -context; d <= context; d++) if (changed[idx + d]) return true
    return false
  })
  const segments: DiffSegment<T>[] = []
  let id = 0
  let i = 0
  while (i < rows.length) {
    const start = i
    const kept = keep[i]
    while (i < rows.length && keep[i] === kept) i++
    const slice = rows.slice(start, i)
    if (kept || slice.length < 4) segments.push({ kind: "rows", rows: slice })
    else segments.push({ kind: "collapsed", id: id++, rows: slice })
  }
  return segments
}

export function diffStats(rows: DiffRow[]) {
  return {
    added: rows.filter((r) => r.type === "add").length,
    removed: rows.filter((r) => r.type === "remove").length,
  }
}
