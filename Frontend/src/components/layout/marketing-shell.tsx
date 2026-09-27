import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { AuroraBackdrop } from "@/components/fx/aurora-backdrop"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"

/**
 * Public pages. `isolate` makes this the stacking root so the fixed aurora
 * (z-0) paints above the shell's own background but below all content (z-10).
 */
export function MarketingShell() {
  const { pathname, hash } = useLocation()

  // New page → start at the top; a #hash → scroll to that section once it exists.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
      return
    }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 120)
    return () => clearTimeout(t)
  }, [pathname, hash])

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <AuroraBackdrop variant="marketing" />
      <SiteHeader />
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
