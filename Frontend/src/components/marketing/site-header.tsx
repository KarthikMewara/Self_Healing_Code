import { Menu, X } from "lucide-react"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { Wordmark } from "@/components/brand/logo"
import { GlowButton } from "@/components/fx/glow-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { EASE_OUT, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

export const NAV_SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "features", label: "Features" },
  { id: "api", label: "API" },
  { id: "faq", label: "FAQ" },
] as const

/** Tracks which landing section is under the middle of the viewport. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) {
      setActive(null)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    const t = setTimeout(() => {
      NAV_SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      })
    }, 300)
    return () => {
      clearTimeout(t)
      observer.disconnect()
    }
  }, [enabled])
  return active
}

export function SiteHeader() {
  const { pathname } = useLocation()
  const onLanding = pathname === "/"
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const active = useActiveSection(onLanding)

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12))
  useEffect(() => setMenuOpen(false), [pathname])

  const sectionHref = (id: string) => (onLanding ? `#${id}` : `/#${id}`)

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300",
          scrolled || menuOpen
            ? "glass-strong border-b border-border/70 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.45)]"
            : "border-b border-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center gap-6 px-4 transition-[height] duration-300 md:px-8",
            scrolled ? "h-14" : "h-16",
          )}
        >
          <Link to="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Self-Healing AI Debugger home">
            <Wordmark />
          </Link>

          <nav className="relative hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV_SECTIONS.map((s) => {
              const isActive = active === s.id
              const className = cn(
                "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )
              const content = (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      transition={SPRING}
                      className="absolute inset-0 -z-10 rounded-md bg-foreground/[0.06] ring-1 ring-border"
                    />
                  )}
                  {s.label}
                </>
              )
              return onLanding ? (
                <a key={s.id} href={sectionHref(s.id)} className={className}>
                  {content}
                </a>
              ) : (
                <Link key={s.id} to={sectionHref(s.id)} className={className}>
                  {content}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link to="/login" />}>
              Log in
            </Button>
            <GlowButton size="sm" className="hidden sm:inline-flex" render={<Link to="/register" />}>
              Get started
            </GlowButton>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              key="mobile-nav"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden md:hidden"
              aria-label="Mobile"
            >
              <div className="space-y-1 px-4 pt-1 pb-4">
                {NAV_SECTIONS.map((s, i) => (
                  <motion.a
                    key={s.id}
                    href={sectionHref(s.id)}
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                  >
                    {s.label}
                  </motion.a>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" render={<Link to="/login" />}>
                    Log in
                  </Button>
                  <GlowButton render={<Link to="/register" />}>Get started</GlowButton>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
