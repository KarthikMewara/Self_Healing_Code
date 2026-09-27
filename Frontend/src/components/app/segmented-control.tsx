import { LayoutGroup, motion } from "motion/react"
import { useId, type ReactNode } from "react"

import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  /** Optional count/badge shown after the label. */
  count?: number
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/**
 * Pill-style toggle group whose active background slides between options
 * (shared-layout animation). Keyboard: native buttons, arrow keys move focus.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const id = useId()

  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cn(
          "relative inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
          const idx = options.findIndex((o) => o.value === value)
          const next = options[(idx + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length]
          onChange(next.value)
          e.preventDefault()
        }}
      >
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                size === "sm" ? "h-6 px-2 text-xs [&_svg]:size-3" : "h-7 px-2.5 text-[0.8rem] [&_svg]:size-3.5",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="segment-indicator"
                  transition={SPRING}
                  className="absolute inset-0 rounded-md border border-border bg-background shadow-sm dark:bg-accent"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {option.icon}
                {option.label}
                {option.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {option.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
