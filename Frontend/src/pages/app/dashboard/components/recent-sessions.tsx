import { ArrowUpRight, History } from "lucide-react"
import { motion } from "motion/react"
import { Link, useNavigate } from "react-router-dom"

import { Panel } from "@/components/app/panel"
import { useNow } from "@/components/insights/hooks"
import { formatDuration, formatMs, formatRelative, formatStamp } from "@/components/insights/format"
import { StatusBadge, type StatusTone } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { LANGUAGE_COLORS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { EASE_OUT } from "@/lib/motion"
import { RECENT_SESSIONS, SESSION_META } from "@/services/mock/dashboard"
import type { SessionStatus } from "@/types/domain"

const STATUS: Record<SessionStatus, { tone: StatusTone; label: string }> = {
  resolved: { tone: "success", label: "Resolved" },
  failed: { tone: "danger", label: "Failed" },
  in_progress: { tone: "pending", label: "Healing" },
}

interface Row {
  id: string
  project: string
  language: string
  errorSummary: string
  status: SessionStatus
  timeToFix: string
  when: string
  detail: string
  /** A heal that really ran in this browser session (not preview data). */
  real?: boolean
  to: string
}

export function RecentSessions() {
  const navigate = useNavigate()
  const { completed, result } = useDebugWorkspace()
  const now = useNow(30_000, completed.length > 0)

  const realRows: Row[] = completed.slice(0, 2).map((heal) => ({
    id: heal.sessionId,
    project: "AI Debugger",
    language: heal.language,
    errorSummary: heal.errorSummary,
    status: heal.outcome,
    timeToFix: formatMs(heal.durationMs),
    when: formatRelative(heal.finishedAt, now),
    detail: heal.outcome === "resolved" ? "Real run from this browser session" : "Real run · needs review",
    real: true,
    to: heal.sessionId === result?.session_id ? "/self-healing" : `/history?session=${heal.sessionId}`,
  }))

  const previewRows: Row[] = RECENT_SESSIONS.map((s) => {
    const meta = SESSION_META[s.id]
    return {
      id: s.id,
      project: s.projectName,
      language: s.language,
      errorSummary: s.errorSummary,
      status: s.status,
      timeToFix: meta?.durationSec != null ? formatDuration(meta.durationSec) : "—",
      when: formatStamp(s.createdAt),
      detail: meta?.outcome ?? "",
      to: `/history?session=${s.id}`,
    }
  })

  const rows = [...realRows, ...previewRows]

  return (
    <Panel
      title="Recent sessions"
      description="Open any session to see its trace, patch and tests"
      icon={History}
      padded={false}
      className="h-full"
      action={
        <Button variant="ghost" size="sm" render={<Link to="/history" />}>
          View all <ArrowUpRight />
        </Button>
      }
    >
      <Table className="min-w-[680px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs text-muted-foreground">Session</TableHead>
            <TableHead className="text-xs text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-xs text-muted-foreground">Time to fix</TableHead>
            <TableHead className="text-right text-xs text-muted-foreground">When</TableHead>
            <TableHead className="w-10 pr-4">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const lang = toLanguageKey(row.language)
            const status = STATUS[row.status]
            const open = () => navigate(row.to)
            return (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE_OUT }}
                tabIndex={0}
                role="link"
                aria-label={`Open ${row.id}: ${row.errorSummary}`}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    open()
                  }
                }}
                className="group/row cursor-pointer border-b transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:shadow-[inset_2px_0_0_var(--primary)]"
              >
                <TableCell className="max-w-[380px] py-3 pl-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: LANGUAGE_COLORS[lang] }}
                      title={LANGUAGE_LABELS[lang]}
                    />
                    <span className="font-medium text-foreground">{row.project}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{row.id}</span>
                    {row.real && (
                      <span className="rounded-full bg-primary/12 px-1.5 text-[10px] font-medium text-primary">Real run</span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{row.errorSummary}</p>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    <p className="max-w-[180px] truncate text-[11px] text-muted-foreground">{row.detail}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {row.timeToFix}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{row.when}</TableCell>
                <TableCell className="pr-4">
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover/row:translate-x-0 group-hover/row:opacity-100 group-focus-visible/row:translate-x-0 group-focus-visible/row:opacity-100"
                  />
                </TableCell>
              </motion.tr>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}
