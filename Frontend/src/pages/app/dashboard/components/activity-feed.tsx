import {
  Brain,
  CircleCheck,
  FlaskConical,
  Gauge,
  Pause,
  Play,
  Radio,
  ShieldAlert,
  SkipForward,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Panel } from "@/components/app/panel"
import { useMotionPreference } from "@/components/motion-preference"
import { useNow, usePageVisible } from "@/components/insights/hooks"
import { formatRelative } from "@/components/insights/format"
import { LiveIndicator } from "@/components/insights/live-indicator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { FEED_POOL, FEED_SEED, type FeedKind, type FeedTemplate } from "@/services/mock/dashboard"

const KIND: Record<FeedKind, { icon: LucideIcon; chip: string; label: string }> = {
  heal: { icon: CircleCheck, chip: "bg-success/12 text-success ring-success/25", label: "Heal" },
  security: { icon: ShieldAlert, chip: "bg-destructive/12 text-destructive ring-destructive/25", label: "Security" },
  test: { icon: FlaskConical, chip: "bg-primary/12 text-primary ring-primary/25", label: "Tests" },
  memory: { icon: Brain, chip: "bg-info/12 text-info ring-info/25", label: "AI Memory" },
  performance: { icon: Gauge, chip: "bg-warning/12 text-warning ring-warning/25", label: "Performance" },
  review: { icon: TriangleAlert, chip: "bg-warning/12 text-warning ring-warning/25", label: "Review" },
}

const MAX_ITEMS = 8
const INTERVAL_MS = 12_000

interface FeedItem extends FeedTemplate {
  id: string
  at: number
  fresh?: boolean
}

export function ActivityFeed() {
  const navigate = useNavigate()
  const { reduced } = useMotionPreference()
  const pageVisible = usePageVisible()
  const [paused, setPaused] = useState(false)
  const [items, setItems] = useState<FeedItem[]>(() => {
    const now = Date.now()
    return FEED_SEED.map((seed) => ({ ...seed, at: now - seed.minutesAgo * 60_000 }))
  })
  const cursor = useRef(0)
  const now = useNow(30_000)
  const auto = !reduced && !paused && pageVisible

  const pushNext = useCallback(() => {
    const template = FEED_POOL[cursor.current % FEED_POOL.length]
    cursor.current += 1
    const item: FeedItem = { ...template, id: `live_${cursor.current}`, at: Date.now(), fresh: true }
    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS))
  }, [])

  useEffect(() => {
    if (!auto) return
    const timer = setInterval(pushNext, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [auto, pushNext])

  const state = auto ? "live" : reduced ? "manual" : "paused"

  return (
    <Panel
      title="Activity"
      description="Heals, scans and test runs across projects"
      icon={Radio}
      className="flex h-full flex-col"
      bodyClassName="flex-1"
      action={
        <div className="flex items-center gap-1">
          <LiveIndicator
            label={state === "live" ? "Live" : state === "manual" ? "Manual" : "Paused"}
            tone={state === "live" ? "success" : "muted"}
            pulse={state === "live"}
          />
          {reduced ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Show the next event"
                    onClick={pushNext}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <SkipForward className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Reduced motion is on — events arrive when you ask</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={paused ? "Resume live feed" : "Pause live feed"}
                    aria-pressed={paused}
                    onClick={() => setPaused((p) => !p)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </TooltipTrigger>
              <TooltipContent>{paused ? "Resume live feed" : "Pause live feed"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      }
    >
      <ol className="relative" aria-label="Recent activity">
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            const kind = KIND[item.kind]
            return (
              <motion.li
                key={item.id}
                layout="position"
                initial={{ opacity: 0, y: -14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, transition: { duration: 0.22 } }}
                transition={SPRING_SOFT}
                className="relative pb-1 pl-10"
              >
                {i < items.length - 1 && (
                  <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-gradient-to-b from-border to-border/30" />
                )}
                <span
                  className={cn(
                    "absolute top-1.5 left-0 flex size-7 items-center justify-center rounded-full ring-1",
                    kind.chip,
                  )}
                >
                  {item.fresh && !reduced && (
                    <span
                      aria-hidden
                      className="animate-ping-soft absolute inset-0 rounded-full bg-current opacity-30"
                      style={{ animationIterationCount: 2 }}
                    />
                  )}
                  <kind.icon className="relative size-3.5" />
                  <span className="sr-only">{kind.label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="relative -mx-2 block w-[calc(100%+1rem)] overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {item.fresh && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/12 to-transparent"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 2.6, delay: 0.4 }}
                    />
                  )}
                  <span className="relative block text-sm font-medium text-foreground">{item.title}</span>
                  <span className="relative mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{item.project}</span>
                    <span aria-hidden>·</span>
                    <span>{formatRelative(item.at, now)}</span>
                  </span>
                  {item.detail && (
                    <span className="relative mt-0.5 block text-xs text-muted-foreground/90">{item.detail}</span>
                  )}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </Panel>
  )
}
