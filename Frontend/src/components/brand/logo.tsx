import { cn } from "@/lib/utils"

/**
 * The mark: a pulse line on a sky→violet tile, with a slowly rotating blurred
 * halo behind it so the brand itself feels "alive".
 */
export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <span className={cn("relative inline-flex size-8 shrink-0 items-center justify-center", className)}>
      {animated && (
        <span
          aria-hidden
          className="animate-spin-slow absolute -inset-[3px] rounded-[12px] opacity-70 blur-[6px]"
          style={{ background: "conic-gradient(from 0deg, var(--primary), var(--info), var(--success), var(--primary))" }}
        />
      )}
      <span className="relative flex size-full items-center justify-center rounded-[10px] bg-gradient-to-br from-primary via-[color-mix(in_oklch,var(--primary),var(--info)_50%)] to-info text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        <svg
          viewBox="0 0 24 24"
          className="size-[62%]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2.5 12.5h3.8l2.2-5.5 3.6 10.5 2.6-7 1.6 2h5.2" />
        </svg>
      </span>
    </span>
  )
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-foreground">Self-Healing</span>
        {!compact && <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">AI Debugger</span>}
      </span>
    </span>
  )
}
