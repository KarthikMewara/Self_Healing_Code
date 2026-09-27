import { motion, useInView } from "motion/react"
import { useRef, type ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface BarListItem {
  key: string
  label: ReactNode
  value: number
  /** Formatted value at the end of the row; defaults to the raw number. */
  display?: ReactNode
  /** A lighter range drawn behind the bar, e.g. the p95 behind an average. */
  ghost?: number
  /** Small extras after the label (chips, language dots). */
  meta?: ReactNode
  icon?: ReactNode
  /** Any CSS colour; defaults to the primary accent. */
  color?: string
  tooltip?: ReactNode
}

interface BarListProps {
  items: BarListItem[]
  /** Value that maps to a full-width bar; defaults to the largest value. */
  max?: number
  /** Makes rows toggle buttons (e.g. to filter by that row). */
  onSelect?: (key: string) => void
  activeKey?: string | null
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/**
 * Horizontal bars that grow in (staggered) the first time they scroll into
 * view and glide to new widths when values change. Each row can carry a
 * tooltip and/or act as a filter toggle.
 */
export function BarList({
  items,
  max,
  onSelect,
  activeKey,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: BarListProps) {
  const ref = useRef<HTMLUListElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const top = max ?? Math.max(1, ...items.map((item) => Math.max(item.value, item.ghost ?? 0)))

  return (
    <ul ref={ref} aria-label={ariaLabel} className={cn("space-y-1.5", className)}>
      {items.map((item, index) => {
        const color = item.color ?? "var(--primary)"
        const pct = Math.max(0, Math.min(100, (item.value / top) * 100))
        const ghostPct = item.ghost ? Math.max(0, Math.min(100, (item.ghost / top) * 100)) : 0
        const dimmed = activeKey != null && activeKey !== item.key
        const interactive = Boolean(onSelect || item.tooltip)
        const rowClass = cn(
          "group/bar -mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-[background-color,opacity] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          interactive && "hover:bg-muted/50",
          onSelect && "cursor-pointer",
          dimmed && "opacity-45",
        )

        const body = (
          <>
            <span className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.meta}
              </span>
              <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                {item.display ?? item.value.toLocaleString()}
              </span>
            </span>
            <span className={cn("relative block overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2")}>
              {ghostPct > 0 && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 block rounded-full"
                  style={{ background: `color-mix(in oklch, ${color} 24%, transparent)` }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${ghostPct}%` : 0 }}
                  transition={{ duration: 1.1, delay: 0.15 + index * 0.06, ease: EASE_OUT }}
                />
              )}
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 block rounded-full transition-[filter] duration-200 group-hover/bar:brightness-110"
                style={{
                  background: `linear-gradient(90deg, color-mix(in oklch, ${color} 45%, transparent), ${color})`,
                  boxShadow: `0 0 14px -3px color-mix(in oklch, ${color} 70%, transparent)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${pct}%` : 0 }}
                transition={{ duration: 0.9, delay: index * 0.06, ease: EASE_OUT }}
              />
            </span>
          </>
        )

        const trigger = onSelect ? (
          <button
            type="button"
            className={rowClass}
            aria-pressed={activeKey === item.key}
            onClick={() => onSelect(item.key)}
          />
        ) : (
          <div className={rowClass} tabIndex={item.tooltip ? 0 : undefined} />
        )

        return (
          <li key={item.key}>
            {item.tooltip ? (
              <Tooltip>
                <TooltipTrigger render={trigger}>{body}</TooltipTrigger>
                <TooltipContent side="top" align="start">
                  {item.tooltip}
                </TooltipContent>
              </Tooltip>
            ) : onSelect ? (
              <button
                type="button"
                className={rowClass}
                aria-pressed={activeKey === item.key}
                onClick={() => onSelect(item.key)}
              >
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
