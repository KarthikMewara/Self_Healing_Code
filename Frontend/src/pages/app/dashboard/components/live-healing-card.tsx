import {
  ArrowRight,
  Check,
  DatabaseZap,
  FlaskConical,
  HeartPulse,
  Play,
  ScanSearch,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { useNow } from "@/components/insights/hooks"
import { formatMs, formatRelative, formatStopwatch } from "@/components/insights/format"
import { LiveIndicator } from "@/components/insights/live-indicator"
import { Button } from "@/components/ui/button"
import { useDebugWorkspace, type WorkspaceStatus } from "@/context/debug-workspace"
import { useTypewriter } from "@/hooks/use-typewriter"
import { LANGUAGE_COLORS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { HealStep } from "@/types/contract"

const STAGES: { step: HealStep; label: string; icon: LucideIcon }[] = [
  { step: "retrieval", label: "Retrieval", icon: DatabaseZap },
  { step: "analysis", label: "Analysis", icon: ScanSearch },
  { step: "generation", label: "Generation", icon: WandSparkles },
  { step: "testing", label: "Testing", icon: FlaskConical },
]

const PILL: Record<WorkspaceStatus, { label: string; tone: "muted" | "primary" | "success" | "danger"; pulse: boolean }> = {
  idle: { label: "Standby", tone: "muted", pulse: false },
  analyzing: { label: "Healing", tone: "primary", pulse: true },
  complete: { label: "Fix ready", tone: "success", pulse: false },
  error: { label: "Needs review", tone: "danger", pulse: false },
}

// A lingering `filter: blur(0px)` would turn the view into a backdrop root and
// kill the frosted glass of nested panels, so the filter is dropped when done.
const swap = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.35, ease: EASE_OUT },
}

/** The one card on the dashboard wired to the real heal flow (useDebugWorkspace). */
export function LiveHealingCard() {
  const { status } = useDebugWorkspace()
  const pill = PILL[status]

  return (
    <Panel
      title="Live healing"
      description="Your AI Debugger session, in real time"
      icon={HeartPulse}
      action={<LiveIndicator label={pill.label} tone={pill.tone} pulse={pill.pulse} />}
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" && <IdleView key="idle" />}
        {status === "analyzing" && <AnalyzingView key="analyzing" />}
        {status === "complete" && <CompleteView key="complete" />}
        {status === "error" && <ErrorView key="error" />}
      </AnimatePresence>
    </Panel>
  )
}

