import type { LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { NumberTicker } from "@/components/fx/number-ticker"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { EASE_OUT } from "@/lib/motion"

interface SavingsTileProps {
  label: string
  icon: LucideIcon
  /** Any CSS colour. */
  color: string
  value: number
  format?: (value: number) => string
  prefix?: string
  suffix?: string
  caption: string
  /** How much of the projection is already applied (0..1) and how to say it. */
  applied: number
  appliedLabel: string
}

/** Projected-savings tile with a meter for the share that's already applied. */
export function SavingsTile({
  label,
  icon: Icon,
  color,
  value,
  format,
  prefix,
  suffix,
  caption,
  applied,
  appliedLabel,
}: SavingsTileProps) {
  return (
    <SpotlightCard glow={color} className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            <NumberTicker value={value} format={format} prefix={prefix} suffix={suffix} duration={1.1} />
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklch, ${color} 14%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-auto space-y-1.5 pt-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Applied so far</span>
          <span className="tabular-nums">{appliedLabel}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(1, applied)) * 100}%` }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        </div>
      </div>
    </SpotlightCard>
  )
}
