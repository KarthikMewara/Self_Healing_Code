import {
  ArrowUpRight,
  Check,
  FileCode,
  FlaskConical,
  LoaderCircle,
  Lock,
  RotateCcw,
  RotateCw,
  Undo2,
} from "lucide-react"
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react"
import { useLayoutEffect, useMemo, useRef } from "react"
import { Link } from "react-router-dom"

import { SpotlightCard } from "@/components/fx/spotlight-card"
import { dayKey, formatDateTime, formatDayLabel, formatFull, formatRelative } from "@/components/history/format"
import { useMotionPreference } from "@/components/motion-preference"
import { LanguageDot } from "@/components/projects/language-chip"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { RepairRecord, RepairState } from "@/services/mock/history"

export type RepairBusy = "rolling_back" | "restoring"

export interface RepairEntryView {
  record: RepairRecord
  state: RepairState
  changedAt?: number
  busy?: RepairBusy
}

interface RepairTimelineProps {
  entries: RepairEntryView[]
  /** Relative-time anchor for the preview data. */
  now: number
  /** The real clock, for "rolled back just now" labels. */
  clock: number
  highlight: { id: string; nonce: number } | null
  onRollback: (record: RepairRecord) => void
  onRestore: (record: RepairRecord) => void
  onOpenSession: (sessionId: string) => void
}

