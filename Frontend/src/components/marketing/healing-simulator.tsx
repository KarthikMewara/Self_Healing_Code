import {
  Check,
  CheckCircle2,
  DatabaseZap,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion, useInView } from "motion/react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { EmphasizedTokens, TokenSpans } from "@/components/code/token-spans"
import { useMotionPreference } from "@/components/motion-preference"
import { useTypewriter } from "@/hooks/use-typewriter"
import { computeDiffRows } from "@/lib/diff"
import { LANDING_EXAMPLES, type CodeExample } from "@/lib/examples"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { highlightTrace } from "@/lib/highlight-trace"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Timeline. The whole demo is driven by one elapsed-time clock so pause /
// resume / replay are trivial and nothing drifts out of sync.
// ---------------------------------------------------------------------------

const PHASES = ["idle", "click", "retrieval", "analysis", "generation", "testing", "healed"] as const
type Phase = (typeof PHASES)[number]
const AT: Record<Phase, number> = {
  idle: 0,
  click: 1500,
  retrieval: 2100,
  analysis: 3600,
  generation: 5100,
  testing: 6500,
  healed: 8300,
}
const HOLD_MS = 4200
const idx = (p: Phase) => PHASES.indexOf(p)

function phaseAt(ms: number): Phase {
  let current: Phase = "idle"
  for (const p of PHASES) if (ms >= AT[p]) current = p
  return current
}

const STEPS: { key: "retrieval" | "analysis" | "generation" | "testing"; label: string; icon: LucideIcon }[] = [
  { key: "retrieval", label: "Retrieving docs", icon: DatabaseZap },
  { key: "analysis", label: "Analyzing", icon: ScanSearch },
  { key: "generation", label: "Generating patch", icon: Wand2 },
  { key: "testing", label: "Testing", icon: FlaskConical },
]

// ---------------------------------------------------------------------------

function StepRow({
  label,
  icon: Icon,
  message,
  state,
}: {
  label: string
  icon: LucideIcon
  message: string
  state: "pending" | "active" | "done"
}) {
  const { text } = useTypewriter(message, { speed: 14, step: 2, start: state === "active" })
  return (
    <li
      className={cn(
        "relative flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-300",
        state === "active" && "bg-info/10 ring-1 ring-info/25",
      )}
    >
      <span
        className={cn(
          "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
          state === "done" && "border-success/40 bg-success/15 text-success",
          state === "active" && "border-info/40 bg-info/15 text-info",
          state === "pending" && "border-border text-muted-foreground/60",
        )}
      >
        {state === "done" ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_BOUNCY}>
            <Check className="size-3" />
          </motion.span>
        ) : state === "active" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Icon className="size-3" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium", state === "pending" ? "text-muted-foreground" : "text-foreground")}>{label}</p>
        {state !== "pending" && (
          <p className="mt-0.5 line-clamp-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            {state === "done" ? message : text}
            {state === "active" && <span className="animate-caret ml-px inline-block h-3 w-[5px] translate-y-0.5 bg-info" />}
          </p>
        )}
      </div>
    </li>
  )
}

function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className={cn("absolute size-1 rounded-full", i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-success" : "bg-info")}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 34, y: Math.sin(angle) * 22, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
        )
      })}
    </span>
  )
}

