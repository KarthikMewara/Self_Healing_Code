import { motion } from "motion/react"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import { CommandPalette } from "@/components/app/command-palette"
import { ALL_NAV_ITEMS } from "@/components/app/nav-items"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { ShortcutsDialog } from "@/components/app/shortcuts-dialog"
import { AuroraBackdrop } from "@/components/fx/aurora-backdrop"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { EASE_OUT } from "@/lib/motion"

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
}

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const pendingG = useRef<number | null>(null)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])

  // Global keyboard layer: ⌘K / Ctrl+K, "/", "?", and Linear-style "G then X".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === "/") {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (e.key === "?") {
        setShortcutsOpen(true)
        return
      }
      if (pendingG.current) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        const item = ALL_NAV_ITEMS.find((i) => i.key === e.key.toLowerCase())
        if (item) navigate(item.href)
        return
      }
      if (e.key.toLowerCase() === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 900)
      }
    }
    const onOpenEvent = () => setPaletteOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("open-command-palette", onOpenEvent)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command-palette", onOpenEvent)
    }
  }, [navigate])

  return (
    <SidebarProvider>
      <AppSidebar onOpenPalette={openPalette} />
      <SidebarInset className="isolate min-w-0">
        <AuroraBackdrop variant="app" />
        <TopBar onOpenPalette={openPalette} onOpenShortcuts={openShortcuts} />
        <div className="relative z-10 flex-1 p-4 md:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="mx-auto w-full max-w-[1400px]"
          >
            <Suspense fallback={<PageSkeleton layout="dashboard" />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </div>
      </SidebarInset>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onShowShortcuts={openShortcuts} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  )
}
