import { AlertTriangle, Check, CheckCircle2, Clock, GripVertical, X } from "lucide-react"
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { Reveal } from "@/components/fx/reveal"
import { SectionHeading } from "@/components/marketing/section-heading"
import { useMotionPreference } from "@/components/motion-preference"
import { cn } from "@/lib/utils"

const TABS = [
  "stackoverflow.com — TypeError: Cannot read properties of undefined",
  "github.com/acme/checkout/issues/482",
  "MDN — Optional chaining (?.)",
  "#checkout-incident · Slack",
  "stackoverflow.com — why is my coupon undefined",
]

const LOGS = [
  "console.log(cart)",
  "console.log('HERE 1')",
  "console.log(cart.coupon) // undefined??",
  "console.log('HERE 2', typeof cart.coupon)",
  "// TODO remove before merge",
  "console.log('why')",
]

const WITHOUT = [
  "Hours lost context-switching between the error, the code and search results",
  "Shipping a fix without really knowing whether it holds up",
  "No record of why past bugs happened or how they got fixed",
]
const WITH = [
  "Root cause explained in plain English before you touch anything",
  "Every fix run against your test suite before it reaches you",
  "Every case remembered — faster on patterns it has seen before",
]

function Stopwatch({ running }: { running: boolean }) {
  const [s, setS] = useState(8046)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setS((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return (
    <span className="font-mono tabular-nums">
      {hh}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
    </span>
  )
}

function WithoutScene({ running }: { running: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[color-mix(in_oklch,var(--destructive)_7%,var(--card))] p-5 md:p-8">
      <div className="bg-dot-grid absolute inset-0 opacity-40" />
      <div className="relative flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
            <X className="size-3.5" /> Without
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background/60 px-2.5 py-1 text-sm text-destructive">
            <Clock className="size-3.5" /> <Stopwatch running={running} />
          </span>
        </div>
        <div className="relative h-32 md:h-36">
          {TABS.map((t, i) => (
            <div
              key={t}
              className="absolute left-0 w-[88%] truncate rounded-lg border border-border bg-background/85 px-3 py-2 text-[11px] text-muted-foreground shadow-lg md:w-[70%]"
              style={{ top: i * 22, left: `${i * 4}%`, transform: `rotate(${(i % 2 ? 1 : -1) * (1 + i * 0.6)}deg)` }}
            >
              {t}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-background/70 p-3 font-mono text-[11px] leading-relaxed">
          {LOGS.map((l) => (
            <p key={l} className="truncate text-warning/90">
              {l}
            </p>
          ))}
          <p className="text-destructive">TypeError: Cannot read properties of undefined (reading 'percentOff')</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-warning">
          <AlertTriangle className="size-3.5" /> Hotfix merged with no tests. Fingers crossed.
        </div>
      </div>
    </div>
  )
}

function WithScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[color-mix(in_oklch,var(--success)_7%,var(--card))] p-5 md:p-8">
      <div className="bg-line-grid absolute inset-0 opacity-40" />
      <div className="relative flex h-full flex-col items-end gap-4">
        <div className="flex w-full items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-background/60 px-2.5 py-1 text-sm text-success">
            <Clock className="size-3.5" /> <span className="font-mono">0:00:02.4</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
            <Check className="size-3.5" /> With Self-Healing AI Debugger
          </span>
        </div>
        <div className="w-full max-w-md space-y-3 md:w-[62%]">
          <div className="overflow-hidden rounded-lg border border-border bg-background/80 font-mono text-[11px] leading-[1.9]">
            <p className="bg-destructive/10 px-3 text-muted-foreground line-through decoration-destructive/50">
              − const rate = cart.coupon.percentOff / 100
            </p>
            <p className="bg-success/12 px-3 text-foreground">+ const rate = (cart.coupon?.percentOff ?? 0) / 100</p>
          </div>
          <div className="rounded-lg border border-border bg-background/80 p-3 text-xs text-foreground/90">
            <p className="mb-1 text-[10px] font-semibold tracking-wide text-info uppercase">Root cause</p>
            <p>
              <span className="font-mono">cart.coupon</span> is undefined when a customer checks out without a coupon.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> 6/6 tests passed
            </span>
            <span className="font-mono text-muted-foreground">patch verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CompareSlider() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const hinted = useRef(false)
  const pos = useMotionValue(50)
  const clip = useTransform(pos, (p) => `inset(0 ${100 - p}% 0 0)`)
  const left = useTransform(pos, (p) => `${p}%`)
  const [value, setValue] = useState(50)
  const dragging = useRef(false)
  const { reduced } = useMotionPreference()

  useEffect(() => pos.on("change", (v) => setValue(Math.round(v))), [pos])

  // A one-time wiggle so people notice it's draggable.
  useEffect(() => {
    if (!inView || hinted.current || reduced) return
    hinted.current = true
    const controls = animate(pos, [50, 64, 36, 50], { duration: 1.8, ease: "easeInOut", delay: 0.4 })
    return () => controls.stop()
  }, [inView, pos, reduced])

  const setFromClientX = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    pos.set(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <section id="compare" className="relative mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <SectionHeading
        eyebrow="Before & after"
        title="Debugging, before and after"
        description="Drag the handle. Same bug, same afternoon — very different outcomes."
      />
      <Reveal>
        <div
          ref={ref}
          className="relative h-[460px] cursor-ew-resize touch-pan-y overflow-hidden rounded-2xl border border-border shadow-2xl select-none md:h-[420px]"
          onPointerDown={(e) => {
            dragging.current = true
            ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
            setFromClientX(e.clientX)
          }}
          onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <WithScene />
          <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
            <WithoutScene running={inView} />
          </motion.div>
          <motion.div className="absolute inset-y-0 z-10 -translate-x-1/2" style={{ left }}>
            <div className="h-full w-0.5 bg-gradient-to-b from-destructive via-info to-success shadow-[0_0_16px_var(--info)]" />
            <button
              type="button"
              role="slider"
              aria-label="Compare without and with"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") pos.set(Math.max(4, pos.get() - 5))
                if (e.key === "ArrowRight") pos.set(Math.min(96, pos.get() + 5))
              }}
              className={cn(
                "glass-strong absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border text-foreground shadow-xl transition-transform hover:scale-110",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              )}
            >
              <GripVertical className="size-4" />
            </button>
          </motion.div>
        </div>
      </Reveal>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Reveal className="space-y-3">
          {WITHOUT.map((t) => (
            <p key={t} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <X className="mt-0.5 size-4 shrink-0 text-destructive/80" /> {t}
            </p>
          ))}
        </Reveal>
        <Reveal delay={0.1} className="space-y-3">
          {WITH.map((t) => (
            <p key={t} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
            </p>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
