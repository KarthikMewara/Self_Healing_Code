import { Moon, Sun } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { useMotionPreference } from "@/components/motion-preference"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

/**
 * Switches theme with a circular "ink spread" reveal from the point that was
 * clicked (View Transitions API). Browsers without it, and reduced motion,
 * just switch instantly.
 */
export function useThemeSwitch() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const { reduced } = useMotionPreference()

  const switchTheme = (next: Theme, origin?: { x: number; y: number }) => {
    const resolvedNext =
      next === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next
    const apply = () => {
      // Apply synchronously so the transition snapshot captures the new theme;
      // next-themes re-applies the same class right after (a no-op).
      document.documentElement.classList.toggle("dark", resolvedNext === "dark")
      document.documentElement.style.colorScheme = resolvedNext
      flushSync(() => setTheme(next))
    }

    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (!doc.startViewTransition || reduced || resolvedNext === resolvedTheme) {
      apply()
      return
    }
    const x = origin?.x ?? window.innerWidth - 40
    const y = origin?.y ?? 32
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const transition = doc.startViewTransition(apply)
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
        )
      })
      .catch(() => {})
  }

  return { theme: (theme ?? "dark") as Theme, resolvedTheme, switchTheme }
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, switchTheme } = useThemeSwitch()
  const dark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn("relative overflow-hidden", className)}
      onClick={(e) => switchTheme(dark ? "light" : "dark", { x: e.clientX, y: e.clientY })}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ y: 14, rotate: -60, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -14, rotate: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
