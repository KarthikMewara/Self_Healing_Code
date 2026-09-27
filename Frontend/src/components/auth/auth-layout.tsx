import { FlaskConical, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode, Ref } from "react"

import { AuthShowcase } from "@/components/auth/auth-showcase"
import { useMediaQuery } from "@/components/auth/use-media-query"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: ReactNode
  /** Attach useShake()'s ref here to shake the card on a failed submit. */
  cardRef?: Ref<HTMLDivElement>
  /** Small print under the card (the preview disclaimer). */
  footnote?: ReactNode
}

/**
 * Auth screens inside MarketingShell (which owns the header, footer and the
 * aurora background, so this stays transparent). The form sits in a frosted
 * card with a travelling border beam; on lg+ a live showcase fills the right.
 */
export function AuthLayout({ children, cardRef, footnote }: AuthLayoutProps) {
  // Mount the showcase only where it's visible, so its timers and canvas never
  // run behind a display:none on phones.
  const wide = useMediaQuery("(min-width: 1024px)")

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:gap-12 lg:px-8 xl:gap-16">
      <div className="flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mx-auto w-full max-w-md lg:max-w-none"
        >
          <div ref={cardRef} className="relative rounded-2xl">
            <SpotlightCard
              surface="none"
              glow="var(--primary)"
              className={cn(
                "glass-strong rounded-2xl p-5 sm:p-8",
                "shadow-[inset_0_1px_0_0_color-mix(in_oklch,white_7%,transparent),0_30px_80px_-40px_color-mix(in_oklch,var(--primary)_55%,transparent)]",
              )}
            >
              {children}
            </SpotlightCard>
          </div>
          {footnote && (
            <p className="mt-4 flex items-start justify-center gap-1.5 px-2 text-center text-xs text-muted-foreground">
              <FlaskConical aria-hidden className="mt-px size-3.5 shrink-0 text-warning" />
              <span>{footnote}</span>
            </p>
          )}
        </motion.div>
      </div>

      {wide && <AuthShowcase className="min-h-[36rem]" />}
    </div>
  )
}

interface AuthHeaderProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  className?: string
}

/** Title block at the top of an auth card. */
export function AuthHeader({ icon, title, description, className }: AuthHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {icon && <div className="mb-5">{icon}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}

/** Glowing gradient icon tile, matching PageHeader's. Pass children to show custom content (e.g. initials). */
export function AuthIcon({ icon: Icon, children, className }: { icon?: LucideIcon; children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-info/10 text-primary ring-1 ring-primary/25",
        className,
      )}
    >
      {children ?? (Icon ? <Icon aria-hidden className="size-5" /> : null)}
      <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-primary opacity-25 blur-lg" />
    </div>
  )
}
