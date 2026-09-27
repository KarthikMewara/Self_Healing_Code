import { CheckCircle2, CornerDownRight, Search } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"

import { ProgressRing } from "@/components/app/progress-ring"
import { EmphasizedTokens } from "@/components/code/token-spans"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useTypewriter } from "@/hooks/use-typewriter"
import { computeDiffRows } from "@/lib/diff"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Four small, self-contained scenes for the "How it works" section. Each one
// replays its animation whenever `active` flips on.

function Frame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass-strong overflow-hidden rounded-2xl border border-border shadow-2xl", className)}>
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const CASES = [
  { id: "#4821", project: "checkout-service", pattern: "optional coupon read without a guard", score: 94 },
  { id: "#3310", project: "web-dashboard", pattern: "undefined props on first render", score: 81 },
  { id: "#2968", project: "auth-service", pattern: "missing header dereferenced", score: 67 },
]

export function RetrievalVisual({ active }: { active: boolean }) {
  const { text } = useTypewriter("TypeError reading 'percentOff' · checkout-service", { speed: 22, start: active })
  return (
    <Frame title="retrieval · company knowledge base">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs">
        <Search className="size-3.5 text-muted-foreground" />
        <span className="text-foreground">{text}</span>
        <span className="animate-caret h-3.5 w-[6px] bg-primary" />
      </div>
      <ul className="mt-4 space-y-2.5">
        {CASES.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ delay: 0.9 + i * 0.18, duration: 0.45, ease: EASE_OUT }}
            className={cn(
              "rounded-xl border p-3",
              i === 0 ? "border-primary/40 bg-primary/8 shadow-[0_0_30px_-12px_var(--primary)]" : "border-border bg-background/40",
            )}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono font-medium text-foreground">
                case {c.id} <span className="text-muted-foreground">· {c.project}</span>
              </span>
              <span className={cn("font-mono tabular-nums", i === 0 ? "text-primary" : "text-muted-foreground")}>
                {active ? <NumberTicker value={c.score} suffix="%" startOnView={false} delay={1 + i * 0.18} /> : "0%"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", i === 0 ? "bg-gradient-to-r from-primary to-info" : "bg-muted-foreground/40")}
                initial={{ width: 0 }}
                animate={{ width: active ? `${c.score}%` : 0 }}
                transition={{ delay: 1 + i * 0.18, duration: 1, ease: EASE_OUT }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{c.pattern}</p>
          </motion.li>
        ))}
      </ul>
    </Frame>
  )
}

interface AstNode {
  id: string
  label: string
  x: number
  y: number
  parent?: string
  fault?: boolean
}

const AST: AstNode[] = [
  { id: "prog", label: "Program", x: 210, y: 26 },
  { id: "fn", label: "checkoutTotal(cart)", x: 210, y: 82, parent: "prog" },
  { id: "sub", label: "const subtotal", x: 78, y: 140, parent: "fn" },
  { id: "rate", label: "const rate", x: 210, y: 140, parent: "fn" },
  { id: "ret", label: "return", x: 342, y: 140, parent: "fn" },
  { id: "div", label: "÷ 100", x: 210, y: 196, parent: "rate" },
  { id: "mem", label: "cart.coupon.percentOff", x: 146, y: 250, parent: "div", fault: true },
  { id: "lit", label: "100", x: 318, y: 250, parent: "div" },
]

export function AnalysisVisual({ active }: { active: boolean }) {
  const byId = Object.fromEntries(AST.map((n) => [n.id, n]))
  return (
    <Frame title="analysis · stack trace → AST">
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 font-mono text-[11px]">
        <span className="text-destructive">TypeError</span>
        <span className="truncate text-muted-foreground">at checkoutTotal (cart.js:5:28)</span>
      </div>
      <svg viewBox="0 0 420 280" className="h-auto w-full" aria-label="Abstract syntax tree with the failing expression highlighted">
        {AST.filter((n) => n.parent).map((n, i) => {
          const p = byId[n.parent!]
          return (
            <motion.path
              key={`l-${n.id}`}
              d={`M ${p.x} ${p.y + 12} C ${p.x} ${(p.y + n.y) / 2}, ${n.x} ${(p.y + n.y) / 2}, ${n.x} ${n.y - 12}`}
              fill="none"
              stroke={n.fault ? "var(--destructive)" : "var(--border)"}
              strokeWidth={n.fault ? 1.6 : 1.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: active ? 1 : 0 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE_OUT }}
            />
          )
        })}
        {AST.map((n, i) => {
          const w = Math.max(44, n.label.length * 6.6 + 22)
          return (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.1 + i * 0.12, ...SPRING_BOUNCY }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            >
              {n.fault && active && (
                <motion.rect
                  x={n.x - w / 2 - 4}
                  y={n.y - 16}
                  width={w + 8}
                  height={32}
                  rx={10}
                  fill="none"
                  stroke="var(--destructive)"
                  strokeWidth={1.5}
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={{ opacity: [0.9, 0, 0.9], scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 1.2 }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
              )}
              <rect
                x={n.x - w / 2}
                y={n.y - 12}
                width={w}
                height={24}
                rx={7}
                fill={n.fault ? "color-mix(in oklch, var(--destructive) 16%, var(--card))" : "var(--card)"}
                stroke={n.fault ? "var(--destructive)" : "var(--border)"}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="font-mono"
                fontSize="11"
                fill={n.fault ? "var(--destructive)" : "var(--syn-plain)"}
              >
                {n.label}
              </text>
            </motion.g>
          )
        })}
      </svg>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ delay: 1.3 }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <CornerDownRight className="size-3.5 text-destructive" />
        <span>
          <span className="font-mono text-destructive">cart.coupon</span> is <span className="font-mono">undefined</span> when no
          coupon is applied
        </span>
      </motion.p>
    </Frame>
  )
}

