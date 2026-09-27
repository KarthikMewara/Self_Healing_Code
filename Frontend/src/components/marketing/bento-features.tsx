import { Brain, Bug, FlaskConical, Gauge, MessagesSquare, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { TokenSpans } from "@/components/code/token-spans"
import { NumberTicker } from "@/components/fx/number-ticker"
import { Reveal } from "@/components/fx/reveal"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { SectionHeading } from "@/components/marketing/section-heading"
import { useMotionPreference } from "@/components/motion-preference"
import { useTypewriter } from "@/hooks/use-typewriter"
import { highlightLines } from "@/lib/highlight"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Cycles 0..n-1 every `ms` while the element is on screen. */
function useCycle(n: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const { reduced } = useMotionPreference()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!inView || reduced) return
    const id = setInterval(() => setI((v) => (v + 1) % n), ms)
    return () => clearInterval(id)
  }, [inView, reduced, n, ms])
  return { ref, i, inView }
}

function Tile({
  icon: Icon,
  title,
  body,
  glow,
  className,
  children,
  delay = 0,
}: {
  icon: LucideIcon
  title: string
  body: string
  glow: string
  className?: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <Reveal delay={delay} className={cn("h-full", className)}>
      <SpotlightCard glow={glow} className="group flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
        <div className="relative mb-5 min-h-[168px] flex-1">{children}</div>
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-110"
            style={{
              color: glow,
              background: `color-mix(in oklch, ${glow} 14%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${glow} 28%, transparent)`,
            }}
          >
            <Icon className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

// --- Tile scenes -----------------------------------------------------------

const RC_CODE = "function checkoutTotal(cart) {\n  const subtotal = sumItems(cart)\n  const rate = cart.coupon.percentOff / 100\n  return subtotal - subtotal * rate\n}"
const RC_LINES = highlightLines(RC_CODE, "javascript")
const RC_FRAMES = ["at checkoutTotal (cart.js:3:28)", "at handleCheckout (routes.js:41:18)", "at Layer.handle (layer.js:95:5)"]

function RootCauseScene() {
  const { ref, i } = useCycle(2, 2600)
  const traced = i === 1
  return (
    <div ref={ref} className="grid h-full gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-1.5 rounded-xl border border-border bg-background/50 p-3 font-mono text-[10.5px]">
        <p className="font-semibold text-destructive">TypeError</p>
        <p className="text-muted-foreground">Cannot read properties of undefined (reading 'percentOff')</p>
        {RC_FRAMES.map((f, k) => (
          <p
            key={f}
            className={cn(
              "truncate rounded px-1.5 py-0.5 transition-colors duration-500",
              k === 0 && traced ? "bg-destructive/15 text-destructive" : "text-muted-foreground/80",
            )}
          >
            {f}
          </p>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-background/50 py-2 font-mono text-[10.5px] leading-[1.8] [font-variant-ligatures:none]">
        {RC_LINES.map((tokens, k) => (
          <div
            key={k}
            className={cn(
              "flex pr-2 whitespace-pre transition-colors duration-500",
              k === 2 && traced && "bg-destructive/12 shadow-[inset_2px_0_0_var(--destructive)]",
            )}
          >
            <span className="w-6 shrink-0 pr-2 text-right text-muted-foreground/40">{k + 1}</span>
            <span className="truncate">
              <TokenSpans tokens={tokens} />
            </span>
          </div>
        ))}
        <AnimatePresence>
          {traced && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-2 bottom-2 rounded-md border border-destructive/30 bg-popover/95 px-2 py-0.5 font-sans text-[10px] text-destructive shadow"
            >
              line 3 · coupon may be undefined
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function FixScene() {
  const { ref, i } = useCycle(2, 2400)
  const fixed = i === 1
  const before = highlightLines("const rate = cart.coupon.percentOff", "javascript")[0]
  const after = highlightLines("const rate = cart.coupon?.percentOff ?? 0", "javascript")[0]
  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-3">
      <div className="relative h-11 overflow-hidden rounded-xl border border-border bg-background/50 font-mono text-[11px] [font-variant-ligatures:none]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={fixed ? "after" : "before"}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className={cn(
              "absolute inset-0 flex items-center px-3 whitespace-nowrap",
              fixed ? "bg-success/10 shadow-[inset_2px_0_0_var(--success)]" : "bg-destructive/10 shadow-[inset_2px_0_0_var(--destructive)]",
            )}
          >
            <span className={cn("mr-2", fixed ? "text-success" : "text-destructive")}>{fixed ? "+" : "−"}</span>
            <span className={cn("truncate", !fixed && "squiggle")}>
              <TokenSpans tokens={fixed ? after : before} />
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5 font-medium transition-colors", fixed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
          {fixed ? "✓ healed" : "✕ crashing"}
        </span>
        <span className="font-mono text-muted-foreground">{fixed ? "+1 −1" : "1 problem"}</span>
      </div>
    </div>
  )
}

const TEST_NAMES = ["applies coupon", "no coupon → full price", "empty cart", "rounds to cents", "POST /checkout 200"]

function TestsScene() {
  const { ref, i } = useCycle(TEST_NAMES.length + 3, 520)
  const passed = Math.min(i, TEST_NAMES.length)
  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-1.5">
      {TEST_NAMES.map((t, k) => (
        <div key={t} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-2.5 py-1.5 text-[11px]">
          <span
            className={cn(
              "flex size-3.5 items-center justify-center rounded-full border transition-all duration-300",
              k < passed ? "scale-100 border-success bg-success text-success-foreground" : "border-border",
            )}
          >
            {k < passed && <span className="text-[8px] leading-none">✓</span>}
          </span>
          <span className="truncate text-foreground/85">{t}</span>
        </div>
      ))}
      <p className="mt-1 text-right font-mono text-[10.5px] text-muted-foreground">
        <span className={passed === TEST_NAMES.length ? "text-success" : ""}>{passed}</span>/{TEST_NAMES.length} passed
      </p>
    </div>
  )
}

function RadarScene() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="relative size-36">
        {[1, 0.66, 0.33].map((s) => (
          <span key={s} className="absolute inset-0 m-auto rounded-full border border-border" style={{ width: `${s * 100}%`, height: `${s * 100}%` }} />
        ))}
        <span
          className="animate-spin-slow absolute inset-0 rounded-full"
          style={{
            animationDuration: "3.2s",
            background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklch, var(--warning) 45%, transparent) 50deg, transparent 60deg)",
          }}
        />
        {[
          { x: "28%", y: "30%", c: "var(--destructive)", l: "critical" },
          { x: "68%", y: "38%", c: "var(--warning)", l: "high" },
          { x: "44%", y: "72%", c: "var(--info)", l: "medium" },
        ].map((b, k) => (
          <span key={k} className="absolute" style={{ left: b.x, top: b.y }}>
            <span className="animate-ping-soft absolute -inset-1 rounded-full" style={{ background: b.c, animationDelay: `${k * 0.6}s` }} />
            <span className="relative block size-2 rounded-full" style={{ background: b.c }} />
          </span>
        ))}
      </div>
      <span className="absolute right-0 bottom-0 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
        1 critical caught before merge
      </span>
    </div>
  )
}

