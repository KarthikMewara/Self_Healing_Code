import { ArrowLeft, Bug, LayoutDashboard } from "lucide-react"
import { motion } from "motion/react"
import { Link, useLocation } from "react-router-dom"

import { GlowButton } from "@/components/fx/glow-button"
import { HeartbeatLine } from "@/components/fx/heartbeat-line"
import { NeuralField } from "@/components/fx/neural-field"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"

export default function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-4 py-20">
      <NeuralField density={0.7} className="mask-radial" />
      <div className="relative mx-auto max-w-xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="relative inline-block"
        >
          <p
            className="animate-glitch text-[7rem] leading-none font-bold tracking-tighter text-foreground md:text-[10rem]"
            style={{ animationDuration: "2.2s" }}
          >
            404
          </p>
          <motion.span
            className="absolute -top-2 -right-6 flex size-11 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/15 text-destructive shadow-[0_0_30px_-6px_var(--destructive)]"
            animate={{ x: [0, 14, -8, 0], y: [0, -10, 6, 0], rotate: [0, 18, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bug className="size-5" />
          </motion.span>
        </motion.div>
        <HeartbeatLine className="mx-auto -mt-4 h-14 max-w-sm opacity-80" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">This route has a bug we couldn't heal.</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing lives at <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">{pathname}</code>. It
          may have moved, or the link was mistyped.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <GlowButton size="lg" className="h-10 px-4" render={<Link to="/" />}>
            <ArrowLeft className="size-4" /> Back home
          </GlowButton>
          <Button size="lg" variant="outline" className="glass h-10 px-4" render={<Link to="/dashboard" />}>
            <LayoutDashboard className="size-4" /> Open the app
          </Button>
        </div>
      </div>
    </section>
  )
}
