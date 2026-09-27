import { KeyRound, MessagesSquare, Radio, RotateCcw } from "lucide-react"
import { AnimatePresence, motion, useInView } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"

import { SegmentedControl } from "@/components/app/segmented-control"
import { CodeBlock } from "@/components/code/code-block"
import { TokenSpans } from "@/components/code/token-spans"
import { Reveal } from "@/components/fx/reveal"
import { SectionHeading } from "@/components/marketing/section-heading"
import { useMotionPreference } from "@/components/motion-preference"
import { tokenize } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"

// Straight from the backend contract (POST /api/v1/heal, text/event-stream).

const SNIPPETS = {
  curl: {
    language: "javascript",
    filename: "heal.sh",
    code: `curl -N -X POST "$API_URL/api/v1/heal" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{
    "language": "javascript",
    "source_code": "export function checkoutTotal(cart) { ... }",
    "error_trace": "TypeError: Cannot read properties of undefined ...",
    "user_context": "Only fails without a coupon"
  }'`,
  },
  js: {
    language: "javascript",
    filename: "heal.js",
    code: `const res = await fetch(\`\${API_URL}/api/v1/heal\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    Authorization: \`Bearer \${token}\`,
  },
  body: JSON.stringify({ language, source_code, error_trace }),
})

const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  console.log(value) // event: status | complete | error
}`,
  },
  python: {
    language: "python",
    filename: "heal.py",
    code: `import requests

with requests.post(
    f"{API_URL}/api/v1/heal",
    headers={"Accept": "text/event-stream", "Authorization": f"Bearer {token}"},
    json={"language": "python", "source_code": code, "error_trace": trace},
    stream=True,
) as res:
    for line in res.iter_lines(decode_unicode=True):
        if line:
            print(line)  # event: status | complete | error`,
  },
} as const

type SnippetKey = keyof typeof SNIPPETS

const EVENTS: { at: number; event: "status" | "complete"; data: Record<string, string> }[] = [
  { at: 0.4, event: "status", data: { step: "retrieval", message: "Searching company database for similar TypeErrors..." } },
  { at: 1.1, event: "status", data: { step: "analysis", message: "Parsing the stack trace and building the AST..." } },
  { at: 1.9, event: "status", data: { step: "generation", message: "Generating a minimal patch..." } },
  { at: 2.6, event: "status", data: { step: "testing", message: "Running 6 tests against the patch..." } },
  {
    at: 3.4,
    event: "complete",
    data: {
      session_id: "sess_8f2k1xq4",
      original_code: "export function checkoutTotal(cart) {…",
      fixed_code: "export function checkoutTotal(cart) {…",
      explanation: "### Root cause\n`cart.coupon` is undefined…",
    },
  },
]

function EventLine({ event, data, at }: (typeof EVENTS)[number]) {
  const tokens = useMemo(() => tokenize(JSON.stringify(data), "javascript"), [data])
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="group relative rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/40"
    >
      <span className="absolute top-1.5 right-3 text-[10px] text-muted-foreground/60 tabular-nums">+{at.toFixed(1)}s</span>
      <p>
        <span className="text-info">event:</span>{" "}
        <span className={event === "complete" ? "font-semibold text-success" : "text-foreground"}>{event}</span>
      </p>
      <p className="break-all">
        <span className="text-info">data:</span> <TokenSpans tokens={tokens} />
      </p>
    </motion.div>
  )
}

function StreamTerminal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const { reduced } = useMotionPreference()
  const [count, setCount] = useState(0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (reduced) {
      setCount(EVENTS.length)
      return
    }
    if (!inView) return
    setCount(0)
    const timers = EVENTS.map((e, i) => setTimeout(() => setCount(i + 1), e.at * 1000))
    return () => timers.forEach(clearTimeout)
  }, [inView, run, reduced])

  const done = count >= EVENTS.length

  return (
    <div ref={ref} className="glass-strong flex h-full flex-col overflow-hidden rounded-2xl border border-border font-mono text-[11.5px] leading-relaxed shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
        <span className="relative flex size-2">
          {!done && <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-success" />}
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="text-[11px] text-foreground">POST /api/v1/heal</span>
        <span className="rounded bg-success/15 px-1.5 text-[10px] text-success">200</span>
        <span className="text-[10px] text-muted-foreground">text/event-stream</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-sans text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Replay
        </button>
      </div>
      <div className="flex-1 space-y-1 p-2">
        <AnimatePresence>
          {EVENTS.slice(0, count).map((e) => (
            <EventLine key={`${run}-${e.at}`} {...e} />
          ))}
        </AnimatePresence>
        {!done && (
          <p className="px-3 py-1.5 text-muted-foreground">
            <span className="animate-caret inline-block h-3.5 w-[7px] translate-y-0.5 bg-primary" />
          </p>
        )}
      </div>
      <div className="border-t border-border/70 px-3 py-2 text-[10.5px] text-muted-foreground">
        {done ? (
          <span className="text-success">stream closed · session ready for follow-up chat</span>
        ) : (
          <span>streaming… {count}/{EVENTS.length} events</span>
        )}
      </div>
    </div>
  )
}

const POINTS = [
  { icon: Radio, title: "Server-Sent Events", body: "status → complete | error, so the UI can show every stage live." },
  { icon: MessagesSquare, title: "Session memory", body: "The complete event's session_id powers POST /api/v1/chat follow-ups." },
  { icon: KeyRound, title: "Tenant-scoped", body: "A Bearer token picks your company's data — no tenant picker, no leaks." },
]

export function ApiSection() {
  const [tab, setTab] = useState<SnippetKey>("curl")
  const snippet = SNIPPETS[tab]

  return (
    <section id="api" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24 md:px-8 md:py-32">
      <SectionHeading
        eyebrow="Streaming API"
        title={
          <>
            The same stream, <span className="text-gradient-brand animate-gradient-pan">anywhere you need it</span>
          </>
        }
        description="The app is built on one streaming endpoint. Call it from CI, a bot or your own tooling and get the exact events the UI renders."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SegmentedControl
              aria-label="Request language"
              value={tab}
              onChange={setTab}
              options={[
                { value: "curl", label: "cURL" },
                { value: "js", label: "JavaScript" },
                { value: "python", label: "Python" },
              ]}
            />
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">POST /api/v1/heal</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1"
            >
              <CodeBlock code={snippet.code} language={snippet.language} filename={snippet.filename} className="glass-strong h-full shadow-2xl" />
            </motion.div>
          </AnimatePresence>
        </Reveal>
        <Reveal delay={0.1}>
          <StreamTerminal />
        </Reveal>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08} className="flex gap-3 rounded-xl border border-border/70 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <p.icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