function PerfScene() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const path = "M0 12 L14 16 L28 10 L42 20 L56 44 L70 58 L84 62 L100 64"
  return (
    <div ref={ref} className="flex h-full flex-col justify-center">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">p95 latency</p>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {inView ? <NumberTicker value={140} startOnView={false} duration={2.2} format={(v) => `${Math.round(820 - ((820 - 140) * (v / 140)))}`} /> : 820}
            <span className="ml-0.5 text-sm text-muted-foreground">ms</span>
          </p>
        </div>
        <span className="rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">−83%</span>
      </div>
      <svg viewBox="0 0 100 72" preserveAspectRatio="none" className="mt-3 h-20 w-full overflow-visible">
        <defs>
          <linearGradient id="perf-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`${path} L100 72 L0 72 Z`}
          fill="url(#perf-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="var(--success)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 2, ease: EASE_OUT }}
        />
      </svg>
      <p className="mt-1 text-[11px] text-muted-foreground">N+1 query batched in the order-history endpoint</p>
    </div>
  )
}

const MEMORY_NODES = [
  { x: 18, y: 30 },
  { x: 38, y: 62 },
  { x: 52, y: 26 },
  { x: 70, y: 58 },
  { x: 86, y: 30 },
  { x: 30, y: 84 },
  { x: 62, y: 86 },
]
const MEMORY_LINKS = [
  [0, 2],
  [2, 4],
  [1, 3],
  [0, 1],
  [3, 4],
  [1, 5],
  [3, 6],
  [2, 3],
]

