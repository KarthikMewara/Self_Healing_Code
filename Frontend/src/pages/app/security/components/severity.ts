import { Info, ShieldAlert, ShieldX, TriangleAlert, type LucideIcon } from "lucide-react"

import type { Severity } from "@/types/domain"

/**
 * Severity is a status scale, so it uses the status colours (never the
 * categorical chart palette) and always travels with an icon + label.
 * "High" sits between destructive and warning.
 */
export const SEVERITY: Record<Severity, { label: string; icon: LucideIcon; color: string; sla: string; rank: number }> = {
  critical: { label: "Critical", icon: ShieldX, color: "var(--destructive)", sla: "fix within 24h", rank: 0 },
  high: {
    label: "High",
    icon: ShieldAlert,
    color: "color-mix(in oklch, var(--destructive) 50%, var(--warning))",
    sla: "fix within 7 days",
    rank: 1,
  },
  medium: { label: "Medium", icon: TriangleAlert, color: "var(--warning)", sla: "fix within 30 days", rank: 2 },
  low: { label: "Low", icon: Info, color: "var(--primary)", sla: "next planned sprint", rank: 3 },
}

export function tint(color: string, pct = 14) {
  return `color-mix(in oklch, ${color} ${pct}%, transparent)`
}
