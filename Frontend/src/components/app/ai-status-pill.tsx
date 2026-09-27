import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useNavigate } from "react-router-dom"

import { useDebugWorkspace } from "@/context/debug-workspace"
import { cn } from "@/lib/utils"

const STEP_LABEL = { retrieval: "Retrieving", analysis: "Analyzing", generation: "Generating", testing: "Testing" } as const

/**
 * Top-bar indicator of the AI's state (spec: idle / analyzing / healing),
 * driven by the live workspace. Clicking jumps to wherever that state lives.
 */
export function AiStatusPill({ className }: { className?: string }) {
  const { status, statusEvents } = useDebugWorkspace()
  const navigate = useNavigate()
  const last = statusEvents[statusEvents.length - 1]
  const stepIndex = last ? ["retrieval", "analysis", "generation", "testing"].indexOf(last.step) + 1 : 0

  const content =
    status === "analyzing"
      ? {
          key: "analyzing",
          icon: <Loader2 className="size-3.5 animate-spin" />,
          label: last ? `${STEP_LABEL[last.step]} · ${stepIndex}/4` : "Starting…",
          className: "border-info/30 bg-info/12 text-info",
          to: "/debugger",
        }
      : status === "complete"
        ? {
            key: "complete",
            icon: <CheckCircle2 className="size-3.5" />,
            label: "Fix ready",
            className: "border-success/30 bg-success/12 text-success",
            to: "/self-healing",
          }
        : status === "error"
          ? {
              key: "error",
              icon: <AlertTriangle className="size-3.5" />,
              label: "Needs review",
              className: "border-destructive/30 bg-destructive/12 text-destructive",
              to: "/self-healing",
            }
          : {
              key: "idle",
              icon: (
                <span className="relative flex size-2">
                  <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-success" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
              ),
              label: "AI ready",
              className: "border-border bg-muted/40 text-muted-foreground",
              to: "/debugger",
            }

  return (
    <motion.button
      layout
      type="button"
      onClick={() => navigate(content.to)}
      aria-live="polite"
      className={cn(
        "relative inline-flex h-7 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-xs font-medium transition-colors",
        content.className,
        className,
      )}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 36 } }}
    >
      {status === "analyzing" && (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-info/15"
          initial={false}
          animate={{ width: `${(stepIndex / 4) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={content.key + content.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="relative inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          {content.icon}
          {content.label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
