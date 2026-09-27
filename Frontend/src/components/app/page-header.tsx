import type { LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"

import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Tone = "primary" | "info" | "success" | "warning" | "danger"

const TONE: Record<Tone, string> = {
  primary: "from-primary/25 to-primary/5 text-primary ring-primary/25",
  info: "from-info/25 to-info/5 text-info ring-info/25",
  success: "from-success/25 to-success/5 text-success ring-success/25",
  warning: "from-warning/25 to-warning/5 text-warning ring-warning/25",
  danger: "from-destructive/25 to-destructive/5 text-destructive ring-destructive/25",
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  /** Small element rendered right after the title (e.g. <PreviewBadge />). */
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Consistent page title block: glowing icon tile, title, description, actions. */
export function PageHeader({ title, description, icon: Icon, tone = "primary", badge, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className={cn("flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <div
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
              TONE[tone],
            )}
          >
            <Icon className="size-5" />
            <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-current opacity-20 blur-lg" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
