import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  /** Right side of the header: buttons, filters, links. */
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** Set false for edge-to-edge content like tables. */
  padded?: boolean
  id?: string
}

/** The standard glass surface for app content, with an optional header row. */
export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  padded = true,
  id,
}: PanelProps) {
  return (
    <section id={id} className={cn("glass relative overflow-hidden rounded-xl border border-border", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(padded && "p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
