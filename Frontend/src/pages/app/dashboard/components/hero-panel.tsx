import { ArrowRight, Command, FlaskConical, GitPullRequestArrow, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { getActiveUser } from "@/components/auth/auth-storage"
import { GlowButton } from "@/components/fx/glow-button"
import { HeartbeatLine } from "@/components/fx/heartbeat-line"
import { LiveIndicator } from "@/components/insights/live-indicator"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ATTENTION_ITEMS, DASHBOARD_KPIS } from "@/services/mock/dashboard"
import { currentUser, projects } from "@/services/mock-data"
import type { AuthUser } from "@/types/contract"

function greetingFor(hour: number) {
  if (hour < 5) return "Working late"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function extractFirstName(authUser: AuthUser | null): string {
  if (authUser?.name && authUser.name.trim().length > 0) {
    const raw = authUser.name.trim().split(/\s+/)[0]
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  if (authUser?.email) {
    // If name is not provided, derive cleanly from Gmail username (e.g. alex.chen@gmail.com -> Alex)
    const handle = authUser.email.split("@")[0]
    const part = handle.split(/[._-]/)[0]
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : "Developer"
  }
  return currentUser.name.split(" ")[0]
}

const CHIP: Record<(typeof ATTENTION_ITEMS)[number]["tone"], { className: string; icon: LucideIcon }> = {
  danger: { className: "border-destructive/25 bg-destructive/8 text-destructive hover:bg-destructive/14", icon: ShieldAlert },
  warning: { className: "border-warning/25 bg-warning/8 text-warning hover:bg-warning/14", icon: FlaskConical },
  info: { className: "border-info/25 bg-info/8 text-info hover:bg-info/14", icon: GitPullRequestArrow },
}

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("open-command-palette"))
}

export function HeroPanel() {
  const [greeting] = useState(() => greetingFor(new Date().getHours()))
  const [authUser, setAuthUser] = useState(() => getActiveUser())

  useEffect(() => {
    const onAuth = () => setAuthUser(getActiveUser())
    window.addEventListener("auth-changed", onAuth)
    return () => window.removeEventListener("auth-changed", onAuth)
  }, [])

  const firstName = extractFirstName(authUser)

  return (
    <section className="glass-strong relative isolate flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-border p-5 md:p-7">
      {/* Atmosphere: dot grid, two soft glows, the heartbeat trace and a travelling border beam. */}
      <div
        aria-hidden
        className="bg-dot-grid absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_70%_80%_at_88%_12%,black,transparent_70%)]"
      />
      <div aria-hidden className="animate-pulse-glow absolute -top-28 -right-20 -z-10 size-80 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-1/4 -z-10 size-80 rounded-full bg-info/14 blur-3xl" />
      <HeartbeatLine className="mask-fade-x pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 opacity-50" />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <LiveIndicator label="Healer online" tone="success" />
          <span>
            {authUser?.company_tenant || currentUser.companyName} · {authUser?.provider === "google" ? "Google Enterprise" : `${currentUser.plan} plan`}
          </span>
        </div>

        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-2xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight"
          >
            {greeting}, <span className="text-gradient-brand animate-gradient-pan">{firstName}</span>
          </motion.h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            Your AI debugger healed{" "}
            <span className="font-medium text-foreground">{DASHBOARD_KPIS.bugsFixed.value} bugs</span> across{" "}
            <span className="font-medium text-foreground">{projects.length} projects</span> in the last 30 days with a{" "}
            <span className="font-medium text-foreground">{DASHBOARD_KPIS.successRate.value}%</span> fix success rate. A
            few things still need you:
          </p>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Needs your attention">
          {ATTENTION_ITEMS.map((item, i) => {
            const chip = CHIP[item.tone]
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
              >
                <Link
                  to={item.to}
                  className={cn(
                    "group/chip inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    chip.className,
                  )}
                >
                  <chip.icon className="size-3.5" />
                  {item.label}
                  <span className="hidden font-normal opacity-75 sm:inline">· {item.detail}</span>
                  <ArrowRight className="size-3 -translate-x-0.5 opacity-60 transition-transform group-hover/chip:translate-x-0.5" />
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <GlowButton size="lg" className="h-10 px-4" render={<Link to="/debugger" />}>
          <Sparkles className="size-4" /> New debug session
        </GlowButton>
        <Button variant="outline" size="lg" className="glass h-10 gap-2 px-3.5" onClick={openCommandPalette}>
          <Command className="size-4" /> Command palette
          <span className="ml-0.5 hidden items-center gap-0.5 sm:inline-flex">
            <Kbd>{MOD_KEY}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </Button>
      </div>
    </section>
  )
}
