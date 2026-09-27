import { Fragment } from "react"

import { cn } from "@/lib/utils"

/** Renders text with `backtick` spans as inline code. */
export function InlineCode({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.86em] text-foreground ring-1 ring-border/60")}
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  )
}
