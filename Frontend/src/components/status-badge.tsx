import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "danger" | "info" | "pending" | "neutral"

const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success dark:bg-success/20",
  warning: "bg-warning/10 text-warning dark:bg-warning/20",
  danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  info: "bg-info/10 text-info dark:bg-info/20",
  pending: "bg-muted text-muted-foreground",
  neutral: "bg-secondary text-secondary-foreground",
}

const TONE_ICON: Record<StatusTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  pending: Loader2,
  neutral: Circle,
}

interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  const Icon = TONE_ICON[tone]
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
    >
      <Icon className={cn("size-3", tone === "pending" && "animate-spin")} />
      {children}
    </span>
  )
}

export function severityTone(severity: "critical" | "high" | "medium" | "low"): StatusTone {
  if (severity === "critical" || severity === "high") return "danger"
  if (severity === "medium") return "warning"
  return "info"
}
