import { ArrowUpRight, CalendarCheck, Check, FolderKanban, Lightbulb, Repeat, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router-dom"

import { ProgressRing } from "@/components/app/progress-ring"
import { DiffViewer } from "@/components/code/diff-viewer"
import { GlowButton } from "@/components/fx/glow-button"
import { NumberTicker } from "@/components/fx/number-ticker"
import { formatIsoDay } from "@/components/history/format"
import { InlineCode } from "@/components/memory/inline-code"
import { LanguageLabel } from "@/components/projects/language-chip"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetTitle } from "@/components/ui/sheet"
import { EASE_OUT } from "@/lib/motion"
import type { MemoryRecord } from "@/services/mock/memory"

const section = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.08 + i * 0.07, ease: EASE_OUT },
})

function CaseBody({ record, onReuse }: { record: MemoryRecord; onReuse: (record: MemoryRecord) => void }) {
  return (
    <>
      <div className="relative overflow-hidden border-b border-border px-5 pt-5 pb-4">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-12 size-64 rounded-full bg-info/20 blur-3xl" />
        <div className="relative flex items-start gap-4 pr-8">
          <ProgressRing value={record.similarity} size={64} stroke={5} tone="info" animateOnView={false}>
            <span className="text-base font-semibold text-foreground">
              <NumberTicker value={record.similarity} suffix="%" startOnView={false} className="normal-nums" />
            </span>
          </ProgressRing>
          <div className="min-w-0 space-y-1.5">
            <SheetTitle className="text-base leading-snug">{record.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <LanguageLabel language={record.language} />
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/85">{record.errorType}</code>
              <Link to={`/projects/${record.projectId}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                <FolderKanban className="size-3" />
                {record.projectName}
              </Link>
            </SheetDescription>
            <p className="text-[11px] text-muted-foreground">
              {record.similarity}% match with its latest recall ·{" "}
              <span className="font-mono">{record.sessionId}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <motion.section {...section(0)} className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <Lightbulb className="size-3.5 text-warning" /> Root cause
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90">
            <InlineCode text={record.rootCause} />
          </p>
          {record.context && <p className="text-xs text-muted-foreground">When it happens: {record.context}.</p>}
        </motion.section>

        <motion.section {...section(1)} className="space-y-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Why it matched</h3>
          <ul className="flex flex-wrap gap-1.5">
            {record.signals.map((signal) => (
              <li
                key={signal}
                className="inline-flex items-center gap-1.5 rounded-full border border-info/25 bg-info/8 px-2.5 py-1 text-xs text-foreground"
              >
                <Check className="size-3 text-info" strokeWidth={3} />
                {signal}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section {...section(2)} className="space-y-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">The fix it remembers</h3>
          <DiffViewer
            original={record.before}
            updated={record.after}
            language={record.language}
            filename={record.file}
            mode="unified"
            animate
            maxHeight={340}
          />
          <p className="text-sm text-foreground">{record.fixSummary}</p>
        </motion.section>

        <motion.dl {...section(3)} className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarCheck className="size-3" /> Resolved
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{formatIsoDay(record.resolvedAt)}</dd>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Repeat className="size-3" /> Recalled
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground tabular-nums">
              {record.recalls} time{record.recalls === 1 ? "" : "s"}
            </dd>
          </div>
        </motion.dl>
      </div>

      <SheetFooter className="mt-0 flex-row flex-wrap gap-2 border-t border-border p-4">
        <GlowButton onClick={() => onReuse(record)}>
          <Sparkles /> Reuse in debugger
        </GlowButton>
        <Button variant="outline" render={<Link to={`/history?session=${record.sessionId}`} />}>
          Open session <ArrowUpRight />
        </Button>
      </SheetFooter>
    </>
  )
}

interface MemoryCaseSheetProps {
  record: MemoryRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReuse: (record: MemoryRecord) => void
}

/** Side panel for one remembered case: root cause, signals and the diff. */
export function MemoryCaseSheet({ record, open, onOpenChange, onReuse }: MemoryCaseSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {record && <CaseBody key={record.id} record={record} onReuse={onReuse} />}
      </SheetContent>
    </Sheet>
  )
}
