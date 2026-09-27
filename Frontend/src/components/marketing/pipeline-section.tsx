import { DatabaseZap, FlaskConical, ScanSearch, Wand2, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useInView, useScroll, useSpring } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"

import { TokenSpans } from "@/components/code/token-spans"
import { AnalysisVisual, GenerationVisual, RetrievalVisual, TestingVisual } from "@/components/marketing/pipeline-visuals"
import { SectionHeading } from "@/components/marketing/section-heading"
import { useTypewriter } from "@/hooks/use-typewriter"
import { tokenize } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

type StageKey = "retrieval" | "analysis" | "generation" | "testing"

const STAGES: {
  key: StageKey
  n: string
  title: string
  icon: LucideIcon
  color: string
  headline: string
  body: string
  message: string
  Visual: (props: { active: boolean }) => React.ReactElement
}[] = [
  {
    key: "retrieval",
    n: "01",
    title: "Retrieval",
    icon: DatabaseZap,
    color: "var(--primary)",
    headline: "It remembers what your team already fixed",
    body: "The moment you hit Analyze, it searches your company's knowledge base and past repairs for cases like this one — scoped to your tenant and never shared across companies.",
    message: "Searching company database for similar TypeErrors in checkout-service...",
    Visual: RetrievalVisual,
  },
  {
    key: "analysis",
    n: "02",
    title: "Analysis",
    icon: ScanSearch,
    color: "var(--info)",
    headline: "It reads the trace like a senior engineer",
    body: "It parses your stack trace and builds the AST of the failing module to pinpoint the exact expression that broke — and the runtime condition that broke it.",
    message: "Parsing the stack trace and building the AST for checkoutTotal()...",
    Visual: AnalysisVisual,
  },
  {
    key: "generation",
    n: "03",
    title: "Generation",
    icon: Wand2,
    color: "var(--warning)",
    headline: "It writes the smallest safe patch",
    body: "Not a rewrite. A minimal, targeted change, returned as a GitHub-style diff with a plain-English explanation of what changed and why it's safe.",
    message: "Generating a minimal patch for the unguarded read of cart.coupon...",
    Visual: GenerationVisual,
  },
  {
    key: "testing",
    n: "04",
    title: "Testing",
    icon: FlaskConical,
    color: "var(--success)",
    headline: "It proves the fix before you ever see it",
    body: "The patch runs against your test suite first. If it can't get to green after its internal retries, it tells you plainly instead of guessing.",
    message: "Running the project's test suite against the patch...",
    Visual: TestingVisual,
  },
]

/** The literal SSE frame the API emits for the active stage. */
function EventFrame({ stage }: { stage: (typeof STAGES)[number] }) {
  const json = JSON.stringify({ step: stage.key, message: stage.message })
  const { text } = useTypewriter(json, { speed: 10, step: 2 })
  const tokens = useMemo(() => tokenize(text, "javascript"), [text])
  return (
    <div className="glass overflow-hidden rounded-xl border border-border font-mono text-[11.5px] leading-relaxed">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
        <span className="relative flex size-1.5">
          <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-success" />
          <span className="relative inline-flex size-1.5 rounded-full bg-success" />
        </span>
        text/event-stream
      </div>
      <div className="px-3 py-2.5">
        <p>
          <span className="text-info">event:</span> <span className="text-foreground">status</span>
        </p>
        <p className="break-all">
          <span className="text-info">data:</span> <TokenSpans tokens={tokens} />
          <span className="animate-caret ml-0.5 inline-block h-3 w-[6px] translate-y-0.5 bg-primary" />
        </p>
      </div>
    </div>
  )
}

function StepBlock({
  stage,
  index,
  active,
  onActive,
}: {
  stage: (typeof STAGES)[number]
  index: number
  active: boolean
  onActive: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const centered = useInView(ref, { margin: "-45% 0px -45% 0px" })
  const visible = useInView(ref, { amount: 0.3 })
  useEffect(() => {
    if (centered) onActive(index)
  }, [centered, index, onActive])

  return (
    <div ref={ref} className="relative flex min-h-[60vh] flex-col justify-center py-10 lg:min-h-[78vh] lg:py-0">
      <motion.div
        animate={{ opacity: active ? 1 : 0.35 }}
        transition={{ duration: 0.4 }}
        className="relative pl-10 lg:pl-14"
      >
        <span
          className={cn(
            "absolute top-1 left-0 flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-500 lg:size-9",
            active ? "border-transparent text-white shadow-[0_0_24px_-2px_var(--glow)]" : "border-border bg-background text-muted-foreground",
          )}
          style={{ "--glow": stage.color, background: active ? stage.color : undefined } as React.CSSProperties}
        >
          <stage.icon className="size-3.5 lg:size-4" />
        </span>
        <p className="font-mono text-xs text-muted-foreground">
          {stage.n} · {stage.title}
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{stage.headline}</h3>
        <p className="mt-3 max-w-md text-base text-muted-foreground">{stage.body}</p>
      </motion.div>
      <div className="mt-8 pl-10 lg:hidden">
        <stage.Visual active={visible} />
      </div>
    </div>
  )
}

export function PipelineSection() {
  const [active, setActive] = useState(0)
  const railRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start 55%", "end 55%"] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const stage = STAGES[active]

  return (
    <section id="how" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24 md:px-8 md:py-32">
      <SectionHeading
        eyebrow="How it works"
        title={
          <>
            Four stages. Streamed live.{" "}
            <span className="text-gradient-brand animate-gradient-pan">Nothing hidden.</span>
          </>
        }
        description="Every heal streams its reasoning to you as it happens — the same status events the API emits, rendered as a live tracker."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div ref={railRef} className="relative">
          {/* progress rail */}
          <div aria-hidden className="absolute top-0 bottom-0 left-[13px] w-px bg-border lg:left-[17px]">
            <motion.div
              className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-primary via-info to-success"
              style={{ scaleY: fill }}
            />
          </div>
          {STAGES.map((s, i) => (
            <StepBlock key={s.key} stage={s} index={i} active={active === i} onActive={setActive} />
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="relative min-h-[430px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                  exit={{ opacity: 0, y: -18, scale: 0.98, filter: "blur(6px)" }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                >
                  <stage.Visual active />
                </motion.div>
              </AnimatePresence>
            </div>
            <EventFrame key={stage.key} stage={stage} />
            <div className="flex gap-1.5">
              {STAGES.map((s, i) => (
                <span
                  key={s.key}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: s.color }}
                    initial={false}
                    animate={{ width: i <= active ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
