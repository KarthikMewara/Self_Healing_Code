import { LoaderCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ComponentProps, ReactNode } from "react"

import { GlowButton } from "@/components/fx/glow-button"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

export type ActionStatus = "idle" | "loading" | "success"

/** A check mark that draws itself in with a little bounce. */
export function DrawnCheck({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      initial={{ scale: 0.4 }}
      animate={{ scale: 1 }}
      transition={{ ...SPRING_BOUNCY, delay }}
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.36, ease: EASE_OUT, delay: delay + 0.06 }}
      />
    </motion.svg>
  )
}

interface StatusLabelProps {
  status: ActionStatus
  children: ReactNode
  loadingLabel?: ReactNode
  successLabel?: ReactNode
  /** Shown before the label while idle (a brand mark, an icon). */
  icon?: ReactNode
  /** Shown after the label while idle (usually an arrow). */
  trailingIcon?: ReactNode
  className?: string
}

/**
 * Button content that morphs idle -> spinner -> drawn check. Each state slides
 * and un-blurs in while the previous one lifts out, so the button never
 * changes size or jumps.
 */
export function StatusLabel({
  status,
  children,
  loadingLabel = "Working…",
  successLabel = "Done",
  icon,
  trailingIcon,
  className,
}: StatusLabelProps) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
        className={cn("inline-flex items-center justify-center gap-2", className)}
      >
        {status === "loading" ? (
          <>
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {loadingLabel}
          </>
        ) : status === "success" ? (
          <>
            <DrawnCheck />
            {successLabel}
          </>
        ) : (
          <>
            {icon}
            {children}
            {trailingIcon}
          </>
        )}
      </motion.span>
    </AnimatePresence>
  )
}

interface SubmitButtonProps extends Omit<ComponentProps<typeof GlowButton>, "children"> {
  status: ActionStatus
  children: ReactNode
  loadingLabel: string
  successLabel: string
  trailingIcon?: ReactNode
}

/**
 * The primary submit for auth screens: brand GlowButton whose content morphs
 * to a spinner and then a check, while a success-green wash fades over it.
 * Status changes are also announced to screen readers.
 */
export function SubmitButton({
  status,
  children,
  loadingLabel,
  successLabel,
  trailingIcon,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <>
      <GlowButton
        type="submit"
        data-status={status}
        aria-busy={status === "loading" || undefined}
        className={cn(
          "h-10 w-full rounded-[10px] text-sm font-semibold",
          // Success wash: sits above the gradient and the light sweep, below the label.
          "after:pointer-events-none after:absolute after:inset-0 after:bg-success after:opacity-0 after:transition-opacity after:duration-500",
          "data-[status=success]:after:opacity-100",
          "data-[status=success]:shadow-[0_0_0_1px_color-mix(in_oklch,var(--success)_60%,transparent),0_12px_36px_-10px_var(--success)]",
          className,
        )}
        {...props}
      >
        <StatusLabel status={status} loadingLabel={loadingLabel} successLabel={successLabel} trailingIcon={trailingIcon}>
          {children}
        </StatusLabel>
      </GlowButton>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "loading" ? loadingLabel : status === "success" ? successLabel : ""}
      </span>
    </>
  )
}
