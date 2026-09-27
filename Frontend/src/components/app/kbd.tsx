import { cn } from "@/lib/utils"

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

/** Platform-aware modifier label: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD_KEY = isMac ? "⌘" : "Ctrl"

/** Keyboard key hint, e.g. <Kbd>{MOD_KEY}</Kbd><Kbd>K</Kbd>. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/70 px-1 font-sans text-[10px] font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]",
        className,
      )}
    >
      {children}
    </kbd>
  )
}