function IdleView() {
  const { loadExample, completed } = useDebugWorkspace()
  const navigate = useNavigate()
  const now = useNow(30_000, completed.length > 0)
  const last = completed[0]

  const tryExample = () => {
    loadExample("js-checkout")
    navigate("/debugger")
    toast.success("Example loaded into the AI Debugger", {
      description: "“Checkout without a coupon” — run it to watch live telemetry here.",
    })
  }

  return (
    <motion.div {...swap} className="flex flex-1 flex-col justify-between gap-5">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span aria-hidden className="animate-ping-soft absolute inset-0 rounded-xl bg-primary/20" />
          <div className="relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-info/15 ring-1 ring-primary/25">
            <HeartPulse className="size-5 text-primary" />
          </div>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">No heal running</p>
          <p className="text-sm text-muted-foreground">
            Paste a stack trace into the AI Debugger, or run a sample checkout bug end to end.
          </p>
        </div>
      </div>

      <StandbyLine />

      {last && (
        <Link
          to="/history"
          className="group/last -mx-1 flex items-center gap-2.5 rounded-lg px-1 py-1 text-xs transition-colors hover:bg-muted/50"
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              last.outcome === "resolved" ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {last.outcome === "resolved" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-foreground">{last.errorSummary}</span>
            <span className="text-muted-foreground">
              {completed.length} real {completed.length === 1 ? "heal" : "heals"} this session · last{" "}
              {formatRelative(last.finishedAt, now)} in {formatMs(last.durationMs)}
            </span>
          </span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/last:translate-x-0.5" />
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={tryExample}>
          <Play /> Try an example
        </Button>
        <Button variant="ghost" render={<Link to="/debugger" />}>
          Open debugger <ArrowRight />
        </Button>
      </div>
    </motion.div>
  )
}

/** A calm monitor trace with a small blip travelling along it. */
function StandbyLine() {
  const d = "M0 22 H120 L128 14 L136 30 L144 22 H300"
  return (
    <svg viewBox="0 0 300 44" preserveAspectRatio="none" className="h-11 w-full" aria-hidden>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1000}
        strokeDasharray="90 910"
        className="animate-dash"
        style={{ animationDuration: "4.5s", filter: "drop-shadow(0 0 4px var(--primary))" }}
      />
    </svg>
  )
}

function AnalyzingView() {
  const { statusEvents, startedAt, request } = useDebugWorkspace()
  const navigate = useNavigate()
  const now = useNow(100)
  const last = statusEvents[statusEvents.length - 1]
  const current = last ? STAGES.findIndex((s) => s.step === last.step) : 0
  const { text: message } = useTypewriter(last?.message ?? "Connecting to the healer…", { speed: 14, step: 2 })
  const progress = Math.min(100, ((Math.max(0, current) + 0.55) / STAGES.length) * 100)
  const lang = toLanguageKey(request?.language)
  const headline = request?.error_trace.split("\n")[0]?.trim()

  const stageTime = (index: number) => {
    const start = statusEvents.find((e) => e.step === STAGES[index].step)?.at
    if (!start) return null
    const end = statusEvents.find((e) => e.step === STAGES[index + 1]?.step)?.at ?? now
    return end - start
  }

  return (
    <motion.div {...swap} className="flex flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
            {LANGUAGE_LABELS[lang]}
          </p>
          {headline && <p className="mt-1 truncate font-mono text-xs text-foreground">{headline}</p>}
        </div>
        <span className="shrink-0 font-mono text-sm text-foreground tabular-nums" aria-label="Elapsed time">
          {formatStopwatch(startedAt ? now - startedAt : 0)}
        </span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-info"
          initial={{ width: "4%" }}
          animate={{ width: `${progress}%` }}
          transition={SPRING_SOFT}
        />
        <span
          aria-hidden
          className="animate-shimmer-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
      </div>

      <ol className="space-y-1" aria-label="Heal stages">
        {STAGES.map((stage, i) => {
          const done = i < current
          const active = i === current
          const ms = stageTime(i)
          return (
            <li
              key={stage.step}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                active && "bg-primary/8",
              )}
            >
              <span
                className={cn(
                  "relative flex size-6 shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
                  done && "bg-success/12 text-success ring-success/25",
                  active && "bg-primary/15 text-primary ring-primary/30",
                  !done && !active && "text-muted-foreground ring-border",
                )}
              >
                {active && <span aria-hidden className="animate-ping-soft absolute inset-0 rounded-full bg-primary/25" />}
                {done ? <Check className="size-3.5" /> : <stage.icon className="size-3.5" />}
              </span>
              <span className={cn("flex-1", done || active ? "text-foreground" : "text-muted-foreground")}>
                {stage.label}
                <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : " (pending)"}</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {ms != null ? formatMs(ms) : "—"}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="min-h-10 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
        <span className="text-primary">›</span> {message}
        <span aria-hidden className="animate-caret ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-primary/70" />
      </p>

      <Button variant="outline" className="mt-auto w-full" onClick={() => navigate("/debugger")}>
        Watch it live in the debugger <ArrowRight />
      </Button>
    </motion.div>
  )
}

function CompleteView() {
  const { result, completed, startedAt, finishedAt, request } = useDebugWorkspace()
  const latest = completed[0]
  const lang = toLanguageKey(request?.language ?? latest?.language)
  const duration = startedAt && finishedAt ? finishedAt - startedAt : latest?.durationMs

  return (
    <motion.div {...swap} className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <SuccessMark />
        <div className="min-w-0">
          <p className="font-medium text-foreground">Fix ready</p>
          <p className="text-sm text-muted-foreground">Patched, tested and waiting for your review.</p>
        </div>
      </div>

      {latest && (
        <p className="truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
          {latest.errorSummary}
        </p>
      )}

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="min-w-0 rounded-lg bg-muted/40 p-2">
          <dt className="text-muted-foreground">Session</dt>
          <dd className="truncate font-mono text-foreground">{result?.session_id ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <dt className="text-muted-foreground">Language</dt>
          <dd className="text-foreground">{LANGUAGE_LABELS[lang]}</dd>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <dt className="text-muted-foreground">Time to fix</dt>
          <dd className="font-mono text-foreground tabular-nums">{duration ? formatMs(duration) : "—"}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button render={<Link to="/self-healing" />}>
          Review the fix <ArrowRight />
        </Button>
        <Button variant="ghost" render={<Link to="/debugger" />}>
          New session
        </Button>
      </div>
    </motion.div>
  )
}

function ErrorView() {
  const { errorMessage } = useDebugWorkspace()
  return (
    <motion.div {...swap} className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="animate-shake flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive ring-1 ring-destructive/25">
          <X className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">Needs review</p>
          <p className="text-sm text-muted-foreground">The healer couldn't produce a patch that passes the tests.</p>
        </div>
      </div>
      {errorMessage && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 font-mono text-xs text-destructive">
          {errorMessage}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button render={<Link to="/debugger" />}>
          Review in the debugger <ArrowRight />
        </Button>
        <Button variant="ghost" render={<Link to="/history" />}>
          Past sessions
        </Button>
      </div>
    </motion.div>
  )
}

/** Circle + check that draw themselves in. */
function SuccessMark() {
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <span aria-hidden className="absolute inset-0 rounded-full bg-success/12 ring-1 ring-success/25" />
      <svg viewBox="0 0 24 24" className="relative size-6 text-success" aria-hidden>
        <motion.path
          d="M5 12.5l4.2 4.2L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE_OUT }}
        />
      </svg>
    </span>
  )
}