/** Nearest scrolling ancestor -- the window unless the shell scrolls a pane. */
function scrollParentOf(el: HTMLElement | null): HTMLElement {
  let node = el?.parentElement ?? null
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node
    node = node.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

function RepairItem({
  entry,
  now,
  clock,
  highlightNonce,
  onRollback,
  onRestore,
  onOpenSession,
}: {
  entry: RepairEntryView
  now: number
  clock: number
  highlightNonce?: number
  onRollback: (record: RepairRecord) => void
  onRestore: (record: RepairRecord) => void
  onOpenSession: (sessionId: string) => void
}) {
  const { record, state, busy } = entry
  const locked = !record.canRollback
  const rolledBack = state === "rolled_back"
  const nodeKey = busy ?? (locked ? "locked" : state)
  const glow = locked ? "var(--muted-foreground)" : rolledBack ? "var(--warning)" : "var(--success)"

  const badge = busy ? (
    <StatusBadge tone="pending">{busy === "rolling_back" ? "Rolling back…" : "Re-applying…"}</StatusBadge>
  ) : rolledBack ? (
    <StatusBadge tone="warning">
      Rolled back{entry.changedAt ? ` · ${formatRelative(entry.changedAt, Math.max(clock, entry.changedAt))}` : ""}
    </StatusBadge>
  ) : locked ? (
    <StatusBadge tone="neutral">Locked</StatusBadge>
  ) : (
    <StatusBadge tone="success">Applied</StatusBadge>
  )

  let action
  if (busy) {
    action = (
      <Button size="sm" variant="outline" disabled>
        <LoaderCircle className="animate-spin" />
        {busy === "rolling_back" ? "Rolling back…" : "Re-applying…"}
      </Button>
    )
  } else if (locked) {
    action = (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              aria-label={`Rollback unavailable. ${record.lockedReason ?? ""}`}
              className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          }
        >
          <Button size="sm" variant="outline" disabled>
            <Lock /> Rollback
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{record.lockedReason ?? "This fix can't be rolled back."}</TooltipContent>
      </Tooltip>
    )
  } else if (rolledBack) {
    action = (
      <Button size="sm" onClick={() => onRestore(record)}>
        <RotateCw /> Restore this fix
      </Button>
    )
  } else {
    action = (
      <Button size="sm" variant="outline" onClick={() => onRollback(record)}>
        <RotateCcw /> Rollback
      </Button>
    )
  }

  const NodeIcon = busy ? LoaderCircle : locked ? Lock : rolledBack ? Undo2 : Check

  return (
    <motion.li
      id={`repair-${record.id}`}
      layout="position"
      initial={{ opacity: 0, x: 22 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      className="relative scroll-mt-24 pl-11"
    >
      <motion.span
        aria-hidden
        className={cn(
          "absolute top-4 left-[6px] z-10 flex size-[22px] items-center justify-center rounded-full ring-4 ring-background transition-colors duration-300",
          busy
            ? "bg-primary text-primary-foreground"
            : locked
              ? "bg-muted text-muted-foreground"
              : rolledBack
                ? "bg-warning text-warning-foreground"
                : "bg-success text-success-foreground",
        )}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.9 }}
        transition={SPRING_BOUNCY}
      >
        <motion.span
          key={nodeKey}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={SPRING_BOUNCY}
          className="flex"
        >
          <NodeIcon className={cn("size-3", busy && "animate-spin")} strokeWidth={3} />
        </motion.span>
      </motion.span>

      <SpotlightCard glow={glow} className={cn("p-4 transition-shadow duration-300", highlightNonce && "ring-2 ring-primary/45")}>
        {highlightNonce && (
          <motion.span
            key={highlightNonce}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 1, 0] }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
        )}
        {busy && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
            <span className="animate-shimmer-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </span>
        )}
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
              <LanguageDot language={record.language} />
              <Link to={`/projects/${record.projectId}`} className="font-medium text-foreground hover:underline">
                {record.projectName}
              </Link>
              <span className="text-muted-foreground" title={formatFull(record.at)}>
                {formatDateTime(record.at)} · {formatRelative(record.at, now)}
              </span>
              {badge}
            </div>
            <p
              className={cn(
                "text-sm leading-snug text-foreground transition-colors",
                rolledBack && "text-muted-foreground line-through decoration-muted-foreground/40",
              )}
            >
              {record.summary}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {record.files.map((file) => (
                <span key={file.path} className="inline-flex items-center gap-1 font-mono">
                  <FileCode className="size-3" />
                  {file.path}
                  <span className="text-success">+{file.added}</span>
                  <span className="text-destructive">−{file.removed}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1">
                <FlaskConical className="size-3" />
                {record.tests.passed}/{record.tests.total} tests passed
              </span>
              <button
                type="button"
                onClick={() => onOpenSession(record.sessionId)}
                className="inline-flex items-center gap-0.5 rounded font-mono text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {record.sessionId}
                <ArrowUpRight className="size-3" />
              </button>
            </div>
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      </SpotlightCard>
    </motion.li>
  )
}

/**
 * Vertical repair log. The glowing spine draws in as the list scrolls into
 * view (and completes when the page can scroll no further); nodes pop in.
 */
export function RepairTimeline({ entries, now, clock, highlight, onRollback, onRestore, onOpenSession }: RepairTimelineProps) {
  const { reduced } = useMotionPreference()
  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  // Declared before useScroll so the container ref is resolved when it attaches.
  useLayoutEffect(() => {
    containerRef.current = scrollParentOf(wrapRef.current)
  }, [])

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    container: containerRef,
    offset: ["start 85%", "end 70%"],
    trackContentSize: true,
  })
  const { scrollYProgress: pageProgress } = useScroll({ container: containerRef, trackContentSize: true })
  const reach = useTransform(() => (pageProgress.get() > 0.985 ? 1 : scrollYProgress.get()))
  const scaleY = useSpring(reach, { stiffness: 120, damping: 26, restDelta: 0.001 })

  const groups = useMemo(() => {
    const out: { key: number; label: string; entries: RepairEntryView[] }[] = []
    for (const entry of entries) {
      const key = dayKey(entry.record.at)
      const last = out[out.length - 1]
      if (last && last.key === key) last.entries.push(entry)
      else out.push({ key, label: formatDayLabel(entry.record.at, now), entries: [entry] })
    }
    return out
  }, [entries, now])

  return (
    <div ref={wrapRef} className="relative">
      <div aria-hidden className="absolute top-3 bottom-3 left-[16px] w-px bg-border" />
      <motion.div
        aria-hidden
        style={{ scaleY: reduced ? 1 : scaleY }}
        className="absolute top-3 bottom-3 left-[15px] w-[3px] origin-top rounded-full bg-gradient-to-b from-primary via-info to-success shadow-[0_0_14px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
      />
      <ol className="relative space-y-6">
        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <motion.li
              key={group.key}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <div className="relative mb-3 flex h-5 items-center pl-11">
                <span aria-hidden className="absolute left-[12px] size-2.5 rounded-full border-2 border-background bg-muted-foreground/50" />
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{group.label}</span>
              </div>
              <ol className="space-y-3">
                <AnimatePresence initial={false}>
                  {group.entries.map((entry) => (
                    <RepairItem
                      key={entry.record.id}
                      entry={entry}
                      now={now}
                      clock={clock}
                      highlightNonce={highlight?.id === entry.record.id ? highlight.nonce : undefined}
                      onRollback={onRollback}
                      onRestore={onRestore}
                      onOpenSession={onOpenSession}
                    />
                  ))}
                </AnimatePresence>
              </ol>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}