const GEN_BEFORE = "const subtotal = sumItems(cart)\nconst rate = cart.coupon.percentOff / 100\nreturn formatPrice(subtotal - subtotal * rate)"
const GEN_AFTER = "const subtotal = sumItems(cart)\nconst rate = (cart.coupon?.percentOff ?? 0) / 100\nreturn formatPrice(subtotal - subtotal * rate)"

export function GenerationVisual({ active }: { active: boolean }) {
  const rows = useMemo(() => computeDiffRows(GEN_BEFORE, GEN_AFTER, "javascript"), [])
  const { text } = useTypewriter("No coupon now means a 0% discount. Carts with a coupon take exactly the same path as before.", {
    speed: 16,
    step: 2,
    start: active,
    delay: 1200,
  })
  return (
    <Frame title="generation · minimal patch">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-muted-foreground">checkout-service/cart.js</span>
        <span className="font-mono text-success">+1</span>
        <span className="font-mono text-destructive">−1</span>
        <span className="text-muted-foreground">· 1 line changed, nothing else touched</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-background/50 py-2 font-mono text-[12px] leading-[1.9] [font-variant-ligatures:none]">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: row.type === "add" ? 12 : 0 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ delay: 0.2 + i * 0.16, duration: 0.4, ease: EASE_OUT }}
            className={cn(
              "flex overflow-hidden pr-3 whitespace-pre",
              row.type === "add" && "bg-success/12 shadow-[inset_2px_0_0_var(--success)]",
              row.type === "remove" && "bg-destructive/12 shadow-[inset_2px_0_0_var(--destructive)]",
            )}
          >
            <span
              className={cn(
                "w-7 shrink-0 text-center select-none",
                row.type === "add" ? "text-success" : row.type === "remove" ? "text-destructive" : "text-transparent",
              )}
            >
              {row.type === "add" ? "+" : "−"}
            </span>
            <span className="truncate">
              <EmphasizedTokens
                tokens={row.tokens}
                ranges={row.emphasis}
                markClassName={row.type === "add" ? "rounded-[3px] bg-success/30" : "rounded-[3px] bg-destructive/30"}
              />
            </span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-info/25 bg-info/8 p-3">
        <p className="text-[11px] font-semibold tracking-wide text-info uppercase">Why this is safe</p>
        <p className="mt-1 min-h-[2.5rem] text-sm text-foreground/90">{text}</p>
      </div>
    </Frame>
  )
}

const TESTS = [
  ["applies a 20% coupon to the subtotal", 38],
  ["charges full price without a coupon", 22],
  ["returns $0.00 for an empty cart", 17],
  ["rounds totals to 2 decimals", 12],
  ["POST /checkout responds 200", 141],
  ["rejects a malformed cart", 29],
] as const

export function TestingVisual({ active }: { active: boolean }) {
  return (
    <Frame title="testing · your suite, against the patch">
      <div className="flex items-center gap-5">
        <ProgressRing value={active ? 100 : 0} size={92} stroke={7} tone="success" animateOnView={false}>
          <div className="text-center">
            <p className="text-lg leading-none font-semibold text-foreground">
              {active ? <NumberTicker value={6} startOnView={false} duration={1.6} /> : 0}
              <span className="text-muted-foreground">/6</span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">passed</p>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-1.5">
          {TESTS.map(([name, ms], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -6 }}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ delay: 0.15 + i * 0.22 }}
              className="flex items-center gap-2 text-xs"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: active ? 1 : 0 }}
                transition={{ ...SPRING_BOUNCY, delay: 0.3 + i * 0.22 }}
                className="flex"
              >
                <CheckCircle2 className="size-3.5 text-success" />
              </motion.span>
              <span className="truncate text-foreground/90">{name}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{ms}ms</span>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: 1.7 }}
        className="mt-5 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs"
      >
        <span className="font-medium text-success">Suite passed · fix delivered</span>
        <span className="font-mono text-muted-foreground">259ms total</span>
      </motion.div>
    </Frame>
  )
}
