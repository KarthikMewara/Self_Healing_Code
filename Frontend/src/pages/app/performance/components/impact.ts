import type { StatusTone } from "@/components/status-badge"
import type { ImpactLevel } from "@/types/domain"

export const IMPACT_LEVELS: ImpactLevel[] = ["high", "medium", "low"]

export const IMPACT: Record<ImpactLevel, { tone: StatusTone; label: string; color: string; rank: number }> = {
  high: { tone: "danger", label: "High", color: "var(--destructive)", rank: 0 },
  medium: { tone: "warning", label: "Medium", color: "var(--warning)", rank: 1 },
  low: { tone: "info", label: "Low", color: "var(--primary)", rank: 2 },
}
