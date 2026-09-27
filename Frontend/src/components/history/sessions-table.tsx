import { LoaderCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { formatDuration, formatFull, formatRelative } from "@/components/history/format"
import { STATUS_META, STEP_LABELS, type SessionRow } from "@/components/history/session-models"
import { LanguageLabel } from "@/components/projects/language-chip"
import { StatusBadge } from "@/components/status-badge"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Pulsing marker for REAL heals from this browser session. */
export function ThisSessionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center gap-1 rounded-full bg-primary/12 px-1.5 text-[10px] font-semibold text-primary ring-1 ring-primary/25",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="animate-ping-soft absolute inset-0 rounded-full bg-primary" />
        <span className="relative size-1.5 rounded-full bg-primary" />
      </span>
      This session
    </span>
  )
}

interface SessionsTableProps {
  rows: SessionRow[]
  onOpen: (row: SessionRow) => void
  highlight?: { id: string; nonce: number } | null
  showProject?: boolean
  className?: string
}

/**
 * Session log as an ARIA table built on CSS grid, so rows can animate in, out
 * and into place. Scrolls horizontally inside its container on small screens.
 */
export function SessionsTable({ rows, onOpen, highlight, showProject = true, className }: SessionsTableProps) {
  const cols = showProject
    ? "grid-cols-[7.25rem_minmax(0,1fr)_10.5rem_5.5rem_6.5rem]"
    : "grid-cols-[7.25rem_minmax(0,1fr)_5.5rem_6.5rem]"

  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <div role="table" aria-label="Debug sessions" className={cn(showProject ? "min-w-[760px]" : "min-w-[600px]")}>
        <div role="rowgroup">
          <div
            role="row"
            className={cn(
              "grid items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
              cols,
            )}
          >
            <span role="columnheader">Status</span>
            <span role="columnheader">Error</span>
            {showProject && <span role="columnheader">Project</span>}
            <span role="columnheader" className="text-right">
              Duration
            </span>
            <span role="columnheader" className="text-right">
              When
            </span>
          </div>
        </div>
        <div role="rowgroup" className="relative">
          <AnimatePresence mode="popLayout" initial>
            {rows.map((row, i) => {
              const meta = STATUS_META[row.status]
              const highlighted = highlight?.id === row.id
              return (
                <motion.div
                  key={row.id}
                  id={`session-row-${row.id}`}
                  role="row"
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.4, delay: Math.min(i, 14) * 0.03, ease: EASE_OUT }}
                  className={cn(
                    "group/row relative grid scroll-mt-24 items-center gap-3 border-b border-border/60 px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/45 has-[button:focus-visible]:bg-muted/45 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/50 has-[button:focus-visible]:ring-inset",
                    cols,
                    row.live && "bg-primary/[0.035]",
                  )}
                >
                  {row.live && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                  {highlighted && (
                    <motion.span
                      key={highlight.nonce}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-primary/10 ring-1 ring-primary/45 ring-inset"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.35, 1, 0.6] }}
                      transition={{ duration: 2.4, ease: "easeInOut" }}
                    />
                  )}
                  <div role="cell">
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                  </div>
                  <div role="cell" className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpen(row)}
                      aria-label={`Open session ${row.id}: ${row.errorSummary}`}
                      className="block w-full min-w-0 text-left outline-none after:absolute after:inset-0 after:content-['']"
                    >
                      <span className="block truncate font-mono text-[12.5px] text-foreground" title={row.errorSummary}>
                        {row.errorSummary}
                      </span>
                    </button>
                    <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate font-mono">{row.id}</span>
                      {row.live && <ThisSessionBadge />}
                      {row.runningStep && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-primary">
                          <LoaderCircle className="size-3 animate-spin" />
                          {STEP_LABELS[row.runningStep]}
                        </span>
                      )}
                    </span>
                  </div>
                  {showProject && (
                    <div role="cell" className="min-w-0">
                      <span className="block truncate text-[13px] text-foreground">
                        {row.projectName ?? <span className="text-muted-foreground">AI Debugger</span>}
                      </span>
                      <LanguageLabel language={row.language} className="mt-0.5 text-[11px]" />
                    </div>
                  )}
                  <div role="cell" className="text-right text-xs text-muted-foreground tabular-nums">
                    {row.status === "in_progress" ? (
                      <span className="inline-flex items-center gap-1">
                        <LoaderCircle className="size-3 animate-spin" />
                        Running
                      </span>
                    ) : row.durationSec !== undefined ? (
                      formatDuration(row.durationSec)
                    ) : (
                      "—"
                    )}
                  </div>
                  <div role="cell" className="text-right text-xs text-muted-foreground" title={formatFull(row.at)}>
                    {formatRelative(row.at, row.now)}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
