import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The primary call-to-action: brand gradient, soft outer glow, and a light
 * sweep that crosses it every few seconds. Accepts every Button prop
 * (including `render` for links).
 */
export function GlowButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "group/glow relative overflow-hidden border-0 bg-gradient-to-r from-primary via-[color-mix(in_oklch,var(--primary),var(--info)_45%)] to-info text-primary-foreground",
        "shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_34px_-10px_var(--primary)]",
        "transition-[box-shadow,transform,filter] duration-300 hover:bg-transparent hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_75%,transparent),0_16px_44px_-8px_var(--primary)] hover:brightness-110",
        "dark:text-[#04131c]",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
      <span
        aria-hidden
        className="animate-shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </Button>
  )
}
