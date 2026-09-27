import { Check, Copy, FileCode2, ListPlus, LoaderCircle, RotateCcw, SlidersHorizontal, WandSparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { ProgressRing } from "@/components/app/progress-ring"
import { SegmentedControl } from "@/components/app/segmented-control"
import { Shimmer } from "@/components/app/page-skeleton"
import { CodeBlock } from "@/components/code/code-block"
import { EmptyState } from "@/components/empty-state"
import { GlowButton } from "@/components/fx/glow-button"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useMotionPreference } from "@/components/motion-preference"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTypewriter } from "@/hooks/use-typewriter"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { findSuite, GENERATOR_TARGETS, generateTests, TEST_TYPES, type GeneratedTests, type TestType } from "@/services/mock/testing"

import { generatorSignature, type CoverageTarget, type GeneratorState } from "./generator-state"

interface TestGeneratorViewProps {
  state: GeneratorState
  onChange: (patch: Partial<GeneratorState>) => void
  onAddToSuite: (result: GeneratedTests) => void
}

const targetLabel = (id: string) => {
  const t = GENERATOR_TARGETS.find((x) => x.id === id) ?? GENERATOR_TARGETS[0]
  return `${t.project} · ${t.symbol}`
}

export function TestGeneratorView({ state, onChange, onAddToSuite }: TestGeneratorViewProps) {
  const { reduced } = useMotionPreference()
  const target = GENERATOR_TARGETS.find((t) => t.id === state.targetId) ?? GENERATOR_TARGETS[0]
  const { phase, result } = state
  const busy = phase === "thinking" || phase === "typing"
  const signature = generatorSignature(state)
  const stale = Boolean(result && state.resultSignature !== signature)
  const [step, setStep] = useState(0)

  const code = result?.code ?? ""
  const typed = useTypewriter(code, {
    speed: 16,
    step: Math.max(4, Math.round(code.length / 340)),
    start: phase === "typing",
  })

  // thinking -> typing after a short "analysis" beat (restarts if you come back mid-way).
  useEffect(() => {
    if (phase !== "thinking") return
    const stepper = setInterval(() => setStep((s) => Math.min(3, s + 1)), reduced ? 60 : 520)
    const next = setTimeout(() => onChange({ phase: "typing" }), reduced ? 200 : 1650)
    return () => {
      clearInterval(stepper)
      clearTimeout(next)
    }
  }, [phase, reduced, onChange])

  // typing -> done once the typewriter has revealed everything.
  useEffect(() => {
    if (phase !== "typing" || !typed.done) return
    const t = setTimeout(() => onChange({ phase: "done" }), 0)
    return () => clearTimeout(t)
  }, [phase, typed.done, onChange])

  const generate = () => {
    if (!state.types.length) return
    setStep(0)
    onChange({
      phase: "thinking",
      result: generateTests(target, state.types, Number(state.coverage)),
      resultSignature: signature,
      added: false,
    })
  }

  const toggleType = (type: TestType, checked: boolean) => {
    const types = checked ? [...state.types, type] : state.types.filter((t) => t !== type)
    onChange({ types: TEST_TYPES.map((t) => t.value).filter((t) => types.includes(t)) })
  }

  const copy = () => {
    if (!result) return
    const lines = result.code.split("\n").length
    if (!navigator.clipboard) {
      toast.error("Clipboard isn't available in this browser")
      return
    }
    navigator.clipboard.writeText(result.code).then(
      () => toast.success(`Copied ${lines} lines`, { description: result.target.file }),
      () => toast.error("Couldn't copy — clipboard access was blocked"),
    )
  }

  const shownCode = phase === "done" ? code : `${typed.text}${phase === "typing" ? "▍" : ""}`
  const steps = [
    `Reading ${target.symbol} and its call sites in ${target.project}`,
    "Pulling past bugs for this code from AI Memory",
    `Choosing cases to reach ${state.coverage}% coverage`,
  ]
  const projected = phase === "done" && result && !stale ? result.projectedCoverage : null

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Configure" description="Tests are written against the latest healed code" icon={SlidersHorizontal}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground" id="gen-target-label">
              Target
            </p>
            <Select
              value={state.targetId}
              onValueChange={(value) => value && onChange({ targetId: value })}
              items={GENERATOR_TARGETS.map((t) => ({ value: t.id, label: targetLabel(t.id) }))}
              disabled={busy}
            >
              <SelectTrigger className="w-full" aria-labelledby="gen-target-label">
                <SelectValue>{(value: string) => targetLabel(value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GENERATOR_TARGETS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[t.language] }} />
                    {t.project} · <span className="font-mono text-xs">{t.symbol}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {LANGUAGE_LABELS[target.language]} · {target.framework} · adds to {findSuite(target.suiteId).name}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Coverage target</p>
            <SegmentedControl<CoverageTarget>
              value={state.coverage}
              onChange={(coverage) => onChange({ coverage })}
              aria-label="Coverage target"
              className="w-full [&>button]:flex-1"
              options={[
                { value: "60", label: "60%" },
                { value: "80", label: "80%" },
                { value: "95", label: "95%" },
              ]}
            />
            <div className="pt-1">
              <div className="relative h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/35"
                  style={{ width: `${target.baseCoverage}%` }}
                />
                <AnimatePresence>
                  {projected != null && (
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-success/50 to-success"
                      initial={{ width: `${target.baseCoverage}%`, opacity: 0 }}
                      animate={{ width: `${projected}%`, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.1, ease: EASE_OUT }}
                    />
                  )}
                </AnimatePresence>
                <motion.div
                  className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground"
                  animate={{ left: `${state.coverage}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>Now {target.baseCoverage}%</span>
                <span>{projected != null ? `Projected ${projected}%` : `Target ${state.coverage}%`}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Test types</p>
            {TEST_TYPES.map((type) => {
              const checked = state.types.includes(type.value)
              return (
                <label
                  key={type.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                    checked ? "border-primary/35 bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleType(type.value, value)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{type.label}</span>
                    <span className="block text-xs text-muted-foreground">{type.hint}</span>
                  </span>
                </label>
              )
            })}
            {!state.types.length && <p className="text-xs text-warning">Pick at least one test type.</p>}
          </div>

          <GlowButton className="h-9 w-full" onClick={generate} disabled={busy || !state.types.length}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
            {busy ? "Generating…" : result ? "Regenerate tests" : "Generate tests"}
          </GlowButton>
        </div>
      </Panel>

      <Panel
        title="Generated tests"
        description={result ? result.target.file : "Nothing generated yet"}
        icon={FileCode2}
        className="min-w-0"
        action={
          phase === "done" && result ? (
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Regenerate"
                      onClick={generate}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    />
                  }
                >
                  <RotateCcw className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Regenerate with the current settings</TooltipContent>
              </Tooltip>
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy /> Copy
              </Button>
              <Button size="sm" onClick={() => onAddToSuite(result)} disabled={state.added || stale}>
                {state.added ? <Check /> : <ListPlus />} {state.added ? "Added" : "Add to suite"}
              </Button>
            </div>
          ) : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={WandSparkles}
                title="No tests generated yet"
                description="Pick a target and a coverage goal. The generator writes idiomatic tests for the fixed code, including replays of the bugs AI Memory has seen there."
                actionLabel="Generate tests"
                onAction={generate}
                className="py-12"
              />
            </motion.div>
          )}

          {phase === "thinking" && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <ol className="space-y-2" aria-live="polite">
                {steps.map((label, i) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    {i < step ? (
                      <Check className="size-4 text-success" />
                    ) : i === step ? (
                      <LoaderCircle className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="size-4 rounded-full border border-border" />
                    )}
                    <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{label}…</span>
                  </li>
                ))}
              </ol>
              <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4" aria-hidden>
                {[72, 48, 88, 64, 40, 80, 56].map((width, i) => (
                  <div key={i} style={{ width: `${width}%`, marginLeft: i % 3 === 1 ? "1.5rem" : undefined }}>
                    <Shimmer className="h-3" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {(phase === "typing" || phase === "done") && result && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <ProgressRing
                  value={phase === "done" ? result.projectedCoverage : result.target.baseCoverage}
                  size={46}
                  stroke={4}
                  tone="success"
                  animateOnView={false}
                >
                  <span className="text-[10px] font-semibold text-foreground tabular-nums">
                    {phase === "done" ? result.projectedCoverage : result.target.baseCoverage}%
                  </span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <NumberTicker value={result.count} /> {result.count === 1 ? "test" : "tests"} for{" "}
                    <span className="font-mono text-[13px]">{result.target.symbol}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coverage {result.target.baseCoverage}% → {result.projectedCoverage}% (projected) ·{" "}
                    {TEST_TYPES.filter((t) => result.byType[t.value])
                      .map((t) => `${result.byType[t.value]} ${t.label.toLowerCase()}`)
                      .join(" · ")}
                  </p>
                </div>
                {phase === "typing" && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary">
                    <LoaderCircle className="size-3.5 animate-spin" /> Writing tests…
                  </span>
                )}
              </div>
              {stale && (
                <p className="rounded-lg border border-warning/25 bg-warning/8 px-3 py-2 text-xs text-warning">
                  Settings changed since this file was generated — regenerate to update it.
                </p>
              )}
              <CodeBlock
                code={shownCode}
                language={result.target.language}
                filename={result.target.file}
                bodyClassName="max-h-[520px]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  )
}
