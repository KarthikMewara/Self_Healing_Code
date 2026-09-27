import type { ReactNode } from "react"

import { Reveal } from "@/components/fx/reveal"
import { cn } from "@/lib/utils"

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-primary" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  align?: "center" | "left"
  className?: string
}) {
  return (
    <Reveal className={cn("mb-12 max-w-3xl space-y-4 md:mb-16", align === "center" ? "mx-auto text-center" : "", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-5xl">{title}</h2>
      {description && <p className="text-base text-balance text-muted-foreground md:text-lg">{description}</p>}
    </Reveal>
  )
}
