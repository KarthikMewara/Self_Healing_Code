import { Check, LoaderCircle, Radar, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { blipPosition, SCAN_STEPS } from "@/services/mock/security"
import type { Severity } from "@/types/domain"

import { SEVERITY } from "./severity"

export interface RadarBlip {
  id: string
  severity: Severity
  project: string
}

interface RadarScanOverlayProps {
  /** 0..100 */
  progress: number
  blips: RadarBlip[]
  onCancel: () => void
}

const STEP_SPAN = 100 / SCAN_STEPS.length

/**
 * Full-coverage overlay shown while a (simulated) re-scan runs: a rotating
 * conic sweep over range rings, blips for every finding as its project is
 * reached, and a per-project checklist. Esc cancels.
 */
export function RadarScanOverlay({ progress, blips, onCancel }: RadarScanOverlayProps) {
  const current = Math.min(SCAN_STEPS.length - 1, Math.floor(progress / STEP_SPAN))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="glass-strong absolute inset-0 z-20 overflow-hidden rounded-2xl border border-primary/25"
      role="dialog"
      aria-label="Security re-scan in progress"
    >
      <div
        aria-hidden
        className="bg-line-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <div className="sticky top-20 flex flex-col items-center gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-center sm:gap-12">
        <RadarScope progress={progress} blips={blips} />

        <div className="w-full max-w-xs space-y-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Radar className="size-4 text-primary" /> Scanning {SCAN_STEPS.length} projects
            </p>
            <p className="text-xs text-muted-foreground">Static analysis · secrets · dependency advisories</p>
          </div>

          <ol className="space-y-1.5">
            {SCAN_STEPS.map((step, i) => {
              const done = progress >= (i + 1) * STEP_SPAN
              const active = !done && i === current
              return (
                <li key={step.project} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {done ? (
                      <Check className="size-4 text-success" />
                    ) : active ? (
                      <LoaderCircle className="size-3.5 animate-spin text-primary" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                  <span className={cn("font-mono text-xs", done || active ? "text-foreground" : "text-muted-foreground")}>
                    {step.project}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-auto truncate text-[11px] text-muted-foreground"
                      role="status"
                    >
                      {step.detail}
                    </motion.span>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="space-y-1.5">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-info transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">{Math.round(progress)}% complete</span>
              <Button size="xs" variant="ghost" onClick={onCancel}>
                <X /> Cancel <span className="hidden text-muted-foreground sm:inline">(Esc)</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function RadarScope({ progress, blips }: { progress: number; blips: RadarBlip[] }) {
  return (
    <div className="relative size-52 shrink-0 sm:size-60" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-primary/35 bg-[radial-gradient(circle,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_72%)] shadow-[0_0_70px_-18px_var(--primary)]" />
      {[0.34, 0.67].map((r) => (
        <div key={r} className="absolute rounded-full border border-primary/18" style={{ inset: `${(1 - r) * 50}%` }} />
      ))}
      <div className="absolute inset-x-4 top-1/2 h-px bg-primary/18" />
      <div className="absolute inset-y-4 left-1/2 w-px bg-primary/18" />

      {/* The sweep: a conic wedge whose bright leading edge rotates clockwise. */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg 250deg, color-mix(in oklch, var(--primary) 6%, transparent) 290deg, color-mix(in oklch, var(--primary) 42%, transparent) 356deg, var(--primary) 360deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
      />

      {blips.map((blip) => {
        const step = SCAN_STEPS.findIndex((s) => s.project === blip.project)
        const visible = progress >= (step + 0.6) * STEP_SPAN
        const { angle, radius } = blipPosition(blip.id)
        const rad = (angle * Math.PI) / 180
        const color = SEVERITY[blip.severity].color
        return (
          <AnimatePresence key={blip.id}>
            {visible && (
              <motion.span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${50 + Math.sin(rad) * radius * 46}%`,
                  top: `${50 - Math.cos(rad) * radius * 46}%`,
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING_BOUNCY}
              >
                <span className="animate-ping-soft absolute inset-0 rounded-full" style={{ background: color }} />
              </motion.span>
            )}
          </AnimatePresence>
        )
      })}

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full border border-primary/25 bg-background/75 px-2.5 py-0.5 font-mono text-lg font-semibold text-foreground tabular-nums backdrop-blur">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}
