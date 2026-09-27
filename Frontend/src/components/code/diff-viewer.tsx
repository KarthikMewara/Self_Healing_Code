import { Check, ChevronsUpDown, Columns2, Copy, Download, FileCode, Rows3 } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useMemo, useState } from "react"

import { SegmentedControl } from "@/components/app/segmented-control"
import { EmphasizedTokens } from "@/components/code/token-spans"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { collapseUnchanged, computeDiffRows, diffStats, toSplitRows, type DiffRow, type SplitRow } from "@/lib/diff"
import { LANGUAGE_COLORS, LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"

type Mode = "unified" | "split"

interface DiffViewerProps {
  original: string
  updated: string
  language?: string
  filename?: string
  /** "auto" picks split on wide screens, unified on narrow ones. */
  mode?: Mode | "auto"
  /** Stagger the rows in on mount. */
  animate?: boolean
  toolbar?: boolean
  className?: string
  maxHeight?: number
  onCopy?: () => void
  onDownload?: () => void
}

function useWide(query = "(min-width: 1280px)") {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const on = () => setWide(mql.matches)
    mql.addEventListener("change", on)
    return () => mql.removeEventListener("change", on)
  }, [query])
  return wide
}

const ROW_BG: Record<DiffRow["type"], string> = {
  add: "bg-success/10",
  remove: "bg-destructive/10",
  context: "",
}

const SIGN: Record<DiffRow["type"], string> = { add: "+", remove: "−", context: " " }

function Gutter({ n, type }: { n?: number; type: DiffRow["type"] }) {
  return (
    <span
      className={cn(
        "w-10 shrink-0 pr-2 text-right tabular-nums select-none",
        type === "add" ? "text-success/70" : type === "remove" ? "text-destructive/70" : "text-muted-foreground/40",
      )}
    >
      {n ?? ""}
    </span>
  )
}

function Code({ row }: { row: DiffRow }) {
  return (
    <EmphasizedTokens
      tokens={row.tokens}
      ranges={row.emphasis}
      markClassName={cn("rounded-[3px]", row.type === "add" ? "bg-success/30" : "bg-destructive/30")}
    />
  )
}

