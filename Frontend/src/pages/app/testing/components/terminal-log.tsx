import { motion } from "motion/react"
import { useEffect, useRef } from "react"

import { LiveIndicator } from "@/components/insights/live-indicator"
import { cn } from "@/lib/utils"
import type { LogLine, LogTone } from "@/services/mock/testing"

const TONE: Record<LogTone, string> = {
  cmd: "font-medium text-foreground",
  muted: "text-muted-foreground",
  pass: "text-success",
  fail: "text-destructive",
  info: "text-primary",
  plain: "text-foreground/85",
  warn: "text-warning",
}

interface TerminalLogProps {
  title: string
  lines: LogLine[]
  running: boolean
  className?: string
}

/** Monospace runner output that follows the tail unless you scroll up to read. */
export function TerminalLog({ title, lines, running, className }: TerminalLogProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const followTail = useRef(true)

  useEffect(() => {
    const el = scroller.current
    if (el && followTail.current) el.scrollTop = el.scrollHeight
  }, [lines.length])

  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card/80", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-destructive/55" />
          <span className="size-2.5 rounded-full bg-warning/55" />
          <span className="size-2.5 rounded-full bg-success/55" />
        </span>
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{title}</span>
        {running && <LiveIndicator label="Running" tone="primary" className="ml-auto" />}
      </div>
      <div
        ref={scroller}
        role="log"
        aria-label="Runner output"
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget
          followTail.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28
        }}
        className="scrollbar-thin h-72 overflow-auto p-3 font-mono text-[11.5px] leading-[1.65] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset [font-variant-ligatures:none]"
      >
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className={cn("whitespace-pre", TONE[line.tone ?? "plain"])}
          >
            {line.text || " "}
          </motion.div>
        ))}
        {running && <span aria-hidden className="animate-caret inline-block h-3.5 w-2 translate-y-0.5 bg-foreground/60" />}
      </div>
    </div>
  )
}
