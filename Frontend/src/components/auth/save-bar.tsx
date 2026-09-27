import { Check } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"

import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { StatusLabel, type ActionStatus } from "@/components/auth/status-button"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface SaveBarProps {
  dirty: boolean
  status: ActionStatus
  onCancel: () => void
  saveLabel?: string
  savingLabel?: string
  savedLabel?: string
  /** Shown on the left when there's nothing to save. */
  idleText?: ReactNode
  className?: string
}

/**
 * Footer for a Panel-wrapped form (it bleeds to the Panel's edges). Save stays
 * disabled until something changes; Cancel reverts. The left side narrates
 * the state: unsaved changes (with the shortcut), saved, or idle guidance.
 */
export function SaveBar({
  dirty,
  status,
  onCancel,
  saveLabel = "Save changes",
  savingLabel = "Saving…",
  savedLabel = "Saved",
  idleText = "No unsaved changes",
  className,
}: SaveBarProps) {
  const state = status === "success" ? "saved" : dirty ? "dirty" : "clean"

  return (
    <div
      className={cn(
        "-mx-4 mt-5 -mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-border/70 bg-muted/30 px-4 py-3",
        className,
      )}
    >
      <div role="status" className="relative min-h-5 min-w-0 flex-1 text-xs text-muted-foreground">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            {state === "saved" ? (
              <>
                <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.5} />
                <span className="font-medium text-success">Changes saved</span>
              </>
            ) : state === "dirty" ? (
              <>
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping-soft rounded-full bg-warning" />
                  <span className="relative size-2 rounded-full bg-warning" />
                </span>
                <span className="font-medium text-foreground">Unsaved changes</span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <span aria-hidden>·</span>
                  <Kbd>{MOD_KEY}</Kbd>
                  <Kbd>S</Kbd>
                  <span>to save</span>
                </span>
              </>
            ) : (
              idleText
            )}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={!dirty || status !== "idle"}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={status === "idle" && !dirty}
          aria-busy={status === "loading" || undefined}
          className={cn(
            "relative min-w-[8.5rem]",
            status === "success" && "bg-success text-success-foreground hover:bg-success",
          )}
        >
          <StatusLabel status={status} loadingLabel={savingLabel} successLabel={savedLabel}>
            {saveLabel}
          </StatusLabel>
        </Button>
      </div>
    </div>
  )
}
