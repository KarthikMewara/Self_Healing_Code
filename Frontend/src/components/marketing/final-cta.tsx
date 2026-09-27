import { ArrowRight, LayoutDashboard } from "lucide-react"
import { Link } from "react-router-dom"

import { GlowButton } from "@/components/fx/glow-button"
import { HeartbeatLine } from "@/components/fx/heartbeat-line"
import { Magnetic } from "@/components/fx/magnetic"
import { NeuralField } from "@/components/fx/neural-field"
import { Reveal } from "@/components/fx/reveal"
import { Button } from "@/components/ui/button"

export function FinalCta() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-8 pb-24 md:px-8 md:pb-32">
      <Reveal>
        <div className="glass-strong relative isolate overflow-hidden rounded-3xl border border-border px-6 py-16 text-center shadow-2xl md:px-16 md:py-24">
          <div className="absolute inset-0 -z-10">
            <NeuralField density={0.55} className="opacity-70 mask-radial" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 70% at 50% 110%, color-mix(in oklch, var(--info) 30%, transparent), transparent 70%), radial-gradient(40% 50% at 15% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%)",
              }}
            />
          </div>
          <HeartbeatLine className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-28 -translate-y-1/2 opacity-40" />

          <p className="mb-4 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">your next stack trace</p>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tighter text-balance text-foreground md:text-6xl">
            Stop guessing at <span className="text-gradient-brand animate-gradient-pan">stack traces.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:text-lg">Free to start — no credit card required.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <GlowButton size="lg" className="h-11 px-5" render={<Link to="/register" />}>
                Start debugging free <ArrowRight className="size-4" />
              </GlowButton>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Button size="lg" variant="outline" className="glass h-11 px-5" render={<Link to="/dashboard" />}>
                <LayoutDashboard className="size-4" /> Explore the app
              </Button>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
