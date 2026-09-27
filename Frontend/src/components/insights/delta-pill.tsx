import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

interface DeltaPillProps {
  /** Signed change; the arrow follows the sign, the colour follows `positiveIsGood`. */
  value: number
  unit?: string
  positiveIsGood?: boolean
  label?: string
  className?: string
}

/** "↑ 17% vs prior 30 days" -- colour says good/bad, the arrow and text say direction. */
export function DeltaPill({ value, unit = "%", positiveIsGood = true, label, className }: DeltaPillProps) {
  const flat = Math.abs(value) < 0.05
  const good = (value > 0) === positiveIsGood
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
          flat ? "bg-muted text-muted-foreground" : good ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
        )}
      >
        <Icon className="size-3" aria-hidden />
        <span className="sr-only">{flat ? "No change" : value > 0 ? "Up" : "Down"}</span>
        {Math.abs(value)}
        {unit}
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  )
}
