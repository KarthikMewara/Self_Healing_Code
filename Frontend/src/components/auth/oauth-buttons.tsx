import { AnimatePresence, motion } from "motion/react"
import type { ComponentType, ReactNode } from "react"

import { GitHubMark, GoogleMark } from "@/components/auth/brand-marks"
import { StatusLabel, type ActionStatus } from "@/components/auth/status-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type OAuthProvider = "github" | "google"

const PROVIDERS: { id: OAuthProvider; name: string; Mark: ComponentType<{ className?: string }> }[] = [
  { id: "github", name: "GitHub", Mark: GitHubMark },
  { id: "google", name: "Google", Mark: GoogleMark },
]

interface OAuthButtonsProps {
  /** The provider currently signing in, if any. */
  active: OAuthProvider | null
  /** Status of the active provider's (mock) sign-in. */
  status: ActionStatus
  onSelect: (provider: OAuthProvider) => void
  /** Lock the buttons while another sign-in method is in flight. */
  disabled?: boolean
  /** Adds a "Last used" tag to that provider. */
  lastUsed?: OAuthProvider | null
}

/**
 * "Continue with GitHub / Google". They sign in for real in this preview
 * (mocked): the clicked button spins, turns into a check, then the page moves on.
 */
export function OAuthButtons({ active, status, onSelect, disabled = false, lastUsed = null }: OAuthButtonsProps) {
  return (
    <div className="grid gap-2.5">
      {PROVIDERS.map(({ id, name, Mark }) => {
        const isActive = active === id
        const buttonStatus: ActionStatus = isActive ? status : "idle"

        return (
          <Button
            key={id}
            type="button"
            variant="outline"
            disabled={(disabled || active !== null) && !isActive}
            aria-busy={buttonStatus === "loading" || undefined}
            onClick={() => onSelect(id)}
            className={cn(
              "relative h-10 w-full rounded-[10px] bg-background/70 text-sm font-medium shadow-xs duration-200 dark:bg-background/35",
              "hover:-translate-y-px hover:border-foreground/20 hover:bg-background hover:shadow-md dark:hover:bg-background/60",
              buttonStatus === "success" && "border-success/40 text-success hover:text-success",
            )}
          >
            <StatusLabel
              status={buttonStatus}
              loadingLabel={`Connecting to ${name}…`}
              successLabel={`Signed in with ${name}`}
              icon={<Mark className="size-4" />}
            >
              Continue with {name}
            </StatusLabel>
            <AnimatePresence>
              {lastUsed === id && buttonStatus === "idle" && (
                <motion.span
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="pointer-events-none absolute -top-2 right-3 rounded-full border border-primary/30 bg-background px-1.5 py-px text-[10px] leading-4 font-medium text-primary shadow-sm"
                >
                  Last used
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )
      })}
    </div>
  )
}

/** Hairline divider with a centred caption ("or continue with email"). */
export function AuthDivider({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("my-5 flex items-center gap-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase", className)}>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  )
}
