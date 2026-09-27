import { Circle, CircleCheck, CircleX, FileCode2, LoaderCircle, WandSparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { formatMs } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { SuiteFile, SuiteTest } from "@/services/mock/testing"

import type { TestState } from "./run-plan"

const STATE_LABEL: Record<TestState, string> = {
  pending: "Pending",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
}

export function TestStateIcon({ state }: { state: TestState }) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={SPRING}
          className="flex items-center justify-center"
        >
          {state === "pending" && <Circle className="size-3.5 text-muted-foreground/45" />}
          {state === "running" && <LoaderCircle className="size-3.5 animate-spin text-primary" />}
          {state === "passed" && <CircleCheck className="size-4 text-success" />}
          {state === "failed" && <CircleX className="size-4 text-destructive" />}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{STATE_LABEL[state]}</span>
    </span>
  )
}

interface TestCaseListProps {
  files: SuiteFile[]
  states: Map<string, { state: TestState; ms?: number }>
  doneFiles: Set<number>
  failuresOnly: boolean
  onHeal: (test: SuiteTest) => void
  className?: string
}

/** Named tests grouped by file; each row ticks pending → running → passed/failed. */
export function TestCaseList({ files, states, doneFiles, failuresOnly, onHeal, className }: TestCaseListProps) {
  const visibleFiles = files
    .map((file, index) => ({
      file,
      index,
      tests: failuresOnly ? file.tests.filter((t) => states.get(t.id)?.state === "failed") : file.tests,
    }))
    .filter((f) => f.tests.length > 0)

  return (
    <div
      className={cn(
        "scrollbar-thin h-72 min-w-0 overflow-auto rounded-lg border border-border bg-card/50 p-1.5",
        className,
      )}
    >
      {visibleFiles.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground">No failing tests in this run.</p>
      )}
      {visibleFiles.map(({ file, index, tests }) => {
        const fileFailed = file.tests.some((t) => states.get(t.id)?.state === "failed")
        const fileDone = doneFiles.has(index)
        return (
          <div key={file.path} className="mb-1.5 last:mb-0">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{file.path}</span>
              {fileDone && (
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium",
                    fileFailed ? "text-destructive" : "text-success",
                  )}
                >
                  {fileFailed ? "failed" : "passed"}
                </span>
              )}
            </div>
            <ul>
              {tests.map((test) => {
                const entry = states.get(test.id)
                const state = entry?.state ?? "pending"
                return (
                  <li
                    key={test.id}
                    className={cn(
                      "rounded-md px-2 py-1.5 transition-colors duration-300",
                      state === "running" && "bg-primary/8",
                      state === "failed" && "bg-destructive/6",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <TestStateIcon state={state} />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px]",
                          state === "pending" ? "text-muted-foreground" : "text-foreground",
                        )}
                        title={test.name}
                      >
                        {test.name}
                      </span>
                      {test.generated && (
                        <span className="shrink-0 rounded-full bg-info/12 px-1.5 text-[10px] font-medium text-info">AI</span>
                      )}
                      {test.behavior === "flaky" && (
                        <span className="shrink-0 rounded-full bg-warning/12 px-1.5 text-[10px] font-medium text-warning">
                          flaky
                        </span>
                      )}
                      <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                        {entry?.ms != null ? formatMs(entry.ms) : ""}
                      </span>
                    </div>
                    {state === "failed" && test.failure?.[0] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <p className="mt-1 ml-6 truncate font-mono text-[11px] text-destructive" title={test.failure[0]}>
                          {test.failure[0]}
                        </p>
                        {test.exampleId && (
                          <Button size="xs" variant="outline" className="mt-1.5 ml-6" onClick={() => onHeal(test)}>
                            <WandSparkles /> Heal with AI
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </li>
                )
              })}
              {!failuresOnly && file.extra > 0 && (
                <li className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                  <TestStateIcon state={fileDone ? "passed" : "pending"} />
                  <span>
                    +{file.extra} more {file.extra === 1 ? "test" : "tests"}
                  </span>
                  {fileDone && <span className="ml-auto font-mono tabular-nums">{formatMs(file.extraMs)}</span>}
                </li>
              )}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
