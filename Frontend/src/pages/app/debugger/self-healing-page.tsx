import { Bug, Check, Copy, HeartPulse, Lightbulb, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Shimmer } from "@/components/app/page-skeleton"
import { Panel } from "@/components/app/panel"
import { DiffViewer } from "@/components/code/diff-viewer"
import { EmptyState } from "@/components/empty-state"
import { HeartbeatLine } from "@/components/fx/heartbeat-line"
import { ChatPanel } from "@/components/healing/chat-panel"
import { TelemetryTracker } from "@/components/healing/telemetry-tracker"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { celebrate } from "@/lib/confetti"
import { diffStats, computeDiffRows } from "@/lib/diff"
import { matchExample } from "@/lib/examples"
import { LANGUAGE_COLORS, LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"
import { parseStackTrace } from "@/lib/stack-trace"
import { cn } from "@/lib/utils"
import { HEAL_MODE } from "@/services/heal-api"

// Confetti once per healed session, not on every revisit.
const celebrated = new Set<string>()

const STAGES = [
  { key: "retrieval", label: "Retrieval", color: "var(--primary)" },
  { key: "analysis", label: "Analysis", color: "var(--info)" },
  { key: "generation", label: "Generation", color: "var(--warning)" },
  { key: "testing", label: "Testing", color: "var(--success)" },
] as const

function SuccessCheck() {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center">
      <span className="animate-ping-soft absolute inset-1 rounded-full bg-success/25" />
      <svg viewBox="0 0 52 52" className="relative size-14" aria-hidden>
        <motion.circle
          cx="26"
          cy="26"
          r="23"
          fill="color-mix(in oklch, var(--success) 14%, transparent)"
          stroke="var(--success)"
          strokeWidth="2.5"
          initial={{ pathLength: 0, rotate: -90 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          style={{ originX: "50%", originY: "50%" }}
        />
        <motion.path
          d="M16 27 l7 7 l14 -15"
          fill="none"
          stroke="var(--success)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.45, ease: EASE_OUT }}
        />
      </svg>
    </span>
  )
}

function ModeBadge() {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        HEAL_MODE === "live" ? "bg-success/12 text-success" : "border border-border bg-muted/60 text-muted-foreground",
      )}
      title={HEAL_MODE === "live" ? "Results come from the healing backend" : "No backend configured — results come from the built-in simulation"}
    >
      {HEAL_MODE === "live" ? "Live backend" : "Simulated engine"}
    </span>
  )
}