/** GitHub-style diff: unified or split, word-level highlights, foldable context. */
export function DiffViewer({
  original,
  updated,
  language = "javascript",
  filename,
  mode: modeProp = "auto",
  animate = false,
  toolbar = true,
  className,
  maxHeight = 560,
  onCopy,
  onDownload,
}: DiffViewerProps) {
  const wide = useWide()
  const [userMode, setUserMode] = useState<Mode | null>(null)
  const mode: Mode = userMode ?? (modeProp === "auto" ? (wide ? "split" : "unified") : modeProp)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => computeDiffRows(original, updated, language), [original, updated, language])
  const stats = diffStats(rows)
  const lang = toLanguageKey(language)
  const name = filename ?? `fixed.${LANGUAGE_EXTENSIONS[lang]}`

  const unifiedSegments = useMemo(() => collapseUnchanged(rows, (r) => r.type === "context"), [rows])
  const splitSegments = useMemo(
    () => collapseUnchanged(toSplitRows(rows), (r: SplitRow) => r.left?.type === "context"),
    [rows],
  )

  const totalBlocks = Math.min(5, stats.added + stats.removed)
  const addBlocks = stats.added + stats.removed ? Math.round((stats.added / (stats.added + stats.removed)) * totalBlocks) : 0

  const copy = () => {
    navigator.clipboard?.writeText(updated)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
    onCopy?.()
  }

  const download = () => {
    const blob = new Blob([updated], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name.split("/").pop() ?? name
    a.click()
    URL.revokeObjectURL(url)
    onDownload?.()
  }

  const downloadPatch = () => {
    const origLines = original.split("\n")
    const fixedLines = updated.split("\n")
    const patchHeader = [
      `--- a/${name}`,
      `+++ b/${name}`,
      `@@ -1,${origLines.length} +1,${fixedLines.length} @@`,
      ...rows.map((r) => `${r.type === "add" ? "+" : r.type === "remove" ? "-" : " "}${r.text}`),
    ].join("\n")

    const blob = new Blob([patchHeader], { type: "text/x-diff" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name.replace(/\.[^/.]+$/, "")}.patch`
    a.click()
    URL.revokeObjectURL(url)
    onDownload?.()
  }

  let rowIndex = 0
  const rowMotion = (type: DiffRow["type"]) => {
    const i = rowIndex++
    if (!animate) return {}
    return {
      initial: { opacity: 0, x: type === "add" ? 10 : type === "remove" ? -10 : 0 },
      animate: { opacity: 1, x: 0 },
      transition: { delay: Math.min(i, 45) * 0.03, duration: 0.35 },
    }
  }

  const expander = (id: number, count: number) => (
    <button
      key={`c-${id}`}
      type="button"
      onClick={() => setExpanded((prev) => new Set(prev).add(id))}
      className="flex w-full items-center gap-2 border-y border-border/60 bg-info/5 px-3 py-1 text-left font-sans text-[11px] text-info transition-colors hover:bg-info/10"
    >
      <ChevronsUpDown className="size-3" />
      Expand {count} unchanged line{count === 1 ? "" : "s"}
    </button>
  )

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card/70", className)}>
      {toolbar && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
          <span className="min-w-0 truncate font-mono text-xs text-foreground/90">{name}</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {LANGUAGE_LABELS[lang]}
          </span>
          <span className="flex items-center gap-2 font-mono text-xs">
            <span className="text-success">+{stats.added}</span>
            <span className="text-destructive">−{stats.removed}</span>
            <span className="flex gap-0.5" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-[2px]",
                    i < addBlocks ? "bg-success" : i < totalBlocks ? "bg-destructive" : "bg-muted-foreground/25",
                  )}
                />
              ))}
            </span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <SegmentedControl
              size="sm"
              aria-label="Diff layout"
              value={mode}
              onChange={setUserMode}
              options={[
                { value: "unified", label: "Unified", icon: <Rows3 /> },
                { value: "split", label: "Split", icon: <Columns2 /> },
              ]}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copy fixed code"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied" : "Copy fixed code"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={download}
                    aria-label="Download fixed file"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <Download className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Download {a11yName(name)}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={downloadPatch}
                    aria-label="Download Git unified diff patch"
                    className="inline-flex size-7 items-center justify-center rounded-md text-primary/80 transition-colors hover:bg-muted hover:text-primary"
                  />
                }
              >
                <FileCode className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Download .patch (Git diff)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <div
        className="scrollbar-thin overflow-auto font-mono text-[12.5px] leading-[1.75] [font-variant-ligatures:none]"
        style={{ maxHeight }}
      >
        {mode === "unified" ? (
          <div className="w-max min-w-full py-1">
            {unifiedSegments.map((seg, si) =>
              seg.kind === "collapsed" && !expanded.has(seg.id) ? (
                expander(seg.id, seg.rows.length)
              ) : (
                <div key={`s-${si}`}>
                  {seg.rows.map((row, ri) => (
                    <motion.div
                      key={`${si}-${ri}`}
                      {...rowMotion(row.type)}
                      className={cn(
                        "flex pr-4",
                        ROW_BG[row.type],
                        row.type === "add" && "shadow-[inset_2px_0_0_var(--success)]",
                        row.type === "remove" && "shadow-[inset_2px_0_0_var(--destructive)]",
                      )}
                    >
                      <Gutter n={row.oldNo} type={row.type} />
                      <Gutter n={row.newNo} type={row.type} />
                      <span
                        className={cn(
                          "w-5 shrink-0 text-center select-none",
                          row.type === "add" ? "text-success" : row.type === "remove" ? "text-destructive" : "text-transparent",
                        )}
                      >
                        {SIGN[row.type]}
                      </span>
                      <span className={cn("whitespace-pre", row.type === "remove" && "opacity-80")}>
                        {row.tokens.length ? <Code row={row} /> : " "}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="py-1">
            {splitSegments.map((seg, si) =>
              seg.kind === "collapsed" && !expanded.has(seg.id) ? (
                expander(seg.id, seg.rows.length)
              ) : (
                <div key={`s-${si}`}>
                  {seg.rows.map((pair, ri) => (
                    <motion.div key={`${si}-${ri}`} {...rowMotion(pair.right?.type ?? pair.left?.type ?? "context")} className="grid grid-cols-2">
                      {[pair.left, pair.right].map((row, side) => (
                        <div
                          key={side}
                          className={cn(
                            "flex min-w-0 pr-3",
                            side === 0 && "border-r border-border/60",
                            row ? ROW_BG[row.type] : "bg-muted/30",
                            row?.type === "add" && "shadow-[inset_2px_0_0_var(--success)]",
                            row?.type === "remove" && "shadow-[inset_2px_0_0_var(--destructive)]",
                          )}
                        >
                          {row ? (
                            <>
                              <Gutter n={side === 0 ? row.oldNo : row.newNo} type={row.type} />
                              <span
                                className={cn(
                                  "w-4 shrink-0 text-center select-none",
                                  row.type === "add" ? "text-success" : row.type === "remove" ? "text-destructive" : "text-transparent",
                                )}
                              >
                                {SIGN[row.type]}
                              </span>
                              <span className="min-w-0 break-all whitespace-pre-wrap">
                                {row.tokens.length ? <Code row={row} /> : " "}
                              </span>
                            </>
                          ) : (
                            <span className="w-full select-none"> </span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function a11yName(name: string) {
  return name.split("/").pop() ?? name
}
