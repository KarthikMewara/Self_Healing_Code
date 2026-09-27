import { motion } from "motion/react"
import { useState, type MouseEvent, type ReactNode } from "react"

import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface LegendItem {
  key: string
  label: string
  /** Any CSS colour -- the series colour. */
  color: string
  /** Mirrors the mark: rect for areas/bars/slices, line for lines. */
  shape?: "rect" | "line" | "dot"
  /** Optional direct label, e.g. the series total. */
  value?: ReactNode
}

interface LegendToggleProps {
  items: LegendItem[]
  hidden: ReadonlySet<string>
  onHiddenChange: (next: Set<string>) => void
  className?: string
  "aria-label"?: string
}

/**
 * A chart legend whose entries are toggle buttons: click to show/hide a
 * series, Alt-click to isolate it (Alt-click again to bring everything back).
 * The last visible series can't be hidden -- it shakes instead.
 */
export function LegendToggle({
  items,
  hidden,
  onHiddenChange,
  className,
  "aria-label": ariaLabel = "Toggle chart series",
}: LegendToggleProps) {
  const [shaking, setShaking] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")

  const toggle = (item: LegendItem, event: MouseEvent) => {
    const visible = items.filter((i) => !hidden.has(i.key))

    if (event.altKey) {
      const isolated = visible.length === 1 && visible[0].key === item.key
      onHiddenChange(isolated ? new Set() : new Set(items.filter((i) => i.key !== item.key).map((i) => i.key)))
      setAnnouncement(isolated ? "Showing all series" : `Showing only ${item.label}`)
      return
    }

    const next = new Set(hidden)
    if (next.has(item.key)) {
      next.delete(item.key)
      setAnnouncement(`${item.label} shown`)
    } else {
      if (visible.length <= 1) {
        setShaking(item.key)
        setAnnouncement("At least one series has to stay visible")
        return
      }
      next.add(item.key)
      setAnnouncement(`${item.label} hidden`)
    }
    onHiddenChange(next)
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((item) => {
        const on = !hidden.has(item.key)
        const shape = item.shape ?? "rect"
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            onClick={(e) => toggle(item, e)}
            onAnimationEnd={() => setShaking(null)}
            className={cn(
              "inline-flex h-7 items-center gap-2 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-[background-color,color,opacity] duration-200 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
              on ? "text-foreground" : "text-muted-foreground opacity-70",
              shaking === item.key && "animate-shake",
            )}
          >
            <motion.span
              aria-hidden
              animate={{ scale: on ? 1 : 0.8, opacity: on ? 1 : 0.7 }}
              transition={SPRING}
              className={cn(
                "shrink-0",
                shape === "rect" && "size-2.5 rounded-[3px]",
                shape === "line" && "h-[3px] w-3.5 rounded-full",
                shape === "dot" && "size-2 rounded-full",
              )}
              style={{
                background: on ? item.color : "transparent",
                boxShadow: on ? undefined : `inset 0 0 0 1.5px ${item.color}`,
              }}
            />
            <span className={cn(!on && "line-through decoration-muted-foreground/60")}>{item.label}</span>
            {item.value != null && <span className="font-normal text-muted-foreground tabular-nums">{item.value}</span>}
          </button>
        )
      })}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