export default function SelfHealingPage() {
  const {
    status,
    statusEvents,
    startedAt,
    finishedAt,
    result,
    request,
    errorMessage,
    completed,
    retry,
    cancel,
    reset,
    loadExample,
  } = useDebugWorkspace()
  const navigate = useNavigate()
  const bannerRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState(false)

  useEffect(() => {
    if (status !== "complete" || !result || celebrated.has(result.session_id)) return
    celebrated.add(result.session_id)
    const t = setTimeout(() => celebrate(bannerRef.current), 450)
    return () => clearTimeout(t)
  }, [status, result])

  const lang = toLanguageKey(request?.language)
  const example = useMemo(() => (request ? matchExample(request.source_code) : undefined), [request])
  const stats = useMemo(
    () => (result ? diffStats(computeDiffRows(result.original_code, result.fixed_code, lang)) : { added: 0, removed: 0 }),
    [result, lang],
  )
  const errorSummary = useMemo(() => {
    if (!request) return ""
    const p = parseStackTrace(request.error_trace)
    return p.errorType ? `${p.errorType}${p.message ? `: ${p.message}` : ""}` : request.error_trace.split("\n")[0]
  }, [request])

  const header = (
    <PageHeader
      icon={HeartPulse}
      tone={status === "error" ? "danger" : status === "complete" ? "success" : "info"}
      title="Self Healing"
      badge={<ModeBadge />}
      description="The fix, why it works, and a chat that remembers this session."
      actions={
        status === "complete" ? (
          <>
            <Button variant="outline" className="glass" onClick={retry}>
              <RotateCcw /> Try again
            </Button>
            <Button
              variant="outline"
              className="glass"
              onClick={() => {
                reset()
                navigate("/debugger")
              }}
            >
              <Plus /> New session
            </Button>
          </>
        ) : undefined
      }
    />
  )

  // --- Idle -----------------------------------------------------------------
  if (status === "idle") {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={HeartPulse}
          title="No active healing session"
          description="Run a debug session from the AI Debugger — the healed diff, the explanation and the follow-up chat land here."
          actionLabel="Go to AI Debugger"
          onAction={() => navigate("/debugger")}
          secondaryLabel="Heal an example"
          onSecondary={() => {
            loadExample("js-checkout")
            navigate("/debugger")
          }}
        >
          <HeartbeatLine className="h-16 max-w-md opacity-70" />
        </EmptyState>
        {completed.length > 0 && (
          <Panel title="Heals this session" icon={Sparkles}>
            <ul className="space-y-2">
              {completed.map((c) => (
                <li key={c.sessionId} className="flex items-center gap-3 text-sm">
                  <span className={cn("size-2 rounded-full", c.outcome === "resolved" ? "bg-success" : "bg-destructive")} />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90">{c.errorSummary}</span>
                  <span className="text-xs text-muted-foreground">{(c.durationMs / 1000).toFixed(1)}s</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    )
  }

  // --- Analyzing -------------------------------------------------------------
  if (status === "analyzing") {
    return (
      <div className="space-y-6">
        {header}
        <TelemetryTracker events={statusEvents} status={status} startedAt={startedAt} finishedAt={finishedAt} onCancel={cancel} />
        <div className="glass relative space-y-3 overflow-hidden rounded-xl border border-border p-4" aria-hidden>
          <p className="text-xs font-medium text-muted-foreground">Your diff will appear here</p>
          {Array.from({ length: 7 }, (_, i) => (
            <Shimmer key={i} className={cn("h-4", ["w-3/4", "w-1/2", "w-5/6", "w-2/3", "w-3/5", "w-4/5", "w-1/3"][i])} />
          ))}
        </div>
      </div>
    )
  }

  // --- Error -----------------------------------------------------------------
  if (status === "error") {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <TelemetryTracker
            events={statusEvents}
            status={status}
            startedAt={startedAt}
            finishedAt={finishedAt}
            errorMessage={errorMessage}
            onRetry={retry}
            onEdit={() => {
              cancel()
              navigate("/debugger")
            }}
          />
          <Panel title="What usually helps" icon={Lightbulb}>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> Paste the <span className="text-foreground">full</span> stack trace, not
                just the last line.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> Include the whole failing function and the helpers it calls.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> Describe when it fails in the context field (“only without a coupon”).
              </li>
            </ul>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => {
                cancel()
                navigate("/debugger")
              }}
            >
              <Pencil /> Edit and retry
            </Button>
          </Panel>
        </div>
      </div>
    )
  }

  if (!result) return null

  // --- Complete ----------------------------------------------------------------
  const seconds = ((finishedAt ?? 0) - (startedAt ?? 0)) / 1000
  const stageDurations = STAGES.map((s, i) => {
    const ev = statusEvents.find((e) => e.step === s.key)
    const next = statusEvents.find((e) => STAGES.findIndex((x) => x.key === e.step) > i)
    const end = next?.at ?? finishedAt
    return ev && end ? (end - ev.at) / 1000 : null
  })
  const filename = example?.file ?? `fixed.${LANGUAGE_EXTENSIONS[lang]}`

  return (
    <div className="space-y-6">
      {header}

      <motion.div
        ref={bannerRef}
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="glass relative overflow-hidden rounded-2xl border border-success/30 p-5 shadow-[0_20px_60px_-30px_var(--success)]"
      >
        <HeartbeatLine className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-25" />
        <div className="relative flex flex-wrap items-center gap-4">
          <SuccessCheck />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">Healed in {seconds.toFixed(1)}s</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <Bug className="size-3.5 shrink-0 text-destructive" />
                <span className="truncate font-mono text-xs">{errorSummary}</span>
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 py-1">
              <span className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
              {LANGUAGE_LABELS[lang]}
            </span>
            <span className="rounded-full border border-border bg-background/50 px-2.5 py-1 font-mono">
              <span className="text-success">+{stats.added}</span> <span className="text-destructive">−{stats.removed}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(result.session_id)
                setCopiedId(true)
                setTimeout(() => setCopiedId(false), 1500)
              }}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 py-1 font-mono transition-colors hover:border-primary/40"
              title="Copy session id"
            >
              {copiedId ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
              {result.session_id}
            </button>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="size-3" />
              </span>
              <span className="text-xs text-foreground">{s.label}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {stageDurations[i] !== null ? `${stageDurations[i]!.toFixed(1)}s` : "—"}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-6">
          <DiffViewer
            original={result.original_code}
            updated={result.fixed_code}
            language={lang}
            filename={filename}
            animate
            onCopy={() => toast.success("Fixed code copied")}
            onDownload={() => toast.success(`Downloaded ${filename.split("/").pop()}`)}
          />
          <Panel title="Root cause & fix" icon={Lightbulb} description="From the heal's explanation">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Markdown content={result.explanation} />
            </motion.div>
          </Panel>
        </div>
        <ChatPanel className="h-[560px] xl:sticky xl:top-20 xl:h-[calc(100svh-7rem)]" />
      </div>
    </div>
  )
}
