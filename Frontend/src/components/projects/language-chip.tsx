import { LANGUAGE_COLORS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"

/** The language's brand dot, with a faint halo so it reads on any surface. */
export function LanguageDot({ language, className }: { language: string; className?: string }) {
  const color = LANGUAGE_COLORS[toLanguageKey(language)]
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklch, ${color} 18%, transparent)` }}
    />
  )
}

/** Dot + display label ("TypeScript", "C#"...). Accepts keys or labels. */
export function LanguageLabel({ language, className }: { language: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <LanguageDot language={language} />
      {LANGUAGE_LABELS[toLanguageKey(language)]}
    </span>
  )
}