function MemoryScene() {
  const { ref, i } = useCycle(MEMORY_LINKS.length, 1300)
  return (
    <div ref={ref} className="relative h-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {MEMORY_LINKS.map(([a, b], k) => (
          <line
            key={k}
            x1={MEMORY_NODES[a].x}
            y1={MEMORY_NODES[a].y}
            x2={MEMORY_NODES[b].x}
            y2={MEMORY_NODES[b].y}
            stroke={k === i ? "var(--info)" : "var(--border)"}
            strokeWidth={k === i ? 1.6 : 1}
            vectorEffect="non-scaling-stroke"
            className="transition-[stroke] duration-500"
          />
        ))}
      </svg>
      {MEMORY_NODES.map((n, k) => {
        const lit = MEMORY_LINKS[i].includes(k)
        return (
          <span
            key={k}
            className={cn(
              "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500",
              lit ? "scale-125 border-info bg-info shadow-[0_0_16px_var(--info)]" : "border-border bg-card",
            )}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          />
        )
      })}
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 right-0 rounded-md border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info"
      >
        case #{4821 - i * 137} · {94 - i * 3}% match
      </motion.span>
    </div>
  )
}

function ChatScene() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const { text } = useTypewriter(
    "No — it only changes carts without a coupon. Every other caller takes exactly the same path as before.",
    { speed: 20, step: 2, start: inView, delay: 900 },
  )
  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-2.5">
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={SPRING_BOUNCY}
        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-3 py-2 text-xs text-foreground"
      >
        Could this break other callers?
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ ...SPRING_BOUNCY, delay: 0.6 }}
        className="flex max-w-[92%] gap-2"
      >
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-white">
          <Sparkles className="size-3" />
        </span>
        <p className="min-h-[3rem] rounded-2xl rounded-bl-md border border-border bg-background/60 px-3 py-2 text-xs text-foreground/90">
          {text}
          <span className="animate-caret ml-0.5 inline-block h-3 w-[5px] translate-y-0.5 bg-info" />
        </p>
      </motion.div>
    </div>
  )
}

export function BentoFeatures() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24 md:px-8 md:py-32">
      <SectionHeading
        eyebrow="Features"
        title={
          <>
            Everything you need to <span className="text-gradient-brand animate-gradient-pan">trust an AI fix</span>
          </>
        }
        description="Transparent reasoning, verified patches and a memory that gets faster on every bug your team has already seen."
      />
      <div className="grid auto-rows-fr gap-4 md:grid-cols-6">
        <Tile
          className="md:col-span-4"
          icon={Bug}
          glow="var(--destructive)"
          title="Root cause analysis"
          body="Maps every stack frame back to the exact line and expression that failed — and explains the runtime condition behind it."
        >
          <RootCauseScene />
        </Tile>
        <Tile className="md:col-span-2" icon={Sparkles} glow="var(--primary)" delay={0.08} title="Self-healing fixes" body="A verified patch, not a suggestion. The smallest change that makes the error go away.">
          <FixScene />
        </Tile>
        <Tile className="md:col-span-2" icon={FlaskConical} glow="var(--success)" title="Test-verified" body="Your suite runs against the patch before it's handed back to you.">
          <TestsScene />
        </Tile>
        <Tile className="md:col-span-2" icon={ShieldCheck} glow="var(--warning)" delay={0.08} title="Security scanning" body="Flags vulnerabilities alongside the bugs it fixes, by severity.">
          <RadarScene />
        </Tile>
        <Tile className="md:col-span-2" icon={Gauge} glow="var(--success)" delay={0.16} title="Performance insights" body="Surfaces slow paths and memory issues it notices along the way.">
          <PerfScene />
        </Tile>
        <Tile className="md:col-span-3" icon={Brain} glow="var(--info)" title="AI memory" body="Learns from every resolved case, so similar bugs across your projects heal faster next time.">
          <MemoryScene />
        </Tile>
        <Tile className="md:col-span-3" icon={MessagesSquare} glow="var(--primary)" delay={0.08} title="Ask follow-ups" body="Every heal opens a session — ask why it works or what else it touches, with full context.">
          <ChatScene />
        </Tile>
      </div>
    </section>
  )
}
