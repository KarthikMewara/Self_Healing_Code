import { ArrowRight, Check, ChevronDown, Terminal } from "lucide-react"
import { motion, useScroll, useTransform } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { GlowButton } from "@/components/fx/glow-button"
import { Magnetic } from "@/components/fx/magnetic"
import { NeuralField } from "@/components/fx/neural-field"
import { HealingSimulator } from "@/components/marketing/healing-simulator"
import { useMotionPreference } from "@/components/motion-preference"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** "bug." glitches in red, then heals: settles to calm text with a green underline sweep. */
function HealingWord() {
  const { reduced } = useMotionPreference()
  const [healed, setHealed] = useState(false)

  useEffect(() => {
    if (reduced) {
      setHealed(true)
      return
    }
    let t: ReturnType<typeof setTimeout>
    const loop = (next: boolean) => {
      setHealed(next)
      t = setTimeout(() => loop(!next), next ? 3200 : 1700)
    }
    t = setTimeout(() => loop(true), 1900)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <span className="relative inline-block">
      <span
        className={cn(
          "relative inline-block transition-colors duration-700",
          healed ? "text-foreground" : "animate-glitch text-destructive",
        )}
        style={healed ? undefined : { animationDuration: "0.9s" }}
      >
        bug.
      </span>
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-[5px] rounded-full bg-gradient-to-r from-success to-primary transition-[width] duration-700 ease-out md:-bottom-2"
        style={{ width: healed ? "100%" : "0%" }}
      />
    </span>
  )
}

const WORDS_LINE_1 = ["Paste", "the"]
const WORDS_LINE_2 = ["Get", "back", "a"]

function Word({ children, i }: { children: React.ReactNode; i: number }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.8, delay: 0.08 + i * 0.07, ease: EASE_OUT }}
    >
      {children}
    </motion.span>
  )
}

export function Hero() {
  const simRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: simRef, offset: ["start end", "start 25%"] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const y = useTransform(scrollYProgress, [0, 1], [40, 0])

  return (
    <section className="relative overflow-hidden">
      <NeuralField className="mask-radial" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem]"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 md:px-8 md:pt-24 md:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="relative mx-auto inline-flex"
          >
            <Link
              to="/#how"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-border bg-background/40 py-1 pr-3 pl-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            >
              <span className="rounded-full bg-info/15 px-2 py-0.5 text-[11px] text-info">Live telemetry</span>
              Watch every step of the fix stream in
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <h1 className="mt-7 text-[2.75rem] leading-[1.02] font-semibold tracking-tighter text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            <span className="block">
              {WORDS_LINE_1.map((w, i) => (
                <span key={w}>
                  <Word i={i}>{w}</Word>{" "}
                </span>
              ))}
              <Word i={2}>
                <HealingWord />
              </Word>
            </span>
            <span className="block">
              {WORDS_LINE_2.map((w, i) => (
                <span key={w}>
                  <Word i={3 + i}>{w}</Word>{" "}
                </span>
              ))}
              <Word i={6}>
                <span className="text-gradient-brand animate-gradient-pan pb-2">tested</span>
              </Word>{" "}
              <Word i={7}>
                <span className="text-gradient-brand animate-gradient-pan pb-2">fix.</span>
              </Word>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
            className="mx-auto mt-6 max-w-2xl text-base text-balance text-muted-foreground md:text-xl"
          >
            Self-Healing AI Debugger finds the root cause of your error, writes a minimal patch, and runs your tests
            against it — streaming every step live, before you ever see the fix.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE_OUT }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Magnetic>
              <GlowButton size="lg" className="h-11 px-5 text-[0.95rem]" render={<Link to="/register" />}>
                Start debugging free <ArrowRight className="size-4" />
              </GlowButton>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Button size="lg" variant="outline" className="glass h-11 px-5 text-[0.95rem]" render={<Link to="/debugger" />}>
                <Terminal className="size-4" /> Open the debugger
              </Button>
            </Magnetic>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.95 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {["No credit card", "8 languages", "Code stays in your company's tenant"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-success" /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <div ref={simRef} className="relative mx-auto mt-16 max-w-6xl md:mt-20" style={{ perspective: 1600 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            style={{ rotateX, scale, y, transformOrigin: "50% 0%" }}
          >
            <HealingSimulator />
          </motion.div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Click a file tab to switch languages · click anywhere in the background to send out a healing wave
          </p>
        </div>

        <a
          href="#how"
          className="mx-auto mt-10 flex w-fit flex-col items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          How it works
          <ChevronDown className="animate-float-y size-4" />
        </a>
      </div>
    </section>
  )
}
