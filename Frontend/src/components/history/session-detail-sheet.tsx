import { ArrowRight, Brain, CircleX, Copy, FileCode, FolderKanban, HeartPulse, Wrench } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ProgressRing } from "@/components/app/progress-ring"
import { formatDateTime, formatDuration, formatFull, formatRelative } from "@/components/history/format"
import { PipelineStages } from "@/components/history/pipeline-stages"
import { IN_FLIGHT_ID, STATUS_META, type SessionDetailModel } from "@/components/history/session-models"
import { ThisSessionBadge } from "@/components/history/sessions-table"
import { LanguageLabel } from "@/components/projects/language-chip"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetTitle } from "@/components/ui/sheet"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const GLOW: Record<SessionDetailModel["status"], string> = {
  resolved: "bg-success/25",
  failed: "bg-destructive/25",
  in_progress: "bg-primary/25",
}

function Fact({ label, children, tone }: { label: string; children: ReactNode; tone?: "success" | "warning" }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-medium tabular-nums",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {children}
      </dd>
    </div>
  )
}

function SessionBody({ model, onViewRepair }: { model: SessionDetailModel; onViewRepair: (repairId: string) => void }) {
  const navigate = useNavigate()
  const meta = STATUS_META[model.status]
  const inFlight = model.id === IN_FLIGHT_ID
  const tests = model.tests

  return (
    <>
      <div className="relative overflow-hidden border-b border-border px-5 pt-5 pb-4">
        <div aria-hidden className={cn("pointer-events-none absolute -top-28 -right-10 size-64 rounded-full blur-3xl", GLOW[model.status])} />
        <div className="relative flex flex-wrap items-center gap-2 pr-9">
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          {model.live && <ThisSessionBadge />}
          <span className="font-mono text-[11px] text-muted-foreground">{inFlight ? "session id assigned on completion" : model.id}</span>
        </div>
        <SheetTitle className="relative mt-3 font-mono text-[13px] leading-relaxed break-words">{model.errorSummary}</SheetTitle>
        <SheetDescription className="relative mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {model.projectName && model.projectId ? (
            <Link to={`/projects/${model.projectId}`} className="font-medium text-foreground hover:underline">
              {model.projectName}
            </Link>
          ) : (
            <span>Ad-hoc session from the AI Debugger</span>
          )}
          <span aria-hidden>·</span>
          <LanguageLabel language={model.language} />
          <span aria-hidden>·</span>
          <span title={formatFull(model.at)}>{formatRelative(model.at, model.now)}</span>
        </SheetDescription>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label={model.live && model.status !== "in_progress" ? "Finished" : "Started"}>{formatDateTime(model.at)}</Fact>
          <Fact label="Duration">{model.durationSec !== undefined ? formatDuration(model.durationSec) : "—"}</Fact>
          <Fact label="Attempts">{model.attempts ?? "—"}</Fact>
          <Fact label="Tests" tone={tests ? (tests.passed === tests.total ? "success" : "warning") : undefined}>
            {tests ? `${tests.passed}/${tests.total}` : "—"}
          </Fact>
        </dl>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Healing pipeline</h3>
          <PipelineStages stages={model.stages} />
          {model.stagesNote && <p className="text-[11px] text-muted-foreground">{model.stagesNote}</p>}
        </section>

        {model.outcomeNote && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3, ease: EASE_OUT }}
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 p-3"
          >
            <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">{model.outcomeNote}</p>
          </motion.div>
        )}

        {model.fixSummary && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Fix</h3>
            <p className="text-sm text-foreground">{model.fixSummary}</p>
            {model.file && (
              <p className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <FileCode className="size-3.5" />
                {model.file}
              </p>
            )}
          </section>
        )}

        {(model.repair || model.memoryCase) && (
          <section className="grid gap-2 sm:grid-cols-2">
            {model.repair && (
              <button
                type="button"
                onClick={() => onViewRepair(model.repair!.id)}
                className="group rounded-lg border border-border bg-background/40 p-3 text-left transition-colors outline-none hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Wrench className="size-3.5 text-primary" /> Applied as a repair
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-foreground">{model.repair.summary}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                  View in repair history
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            )}
            {model.memoryCase && (
              <Link
                to={`/ai-memory?case=${model.memoryCase.id}`}
                className="group flex gap-3 rounded-lg border border-border bg-background/40 p-3 transition-colors outline-none hover:border-info/40 hover:bg-info/5 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <ProgressRing value={model.memoryCase.similarity} size={34} stroke={3} tone="info">
                  <span className="text-[10px] font-semibold text-foreground tabular-nums">{model.memoryCase.similarity}</span>
                </ProgressRing>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Brain className="size-3.5 text-info" /> In AI Memory
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-foreground">{model.memoryCase.title}</span>
                </span>
              </Link>
            )}
          </section>
        )}
      </div>

      <SheetFooter className="mt-0 flex-row flex-wrap gap-2 border-t border-border p-4">
        {model.selfHealing && (
          <Button onClick={() => navigate("/self-healing")}>
            <HeartPulse /> {model.selfHealing === "live" ? "Watch live in Self Healing" : "Open in Self Healing"}
          </Button>
        )}
        {model.projectId && (
          <Button variant="outline" render={<Link to={`/projects/${model.projectId}`} />}>
            <FolderKanban /> Open project
          </Button>
        )}
        {!inFlight && (
          <Button
            variant="ghost"
            onClick={() => {
              navigator.clipboard?.writeText(model.id).catch(() => undefined)
              toast.success("Session ID copied", { description: model.id })
            }}
          >
            <Copy /> Copy ID
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

interface SessionDetailSheetProps {
  model: SessionDetailModel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewRepair: (repairId: string) => void
}

/** Right-hand panel with a session's summary and its four pipeline stages. */
export function SessionDetailSheet({ model, open, onOpenChange, onViewRepair }: SessionDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {model && <SessionBody key={model.id} model={model} onViewRepair={onViewRepair} />}
      </SheetContent>
    </Sheet>
  )
}