function CodePane({ example, phase }: { example: CodeExample; phase: Phase }) {
  const rows = useMemo(() => computeDiffRows(example.original, example.fixed, example.language), [example])
  const pi = idx(phase)
  const showAdds = pi >= idx("generation")
  const collapseRemoves = pi >= idx("healed")
  const markBug = pi < idx("generation")
  const analyzing = phase === "analysis"

  return (
    <div className="relative overflow-hidden py-3 font-mono text-[11.5px] leading-[1.8] [font-variant-ligatures:none] sm:text-[12.5px]">
      <div className="scrollbar-thin overflow-x-auto">
        <div className="w-max min-w-full">
          <AnimatePresence initial={false}>
            {rows.map((row, i) => {
              if (row.type === "add" && !showAdds) return null
              if (row.type === "remove" && collapseRemoves) return null
              const isErrorLine = row.type !== "add" && row.oldNo === example.errorLine
              const bugStart = isErrorLine ? row.text.indexOf(example.bugToken) : -1
              const lineNo = showAdds ? (row.newNo ?? "") : row.oldNo
              return (
                <motion.div
                  key={i}
                  initial={row.type === "add" ? { height: 0, opacity: 0 } : false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: row.type === "add" ? 0.15 : 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      "relative flex pr-4 transition-colors duration-500",
                      row.type === "remove" && showAdds && "bg-destructive/12 shadow-[inset_2px_0_0_var(--destructive)]",
                      row.type === "add" && "bg-success/12 shadow-[inset_2px_0_0_var(--success)]",
                      isErrorLine && markBug && "bg-destructive/10 shadow-[inset_2px_0_0_var(--destructive)]",
                    )}
                  >
                    <span className="w-9 shrink-0 pr-3 text-right text-muted-foreground/40 select-none">{lineNo}</span>
                    <span
                      className={cn(
                        "w-4 shrink-0 text-center select-none",
                        row.type === "add" ? "text-success" : "text-destructive",
                        !(showAdds && row.type !== "context") && "text-transparent",
                      )}
                    >
                      {row.type === "add" ? "+" : "−"}
                    </span>
                    <span
                      className={cn(
                        "whitespace-pre transition-opacity duration-500",
                        row.type === "remove" && showAdds && "line-through decoration-destructive/60 opacity-55",
                      )}
                    >
                      {isErrorLine && markBug && bugStart >= 0 ? (
                        <EmphasizedTokens
                          tokens={row.tokens}
                          ranges={[[bugStart, bugStart + example.bugToken.length]]}
                          markClassName={cn(
                            "squiggle transition-[background-color,outline-color] duration-300",
                            analyzing && "rounded-[3px] bg-destructive/15 outline outline-1 outline-offset-1 outline-destructive/60",
                          )}
                        />
                      ) : row.tokens.length ? (
                        <TokenSpans tokens={row.tokens} />
                      ) : (
                        " "
                      )}
                    </span>
                    <AnimatePresence>
                      {isErrorLine && analyzing && (
                        <motion.span
                          initial={{ opacity: 0, x: 8, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-1.5 rounded-md border border-destructive/30 bg-popover/95 px-2 py-0.5 font-sans text-[10px] text-destructive shadow-lg sm:inline-flex"
                        >
                          <span className="size-1.5 rounded-full bg-destructive" />
                          root cause · {example.rootCause}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {phase === "retrieval" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-scan absolute inset-0"
            style={{
              animationDuration: "1.5s",
              background:
                "linear-gradient(to bottom, transparent 38%, color-mix(in oklch, var(--primary) 14%, transparent) 48%, color-mix(in oklch, var(--primary) 70%, transparent) 50%, color-mix(in oklch, var(--primary) 14%, transparent) 52%, transparent 62%)",
            }}
          />
        </div>
      )}
    </div>
  )
}

function Terminal({ example, phase }: { example: CodeExample; phase: Phase }) {
  const healed = phase === "healed"
  const traceLines = useMemo(() => highlightTrace(example.trace.split("\n").slice(0, 2).join("\n")), [example])
  return (
    <div className="border-t border-border/70 bg-muted/25 px-3 py-2 font-mono text-[10.5px] leading-relaxed">
      <div className="mb-1 flex items-center gap-2 text-[10px] tracking-wide text-muted-foreground uppercase">
        <span>Terminal</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {healed ? (
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="truncate text-success"
          >
            ✓ {example.tests.length} passed · 0 failed — patch verified
          </motion.p>
        ) : (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -4 }}>
            {traceLines.map((tokens, i) => (
              <p key={i} className="truncate">
                <TokenSpans tokens={tokens} />
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function HealingSimulator({ className }: { className?: string }) {
  const examples = LANDING_EXAMPLES
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  const [playing, setPlaying] = useState(true)
  const [runId, setRunId] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const healBtnRef = useRef<HTMLButtonElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)
  const inView = useInView(rootRef, { amount: 0.3 })
  const { reduced } = useMotionPreference()
  const [cursor, setCursor] = useState({ x: 0, y: 0, tx: 0, ty: 0 })

  const example = examples[index]
  const shown: Phase = reduced ? "healed" : phase
  const pi = idx(shown)

  // One clock drives everything; React state only changes when the phase does.
  useEffect(() => {
    if (!playing || !inView || reduced) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      elapsed.current += Math.min(100, now - last)
      last = now
      const e = elapsed.current
      if (e >= AT.healed + HOLD_MS) {
        elapsed.current = 0
        setPhase("idle")
        setIndex((i) => (i + 1) % examples.length)
        return
      }
      const p = phaseAt(e)
      setPhase((prev) => (prev === p ? prev : p))
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, e / AT.healed)})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, inView, reduced, index, runId, examples.length])

  // Aim the fake cursor at the Heal button (layout differs per breakpoint).
  useLayoutEffect(() => {
    const root = rootRef.current
    const btn = healBtnRef.current
    if (!root || !btn) return
    const r = root.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    setCursor({
      x: r.width * 0.42,
      y: r.height * 0.86,
      tx: b.left - r.left + b.width * 0.55,
      ty: b.top - r.top + b.height * 0.6,
    })
  }, [index, runId, inView])

  useEffect(() => {
    if (reduced && progressRef.current) progressRef.current.style.transform = "scaleX(1)"
  }, [reduced])

  const select = (i: number) => {
    elapsed.current = 0
    if (progressRef.current) progressRef.current.style.transform = "scaleX(0)"
    setIndex(i)
    setPhase("idle")
    setRunId((r) => r + 1)
  }

  const replay = () => select(index)

  const stepState = (key: (typeof STEPS)[number]["key"]) => {
    const s = idx(key)
    if (pi > s) return "done" as const
    if (pi === s) return "active" as const
    return "pending" as const
  }

  const working = pi >= idx("retrieval") && pi < idx("healed")
  const showCursor = !reduced && pi <= idx("click")

  return (
    <div ref={rootRef} data-no-heal className={cn("relative", className)}>
      {/* Glow behind the window */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-8 -bottom-10 rounded-[3rem] opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 30%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 70%), radial-gradient(50% 60% at 75% 60%, color-mix(in oklch, var(--info) 32%, transparent), transparent 70%)",
        }}
      />

      <div className="glass-strong relative overflow-hidden rounded-2xl border border-border shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">

        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="size-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="no-scrollbar ml-2 flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Example files">
            {examples.map((ex, i) => {
              const active = i === index
              return (
                <button
                  key={ex.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => select(i)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sim-tab"
                      className="absolute inset-0 rounded-md bg-background/80 ring-1 ring-border dark:bg-accent/70"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[ex.language] }} />
                  <span className="relative">{ex.file.split("/").pop()}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={playing ? "Pause demo" : "Play demo"}
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              type="button"
              aria-label="Replay demo"
              onClick={replay}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Editor side */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5 font-mono text-[10.5px] text-muted-foreground">
              <span className="truncate">{example.file}</span>
              <span className="ml-auto shrink-0">{LANGUAGE_LABELS[example.language]}</span>
            </div>
            <div className="flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${example.id}-${runId}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <CodePane example={example} phase={shown} />
                </motion.div>
              </AnimatePresence>
            </div>
            <Terminal example={example} phase={shown} />
          </div>

          {/* AI panel */}
          <div className="flex flex-col border-t border-border/70 lg:border-t-0 lg:border-l">
            <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="size-3.5 text-info" /> Self-Healing
                <span className="ml-1 rounded-full bg-info/12 px-1.5 py-px text-[9.5px] font-medium text-info">live</span>
              </div>
              <motion.button
                ref={healBtnRef}
                type="button"
                tabIndex={-1}
                aria-hidden
                animate={shown === "click" ? { scale: [1, 0.88, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.45 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_6px_20px_-6px_var(--primary)] transition-[filter]",
                  shown === "healed" ? "bg-success" : "bg-gradient-to-r from-primary to-info",
                  shown === "click" && "brightness-125",
                )}
              >
                {working ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : shown === "healed" ? (
                  <Check className="size-3" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                {working ? "Healing" : shown === "healed" ? "Healed" : "Heal"}
              </motion.button>
            </div>

            <ol className="space-y-0.5 p-2">
              {STEPS.map((s) => (
                <StepRow key={s.key} label={s.label} icon={s.icon} message={example.telemetry[s.key]} state={stepState(s.key)} />
              ))}
            </ol>

            <div className="mt-auto space-y-2 border-t border-border/60 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-foreground">Tests</span>
                <span className={cn("font-mono tabular-nums", pi >= idx("healed") ? "text-success" : "text-muted-foreground")}>
                  {pi >= idx("testing") ? `${pi >= idx("healed") ? example.tests.length : "…"}/${example.tests.length}` : "—"}
                </span>
              </div>
              <ul className="space-y-1">
                {example.tests.slice(0, 4).map((t, i) => (
                  <li key={`${example.id}-${runId}-${t}`} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                    {pi >= idx("testing") ? (
                      <motion.span
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...SPRING_BOUNCY, delay: reduced ? 0 : 0.25 + i * 0.28 }}
                        className="flex"
                      >
                        <CheckCircle2 className="size-3 text-success" />
                      </motion.span>
                    ) : (
                      <span className="size-3 rounded-full border border-border" />
                    )}
                    <span className="truncate">{t}</span>
                  </li>
                ))}
              </ul>
              <AnimatePresence>
                {shown === "healed" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING_BOUNCY}
                    className="relative flex items-center gap-2 rounded-lg border border-success/30 bg-success/12 px-3 py-2 text-xs font-medium text-success"
                  >
                    {!reduced && <Burst />}
                    <CheckCircle2 className="size-4" />
                    Healed in 2.4s · root cause explained
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Status bar + timeline */}
        <div className="flex items-center gap-3 border-t border-border/70 bg-muted/40 px-3 py-1.5 font-mono text-[10.5px]">
          <AnimatePresence mode="wait" initial={false}>
            {shown === "healed" ? (
              <motion.span key="ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-success">
                <Check className="size-3" /> 0 problems
              </motion.span>
            ) : (
              <motion.span key="err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-destructive">
                <X className="size-3" /> 1 problem
              </motion.span>
            )}
          </AnimatePresence>
          <span className="hidden truncate text-muted-foreground sm:inline">
            {shown === "healed" ? "patch applied · tests green" : `Ln ${example.errorLine} · ${example.rootCause}`}
          </span>
          <span className="ml-auto shrink-0 text-muted-foreground">{LANGUAGE_LABELS[example.language]} · UTF-8</span>
        </div>
        <div className="h-[2px] bg-border/40">
          <div
            ref={progressRef}
            className="h-full origin-left bg-gradient-to-r from-primary via-info to-success"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        {/* The fake cursor that "clicks" Heal */}
        <AnimatePresence>
          {showCursor && cursor.tx > 0 && (
            <motion.div
              key={`cursor-${index}-${runId}`}
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 z-20"
              initial={{ x: cursor.x, y: cursor.y, opacity: 0 }}
              animate={{ x: cursor.tx, y: cursor.ty, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1.05, delay: 0.3, ease: [0.45, 0, 0.2, 1] }}
            >
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                animate={shown === "click" ? { scale: [1, 0.8, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
              >
                <path d="M4 2.5 20 11l-7 1.8L9.6 20z" fill="white" stroke="#0b1220" strokeWidth="1.4" strokeLinejoin="round" />
              </motion.svg>
              {shown === "click" && (
                <motion.span
                  className="absolute top-0 left-0 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
