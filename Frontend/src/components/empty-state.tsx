import type { LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  className?: string
  children?: ReactNode
}

/** Friendly empty state: floating icon with a soft pulse halo, copy, actions. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
  children,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className={cn(
        "glass relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      <div aria-hidden className="bg-dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="animate-float-y relative">
        <span aria-hidden className="animate-ping-soft absolute inset-0 rounded-2xl bg-primary/20" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-info/15 ring-1 ring-primary/25">
          <Icon className="size-6 text-primary" />
        </div>
      </div>
      <div className="relative space-y-1.5">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      {(actionLabel || secondaryLabel) && (
        <div className="relative mt-1 flex flex-wrap justify-center gap-2">
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
          {secondaryLabel && onSecondary && (
            <Button variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
