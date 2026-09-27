import { cn } from "@/lib/utils"

type Tone = "success" | "primary" | "danger" | "warning" | "muted"

const TONE: Record<Tone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  primary: "border-primary/25 bg-primary/10 text-primary",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  warning: "border-warning/25 bg-warning/10 text-warning",
  muted: "border-border bg-muted/60 text-muted-foreground",
}

interface LiveIndicatorProps {
  label: string
  tone?: Tone
  /** Pulses the dot -- use for "something is happening right now". */
  pulse?: boolean
  className?: string
}

/** Small status pill with a (optionally pulsing) dot: "Live", "Paused", "Ready". */
export function LiveIndicator({ label, tone = "success", pulse = true, className }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      <span className="relative flex size-1.5" aria-hidden>
        {pulse && <span className="animate-ping-soft absolute inset-0 rounded-full bg-current" />}
        <span className="relative size-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}
