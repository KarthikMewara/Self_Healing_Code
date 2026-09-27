import { Clock3, GitCommitHorizontal, HeartPulse, History, MousePointerClick } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Panel } from "@/components/app/panel"
import { useNow } from "@/components/insights/hooks"
import { formatMs, formatRelative, formatStamp } from "@/components/insights/format"
import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { RunRecord } from "@/services/mock/testing"

function triggerIcon(trigger: string) {
  if (trigger.startsWith("Heal")) return HeartPulse
  if (trigger.startsWith("CI")) return GitCommitHorizontal
  if (trigger.startsWith("Manual")) return MousePointerClick
  return Clock3
}

interface RunHistoryProps {
  history: RunRecord[]
  onSelectSuite: (suiteId: string) => void
}

export function RunHistory({ history, onSelectSuite }: RunHistoryProps) {
  const now = useNow(30_000)
  const newestLive = history.find((r) => r.at)?.id

  return (
    <Panel
      title="Run history"
      description="Newest first · heal verifications, CI and your manual runs"
      icon={History}
      padded={false}
    >
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs text-muted-foreground">Suite</TableHead>
            <TableHead className="text-xs text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs text-muted-foreground">Results</TableHead>
            <TableHead className="text-right text-xs text-muted-foreground">Duration</TableHead>
            <TableHead className="text-xs text-muted-foreground">Trigger</TableHead>
            <TableHead className="pr-4 text-right text-xs text-muted-foreground">Ran</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {history.map((run) => {
              const total = run.passCount + run.failCount
              const passPct = total ? (run.passCount / total) * 100 : 0
              const Icon = triggerIcon(run.trigger)
              const select = () => onSelectSuite(run.suiteId)
              return (
                <motion.tr
                  key={run.id}
                  layout="position"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                  tabIndex={0}
                  aria-label={`Show ${run.name} in the runner`}
                  onClick={select}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      select()
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60",
                    run.id === newestLive && "bg-primary/5 shadow-[inset_2px_0_0_var(--primary)]",
                  )}
                >
                  <TableCell className="py-2.5 pl-4">
                    <span className="font-medium text-foreground">{run.name}</span>
                    {run.id === newestLive && (
                      <span className="ml-2 rounded-full bg-primary/12 px-1.5 text-[10px] font-medium text-primary">New</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={run.status === "passed" ? "success" : run.status === "failed" ? "danger" : "pending"}>
                      {run.status === "passed" ? "Passed" : run.status === "failed" ? "Failed" : "Running"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-1.5 w-20 gap-[2px] overflow-hidden rounded-full" aria-hidden>
                        <span className={cn("h-full rounded-l-full bg-success", !run.failCount && "rounded-r-full")} style={{ width: `${passPct}%` }} />
                        {run.failCount > 0 && <span className="h-full flex-1 rounded-r-full bg-destructive" />}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {run.passCount} passed
                        {run.failCount > 0 && <span className="text-destructive"> · {run.failCount} failed</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatMs(run.durationMs)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="size-3.5" />
                      {run.trigger}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                    {run.at ? formatRelative(run.at, now) : formatStamp(run.ranAt)}
                  </TableCell>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Panel>
  )
}
