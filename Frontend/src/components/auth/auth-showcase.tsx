import {
  Activity,
  Building2,
  Check,
  DatabaseZap,
  FlaskConical,
  MousePointerClick,
  ScanSearch,
  WandSparkles,
  type LucideIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { HealedFeed } from "@/components/auth/healed-feed"
import { useHealLoop } from "@/components/auth/use-heal-loop"
import { NeuralField } from "@/components/fx/neural-field"
import { useMotionPreference } from "@/components/motion-preference"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

// The four stages the backend streams as live telemetry.
const STAGES: { label: string; icon: LucideIcon }[] = [
  { label: "Retrieve", icon: DatabaseZap },
  { label: "Analyze", icon: ScanSearch },
  { label: "Generate", icon: WandSparkles },
  { label: "Test", icon: FlaskConical },
]

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanSearch,
    title: "Root cause, not guesswork",
    body: "Traced from your stack trace and code, explained in plain English.",
  },
  {
    icon: FlaskConical,
    title: "Tested before it reaches you",
    body: "Every candidate patch runs against your test suite first.",
  },
  {
    icon: Building2,
    title: "Your team's workspace, automatically",
    body: "Your company login routes you in. Nothing to pick or configure.",
  },
]

function PipelineRow({ stage }: { stage: number }) {
  return (
    <ol aria-label="Healing pipeline" className="flex flex-wrap items-center gap-1.5">
      {STAGES.map(({ label, icon: Icon }, i) => {
        const state = i < stage ? "done" : i === stage ? "active" : "pending"
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "relative inline-flex h-6 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-[11px] font-medium transition-[color,background-color,border-color,box-shadow] duration-300",
                state === "done" && "border-success/30 bg-success/10 text-success",
                state === "active" && "border-primary/45 bg-primary/12 text-primary shadow-[0_0_18px_-4px_var(--primary)]",
                state === "pending" && "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {state === "done" ? <Check aria-hidden className="size-3" strokeWidth={3} /> : <Icon aria-hidden className="size-3" />}
              {label}
              <span className="sr-only">{state === "done" ? "(complete)" : state === "active" ? "(running)" : "(queued)"}</span>
              {state === "active" && (
                // Progress underline for the running stage.
                <motion.span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px origin-left bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.64, ease: "linear" }}
                />
              )}
            </span>
            {i < STAGES.length - 1 && (
              <span
                aria-hidden
                className={cn("h-px w-3 transition-colors duration-300", i < stage ? "bg-success/60" : "bg-border")}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Right-hand panel on auth screens (lg+): the neural "self-healing" mesh,
 * the core promise, three value points and a live-looking pipeline + heal feed.
 */
export function AuthShowcase({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false)
  const { stage, events, now } = useHealLoop(paused)
  const { reduced } = useMotionPreference()

  return (
    <aside
      aria-label="What Self-Healing AI Debugger does"
      className={cn("glass relative isolate flex flex-col overflow-hidden rounded-2xl border border-border p-8 xl:p-10", className)}
    >
      <NeuralField density={0.8} />
      {/* Keep the copy legible over the mesh; let it breathe on the right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,color-mix(in_oklch,var(--card)_78%,transparent)_0%,color-mix(in_oklch,var(--card)_35%,transparent)_45%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Activity aria-hidden className="size-3.5" />
            Live healing pipeline
          </span>
          <h2 className="mt-5 max-w-lg text-3xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground xl:text-[2.5rem]">
            Every fix is <span className="animate-gradient-pan text-gradient-brand">tested</span> before you ever see it.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Paste the broken code and its stack trace. The debugger finds the root cause, writes a patch and proves it
            against your tests, streaming every step as it goes.
          </p>
        </motion.div>

        <ul className="mt-7 space-y-3.5">
          {POINTS.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.3 + i * 0.08 }}
              className="flex items-start gap-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-info/15 text-primary ring-1 ring-primary/25">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="block text-[13px] text-muted-foreground">{body}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.55 }}
          className="mt-auto space-y-3 pt-9"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setPaused(true)
          }}
          onPointerLeave={() => setPaused(false)}
        >
          <PipelineRow stage={stage} />
          <HealedFeed events={events} now={now} paused={paused && !reduced} />
          {!reduced && (
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80">
              <MousePointerClick aria-hidden className="size-3" />
              Click anywhere on the mesh to send a healing wave.
            </p>
          )}
        </motion.div>
      </div>
    </aside>
  )
}
