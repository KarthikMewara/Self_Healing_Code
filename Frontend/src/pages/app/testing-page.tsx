import { FlaskConical, LoaderCircle, Play, ShieldCheck, WandSparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { formatMs } from "@/components/insights/format"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { EASE_OUT } from "@/lib/motion"
import { INITIAL_GENERATOR, type GeneratorState } from "@/pages/app/testing/components/generator-state"
import { RegressionView } from "@/pages/app/testing/components/regression-view"
import { RunHistory } from "@/pages/app/testing/components/run-history"
import { TestGeneratorView } from "@/pages/app/testing/components/test-generator-view"
import { PassRatePanel, TestRunnerView } from "@/pages/app/testing/components/test-runner-view"
import { useRegressionRuns, useTestRunner, type ActiveRun } from "@/pages/app/testing/components/use-test-runner"
import { findSuite, SUITES, type GeneratedTests, type SuiteTest } from "@/services/mock/testing"

type Tab = "runner" | "generator" | "regression"

const TABS: Tab[] = ["runner", "generator", "regression"]
const toTab = (value: string | null): Tab => (TABS.includes(value as Tab) ? (value as Tab) : "runner")

export default function TestingPage() {
  const ready = usePreviewLoad("testing")
  const navigate = useNavigate()
  const { loadExample } = useDebugWorkspace()
  const [params, setParams] = useSearchParams()
  const tab = toTab(params.get("tab"))
  // Deep links such as /testing?suite=routing-integration open that suite.
  const [suiteId, setSuiteId] = useState(() => {
    const requested = params.get("suite")
    return SUITES.some((s) => s.id === requested) ? (requested as string) : SUITES[0].id
  })
  const [added, setAdded] = useState<Record<string, SuiteTest[]>>({})
  const [generator, setGenerator] = useState<GeneratorState>(INITIAL_GENERATOR)

  const setTab = useCallback(
    (next: Tab) => setParams(next === "runner" ? {} : { tab: next }, { replace: true }),
    [setParams],
  )

  const heal = useCallback(
    (exampleId: string, label: string) => {
      loadExample(exampleId)
      navigate("/debugger")
      toast.success("Loaded into AI Debugger", { description: `${label} — run the heal to get a tested fix.` })
    },
    [loadExample, navigate],
  )

  const onRunFinished = useCallback(
    (run: ActiveRun) => {
      const { totals, suite, failures } = run
      if (!totals.failed) {
        toast.success(`${suite.name} passed`, {
          description: `${totals.passed}/${totals.total} tests · ${formatMs(totals.durationMs)}`,
        })
        return
      }
      const first = failures[0]
      toast.error(`${totals.failed} ${totals.failed === 1 ? "test" : "tests"} failed in ${suite.name}`, {
        description: first?.name,
        action: first?.exampleId
          ? { label: "Heal with AI", onClick: () => heal(first.exampleId as string, first.name) }
          : undefined,
      })
    },
    [heal],
  )

  const runner = useTestRunner(onRunFinished)
  const regression = useRegressionRuns()
  const { start } = runner
  const busy = runner.run?.status === "running"

  const patchGenerator = useCallback(
    (patch: Partial<GeneratorState>) => setGenerator((prev) => ({ ...prev, ...patch })),
    [],
  )

  const runSuite = useCallback(
    (id: string, tests: SuiteTest[]) => {
      setSuiteId(id)
      setTab("runner")
      start(findSuite(id), tests)
    },
    [setTab, start],
  )

  const addToSuite = (result: GeneratedTests) => {
    const target = result.target.suiteId
    const suite = findSuite(target)
    const existing = added[target] ?? []
    const fresh = result.names
      .filter((name) => !existing.some((t) => t.name === name))
      .map<SuiteTest>((name, i) => ({
        id: `gen-${target}-${existing.length + i}`,
        name,
        ms: 3 + ((name.length * 7) % 38),
        generated: true,
      }))
    patchGenerator({ added: true })
    if (!fresh.length) {
      toast.info(`Those tests are already in ${suite.name}`)
      return
    }
    const next = [...existing, ...fresh]
    setAdded((prev) => ({ ...prev, [target]: next }))
    toast.success(`Added ${fresh.length} ${fresh.length === 1 ? "test" : "tests"} to ${suite.name}`, {
      description: "They run with the suite from now on, tagged AI.",
      action: { label: "Run suite", onClick: () => runSuite(target, next) },
    })
  }

  const selectSuite = (id: string) => {
    if (busy) {
      toast.info("Wait for the current run to finish, or cancel it first")
      return
    }
    setSuiteId(id)
  }

  const runProgress = runner.run ? Math.round(runner.run.frames[runner.run.index - 1]?.progress ?? 0) : 0
  const failingRegressions = regression.rows.filter((r) => r.lastStatus === "failed").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testing"
        description="Run suites, generate tests for healed code, and keep every fix guarded by a regression test."
        icon={FlaskConical}
        tone="success"
        badge={<PreviewBadge />}
      />

      {!ready ? (
        <PageSkeleton layout="table" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1 py-0.5">
              <SegmentedControl<Tab>
                value={tab}
                onChange={setTab}
                aria-label="Testing tools"
                options={[
                  { value: "runner", label: "Test runner", icon: <Play /> },
                  { value: "generator", label: "Test generator", icon: <WandSparkles /> },
                  {
                    value: "regression",
                    label: (
                      <>
                        Regression
                        {failingRegressions > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-1.5 text-[10px] text-destructive tabular-nums">
                            <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
                            {failingRegressions}
                            <span className="sr-only"> failing</span>
                          </span>
                        )}
                      </>
                    ),
                    icon: <ShieldCheck />,
                  },
                ]}
              />
            </div>
            <AnimatePresence>
              {busy && tab !== "runner" && runner.run && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setTab("runner")}
                  className="inline-flex h-7 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Running {runner.run.suite.project} · {runProgress}%
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="space-y-4"
            >
              {tab === "runner" && (
                <>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <TestRunnerView
                      suiteId={suiteId}
                      onSuiteChange={setSuiteId}
                      runner={runner}
                      added={added}
                      onHeal={(test) => test.exampleId && heal(test.exampleId, test.name)}
                    />
                    <PassRatePanel suiteId={suiteId} onSuiteChange={selectSuite} runner={runner} />
                  </div>
                  <RunHistory history={runner.history} onSelectSuite={selectSuite} />
                </>
              )}
              {tab === "generator" && (
                <TestGeneratorView state={generator} onChange={patchGenerator} onAddToSuite={addToSuite} />
              )}
              {tab === "regression" && <RegressionView regression={regression} onHeal={heal} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
