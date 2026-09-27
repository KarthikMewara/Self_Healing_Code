import { CircleCheck, CircleX, ListFilter, Play, RotateCcw, Square, Target, TerminalSquare } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

import { Panel } from "@/components/app/panel"
import { ProgressRing } from "@/components/app/progress-ring"
import { NumberTicker } from "@/components/fx/number-ticker"
import { useNow } from "@/components/insights/hooks"
import { formatMs, formatRelative, formatStamp } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LANGUAGE_COLORS } from "@/lib/highlight"
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { findSuite, SUITES, suiteTestCount, type LogLine, type SuiteTest } from "@/services/mock/testing"

import { deriveRunView, suiteFiles } from "./run-plan"
import { TerminalLog } from "./terminal-log"
import { TestCaseList } from "./test-case-list"
import type { TestRunnerApi } from "./use-test-runner"

interface TestRunnerViewProps {
  suiteId: string
  onSuiteChange: (id: string) => void
  runner: TestRunnerApi
  added: Record<string, SuiteTest[]>
  onHeal: (test: SuiteTest) => void
}

export function TestRunnerView({ suiteId, onSuiteChange, runner, added, onHeal }: TestRunnerViewProps) {
  const suite = findSuite(suiteId)
  const { run } = runner
  const busy = run?.status === "running"
  const active = run && run.suite.id === suiteId ? run : null
  const extra = added[suiteId] ?? []
  const files = active ? active.files : suiteFiles(suite, extra)
  const total = active ? active.totals.total : suiteTestCount(suite, extra)
  const view = active ? deriveRunView(active.frames, active.index) : null
  const [failuresOnly, setFailuresOnly] = useState(false)

  const idleLog: LogLine[] = [
    { text: `$ ${suite.command}`, tone: "cmd" },
    { text: "" },
    { text: `Ready · ${total} tests in ${files.length} files (${suite.frameworkLabel}).`, tone: "muted" },
    { text: "Press “Run now” to start a simulated run.", tone: "muted" },
  ]
  const logs: LogLine[] = view
    ? [
        ...view.logs,
        ...(active?.status === "cancelled"
          ? [
              { text: "^C", tone: "warn" as const },
              { text: "Run cancelled — partial results above.", tone: "warn" as const },
            ]
          : []),
      ]
    : idleLog

  const progress = view?.progress ?? 0
  const done = active?.status === "done"
  const failed = view?.failed ?? 0
  const passed = view?.passed ?? 0

  const startRun = () => {
    setFailuresOnly(false)
    runner.start(suite, extra)
  }

  return (
    <Panel
      title="Test runner"
      description={`${suite.frameworkLabel} · ${total} tests · simulated run`}
      icon={TerminalSquare}
      className="min-w-0"
    >
      <div className="space-y-4">
        {/* Toolbar lives in the body (not the header) so it can wrap on phones. */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={suiteId}
            onValueChange={(value) => value && onSuiteChange(value)}
            items={SUITES.map((s) => ({ value: s.id, label: s.name }))}
            disabled={busy}
          >
            <SelectTrigger size="sm" className="w-full sm:w-[270px]" aria-label="Test suite">
              <SelectValue>{(value: string) => findSuite(value).name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUITES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[s.language] }} />
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {busy ? (
            <Button size="sm" variant="outline" onClick={runner.cancel}>
              <Square className="fill-current" /> Cancel
            </Button>
          ) : (
            <Button size="sm" onClick={startRun}>
              {done ? <RotateCcw /> : <Play />} {done ? "Run again" : "Run now"}
            </Button>
          )}
          <code className="ml-auto hidden truncate font-mono text-[11px] text-muted-foreground xl:block">
            $ {suite.command}
          </code>
        </div>

        {/* Counters + progress */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <CircleCheck className="size-4 text-success" />
              <NumberTicker value={passed} duration={0.4} className="font-semibold" />
              <span className="text-muted-foreground">passed</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <CircleX className={cn("size-4", failed ? "text-destructive" : "text-muted-foreground")} />
              <NumberTicker value={failed} duration={0.4} className="font-semibold" />
              <span className="text-muted-foreground">failed</span>
            </span>
            <span className="text-muted-foreground tabular-nums">of {total}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
              {active ? `${Math.round(progress)}%` : "idle"}
            </span>
          </div>
          <div
            className="relative h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Run progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                failed
                  ? "bg-gradient-to-r from-warning to-destructive"
                  : done
                    ? "bg-success"
                    : "bg-gradient-to-r from-primary to-info",
              )}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={SPRING_SOFT}
            />
            {busy && (
              <span
                aria-hidden
                className="animate-shimmer-sweep absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              />
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <TerminalLog title={`${suite.project} — ${suite.command.split(" ")[0]}`} lines={logs} running={busy && !!active} />
          <TestCaseList
            files={files}
            states={view?.tests ?? new Map()}
            doneFiles={view?.doneFiles ?? new Set()}
            failuresOnly={failuresOnly}
            onHeal={onHeal}
          />
        </div>

        <AnimatePresence initial={false}>
          {done && active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5",
                active.totals.failed
                  ? "border-destructive/25 bg-destructive/6"
                  : "border-success/25 bg-success/6",
              )}
            >
              {active.totals.failed ? (
                <CircleX className="size-5 shrink-0 text-destructive" />
              ) : (
                <CircleCheck className="size-5 shrink-0 text-success" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-foreground">
                  {active.totals.failed
                    ? `${active.totals.failed} of ${active.totals.total} tests failed`
                    : `All ${active.totals.total} tests passed`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {active.totals.files} files · {formatMs(active.totals.durationMs)} reported by {suite.frameworkLabel} · run #
                  {active.runNumber} this session
                </p>
              </div>
              {active.totals.failed > 0 && (
                <Button
                  size="sm"
                  variant={failuresOnly ? "secondary" : "outline"}
                  aria-pressed={failuresOnly}
                  onClick={() => setFailuresOnly((v) => !v)}
                >
                  <ListFilter /> {failuresOnly ? "Show all tests" : "Failures only"}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Pass rate + suites overview
// ---------------------------------------------------------------------------

interface PassRatePanelProps {
  suiteId: string
  onSuiteChange: (id: string) => void
  runner: TestRunnerApi
}

export function PassRatePanel({ suiteId, onSuiteChange, runner }: PassRatePanelProps) {
  const now = useNow(30_000)
  const suite = findSuite(suiteId)
  const { run, history } = runner
  const busy = run?.status === "running"
  const live = run && run.suite.id === suiteId && run.status !== "cancelled" ? run : null
  const liveView = live ? deriveRunView(live.frames, live.index) : null
  const last = history.find((r) => r.suiteId === suiteId)

  const passed = liveView ? liveView.passed : (last?.passCount ?? 0)
  const failedCount = liveView ? liveView.failed : (last?.failCount ?? 0)
  const denominator = passed + failedCount
  const rate = denominator ? (passed / denominator) * 100 : 0
  const tone = failedCount === 0 ? "success" : rate >= 97 ? "warning" : "danger"
  const flaky = suite.files.flatMap((f) => f.tests).filter((t) => t.behavior === "flaky").length
  const when = last ? (last.at ? formatRelative(last.at, now) : formatStamp(last.ranAt)) : "never"

  return (
    <Panel title="Pass rate" description={suite.name} icon={Target} className="h-full">
      <div className="flex flex-col items-center gap-2 py-1">
        <ProgressRing value={rate} size={148} stroke={10} tone={tone} animateOnView={false}>
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              <NumberTicker value={rate} decimals={1} suffix="%" duration={0.6} />
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {passed}/{denominator || suiteTestCount(suite)} tests
            </p>
          </div>
        </ProgressRing>
        <p className="text-xs text-muted-foreground">
          {live ? (live.status === "running" ? "Live · this run" : "This run") : `Last run · ${when}`}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-mono text-foreground tabular-nums">
            {live?.status === "done" ? formatMs(live.totals.durationMs) : last ? formatMs(last.durationMs) : "—"}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <dt className="text-muted-foreground">Flaky tests</dt>
          <dd className="text-foreground tabular-nums">{flaky}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border/70 pt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">All suites · last run</p>
        <ul className="space-y-0.5">
          {SUITES.map((s) => {
            const record = history.find((r) => r.suiteId === s.id)
            const pct = record ? (record.passCount / Math.max(1, record.passCount + record.failCount)) * 100 : 0
            const ok = record && record.failCount === 0
            return (
              <li key={s.id}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        disabled={busy}
                        aria-pressed={s.id === suiteId}
                        onClick={() => onSuiteChange(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                          s.id === suiteId && "bg-muted/70",
                        )}
                      />
                    }
                  >
                    {ok ? (
                      <CircleCheck className="size-3.5 shrink-0 text-success" />
                    ) : (
                      <CircleX className="size-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-foreground">{s.name}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {record ? `${record.passCount} passed · ${record.failCount} failed · ${formatMs(record.durationMs)}` : "No runs yet"}
                  </TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )
}
