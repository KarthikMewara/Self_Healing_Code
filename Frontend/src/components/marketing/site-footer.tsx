import { Link } from "react-router-dom"

import { Wordmark } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/theme-toggle"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/#how" },
      { label: "Features", to: "/#features" },
      { label: "Streaming API", to: "/#api" },
      { label: "FAQ", to: "/#faq" },
    ],
  },
  {
    title: "App",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "AI Debugger", to: "/debugger" },
      { label: "Self Healing", to: "/self-healing" },
      { label: "Analytics", to: "/analytics" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "Reset password", to: "/forgot-password" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-border/70">
      <div className="glass">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
          <div className="space-y-4">
            <Wordmark />
            <p className="max-w-xs text-sm text-muted-foreground">
              Paste the bug, get back a tested fix. Built for developers who'd rather ship than debug.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-success" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Healing engine: simulated in this demo build
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-none mx-auto -mb-6 max-w-7xl px-4 text-center text-[clamp(3.5rem,13vw,11rem)] leading-none font-bold tracking-tighter select-none md:px-8"
          style={{
            background: "linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 16%, transparent), transparent 80%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          self-healing
        </div>

        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground md:px-8">
            <p>© 2026 Self-Healing AI Debugger — demo build. Fixes are simulated until the backend is connected.</p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
