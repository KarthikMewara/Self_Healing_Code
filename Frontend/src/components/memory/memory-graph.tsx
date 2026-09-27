import { Brain } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"

import { buildLayout, curve, pointOn, type Pt } from "@/components/memory/graph-layout"
import { useMotionPreference } from "@/components/motion-preference"
import { LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"
import type { MemoryRecord } from "@/services/mock/memory"

// Drift, link curves and recall pulses are written straight to the DOM from a
// single rAF loop (paused offscreen / in background tabs, off under reduced
// motion), so hover and selection re-renders never fight the animation.

function useCompact(query = "(max-width: 639px)") {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setCompact(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])
  return compact
}

const PULSE_TRAVEL = 1.25
const RIPPLE = 0.9
const PULSE_EVERY = 2.8

interface MemoryGraphProps {
  cases: MemoryRecord[]
  families: { type: string; count: number }[]
  visibleIds: Set<string>
  hoveredId: string | null
  selectedId: string | null
  activeFamily: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onFamilyClick: (type: string) => void
  className?: string
}

export function MemoryGraph({
  cases,
  families,
  visibleIds,
  hoveredId,
  selectedId,
  activeFamily,
  onHover,
  onSelect,
  onFamilyClick,
  className,
}: MemoryGraphProps) {
  const compact = useCompact()
  const { reduced } = useMotionPreference()
  const uid = useId().replace(/:/g, "")
  const layout = useMemo(() => buildLayout(cases, families, compact), [cases, families, compact])
  const byId = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases])
  const [hoveredHub, setHoveredHub] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const nodeEls = useRef(new Map<string, SVGGElement>())
  const linkEls = useRef(new Map<string, SVGPathElement>())
  const pulseEl = useRef<SVGCircleElement>(null)
  const rippleEl = useRef<SVGCircleElement>(null)
  const visibleRef = useRef(visibleIds)
  const requested = useRef<string | null>(null)

  useEffect(() => {
    visibleRef.current = visibleIds
  }, [visibleIds])

  // A click sends a recall pulse straight to the chosen case.
  useEffect(() => {
    if (selectedId) requested.current = selectedId
  }, [selectedId])

  useLayoutEffect(() => {
    const positions = new Map<string, Pt>()
    const hubByKey = new Map(layout.hubs.map((h) => [h.key, h]))
    const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))

    const place = (t: number, drift: boolean) => {
      positions.set("core", layout.core)
      for (const hub of layout.hubs) {
        const p = drift
          ? { x: hub.x + Math.sin(t * 0.32 + hub.phase) * 2.2, y: hub.y + Math.cos(t * 0.27 + hub.phase) * 2.2 }
          : { x: hub.x, y: hub.y }
        positions.set(hub.key, p)
        nodeEls.current.get(hub.key)?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
      }
      for (const n of layout.nodes) {
        const p = drift
          ? {
              x: n.x + Math.sin(t * n.speed + n.phase) * n.amp,
              y: n.y + Math.cos(t * n.speed * 0.85 + n.phase * 1.3) * n.amp,
            }
          : { x: n.x, y: n.y }
        positions.set(n.id, p)
        nodeEls.current.get(n.id)?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
      }
      for (const link of layout.links) {
        const a = positions.get(link.from)
        const b = positions.get(link.to)
        if (a && b) linkEls.current.get(link.id)?.setAttribute("d", curve(a, b, link.bend).d)
      }
    }

    place(0, false)
    const pulse = pulseEl.current
    const ripple = rippleEl.current
    pulse?.setAttribute("opacity", "0")
    ripple?.setAttribute("opacity", "0")
    if (reduced) return

    let raf = 0
    let running = false
    let inView = true
    let active: { id: string; start: number } | null = null
    let lastLaunch = -PULSE_EVERY + 0.8
    let cursor = 0

    const pickNext = () => {
      const ids = layout.nodes.map((n) => n.id).filter((id) => visibleRef.current.has(id))
      if (!ids.length) return null
      cursor = (cursor + 1) % ids.length
      return ids[cursor]
    }

    const frame = (ms: number) => {
      const t = ms / 1000
      place(t, true)

      if (requested.current) {
        active = { id: requested.current, start: t }
        requested.current = null
        lastLaunch = t
      } else if (!active && t - lastLaunch > PULSE_EVERY) {
        const id = pickNext()
        if (id) active = { id, start: t }
        lastLaunch = t
      }

      if (active && pulse && ripple) {
        const node = nodeById.get(active.id)
        const hub = node && hubByKey.get(node.hubKey)
        const elapsed = t - active.start
        if (!node || !hub) {
          active = null
        } else if (elapsed < PULSE_TRAVEL) {
          const k = elapsed / PULSE_TRAVEL
          const core = positions.get("core")!
          const hubPos = positions.get(hub.key)!
          const nodePos = positions.get(node.id)!
          const leg1 = layout.links.find((l) => l.id === `core-${hub.key}`)
          const leg2 = layout.links.find((l) => l.id === `hub-${node.id}`)
          const p =
            k < 0.5
              ? pointOn(core, curve(core, hubPos, leg1?.bend ?? 0).c, hubPos, k * 2)
              : pointOn(hubPos, curve(hubPos, nodePos, leg2?.bend ?? 0).c, nodePos, (k - 0.5) * 2)
          pulse.setAttribute("cx", p.x.toFixed(1))
          pulse.setAttribute("cy", p.y.toFixed(1))
          pulse.setAttribute("r", "3.5")
          pulse.setAttribute("opacity", String(Math.min(1, Math.sin(k * Math.PI) * 1.6)))
          ripple.setAttribute("opacity", "0")
        } else if (elapsed < PULSE_TRAVEL + RIPPLE) {
          const k = (elapsed - PULSE_TRAVEL) / RIPPLE
          const nodePos = positions.get(node.id)!
          pulse.setAttribute("opacity", "0")
          ripple.setAttribute("cx", nodePos.x.toFixed(1))
          ripple.setAttribute("cy", nodePos.y.toFixed(1))
          ripple.setAttribute("r", (node.r + 2 + k * 16).toFixed(1))
          ripple.setAttribute("opacity", ((1 - k) * 0.85).toFixed(2))
        } else {
          ripple.setAttribute("opacity", "0")
          active = null
        }
      }

      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || !inView || document.hidden) return
      running = true
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) start()
      else stop()
    })
    if (svgRef.current) io.observe(svgRef.current)
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVisibility)
    start()

    return () => {
      stop()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [layout, reduced])

  const focusId = hoveredId ?? selectedId
  const focusFamily = hoveredHub ?? activeFamily
  const labelSize = compact ? "text-[10px]" : "text-[11px]"

  const setNodeEl = (key: string) => (el: SVGGElement | null) => {
    if (el) nodeEls.current.set(key, el)
    else nodeEls.current.delete(key)
  }
  const setLinkEl = (key: string) => (el: SVGPathElement | null) => {
    if (el) linkEls.current.set(key, el)
    else linkEls.current.delete(key)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      className={cn("block h-auto w-full touch-manipulation select-none", className)}
      role="img"
      aria-labelledby={`${uid}-title ${uid}-desc`}
    >
      <title id={`${uid}-title`}>Memory graph</title>
      <desc id={`${uid}-desc`}>
        {cases.length} resolved cases clustered around {families.length} error families:{" "}
        {families.map((f) => `${f.type} (${f.count})`).join(", ")}.
      </desc>
      <defs>
        <radialGradient id={`${uid}-core`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--info)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Links */}
      <g fill="none">
        {layout.links.map((link) => {
          if (link.kind === "core") {
            const hub = layout.hubs.find((h) => h.key === link.to)!
            const dim = focusFamily !== null && focusFamily !== hub.type
            return (
              <path
                key={link.id}
                ref={setLinkEl(link.id)}
                stroke="var(--info)"
                strokeWidth={1.25}
                strokeDasharray="2 6"
                strokeLinecap="round"
                className="animate-dash transition-[stroke-opacity] duration-300"
                style={{ animationDuration: "46s", strokeOpacity: dim ? 0.12 : 0.45 }}
              />
            )
          }
          if (link.kind === "hub") {
            const node = layout.nodes.find((n) => n.id === link.to)!
            const visible = visibleIds.has(node.id)
            const lit = focusId === node.id
            const inFamily = focusFamily === null || focusFamily === node.type
            return (
              <path
                key={link.id}
                ref={setLinkEl(link.id)}
                stroke={lit ? "var(--info)" : "var(--foreground)"}
                strokeWidth={lit ? 1.6 : 1}
                className="transition-[stroke-opacity] duration-300"
                style={{ strokeOpacity: !visible ? 0.04 : lit ? 0.85 : inFamily ? 0.16 : 0.06 }}
              />
            )
          }
          const lit = focusId !== null && (link.from === focusId || link.to === focusId)
          const visible = visibleIds.has(link.from) && visibleIds.has(link.to)
          return (
            <path
              key={link.id}
              ref={setLinkEl(link.id)}
              stroke="var(--primary)"
              strokeWidth={lit ? 1.4 : 1}
              strokeDasharray="3 5"
              className="animate-dash transition-[stroke-opacity] duration-300"
              style={{ animationDuration: "70s", strokeOpacity: !visible ? 0.03 : lit ? 0.7 : 0.22 }}
            />
          )
        })}
      </g>

      {/* Core */}
      <g transform={`translate(${layout.core.x} ${layout.core.y})`} aria-hidden>
        <circle
          r={compact ? 28 : 34}
          fill="var(--primary)"
          opacity={0.1}
          className="animate-breathe"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
        <circle r={compact ? 18 : 22} fill="var(--info)" opacity={0.14} />
        <circle r={compact ? 12 : 15} fill={`url(#${uid}-core)`} />
        <Brain x={compact ? -6.5 : -8} y={compact ? -6.5 : -8} width={compact ? 13 : 16} height={compact ? 13 : 16} color="var(--primary-foreground)" strokeWidth={2.2} />
      </g>

      {/* Error-family hubs */}
      {layout.hubs.map((hub) => {
        const active = activeFamily === hub.type
        const dim = focusFamily !== null && focusFamily !== hub.type
        // Labels sit on the core-facing side. On narrow screens only the
        // left/right hubs label sideways; diagonal ones centre above/below.
        const sideways = compact ? Math.abs(hub.dx) > 0.9 : Math.abs(hub.dx) > 0.3
        const anchor = !sideways ? "middle" : hub.dx < 0 ? "start" : "end"
        const lx = sideways ? -hub.dx * (compact ? 14 : 18) : 0
        const ly = sideways ? -hub.dy * 16 + 4 : hub.dy < 0 ? 24 : -16
        return (
          <g
            key={hub.key}
            ref={setNodeEl(hub.key)}
            className={cn("cursor-pointer transition-opacity duration-300", dim && "opacity-40")}
            onClick={() => onFamilyClick(hub.type)}
            onPointerEnter={() => setHoveredHub(hub.type)}
            onPointerLeave={() => setHoveredHub(null)}
          >
            <circle r={16} fill="transparent" />
            {active && (
              <circle
                r={15}
                fill="none"
                stroke="var(--info)"
                strokeOpacity={0.5}
                className="animate-ping-soft"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            )}
            <circle r={compact ? 8 : 9.5} fill="var(--card)" stroke="var(--info)" strokeWidth={active ? 2.4 : 1.5} />
            <circle r={3} fill="var(--info)" />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              className={cn("fill-foreground font-mono font-medium", labelSize)}
              paintOrder="stroke"
              stroke="var(--background)"
              strokeWidth={4}
              strokeLinejoin="round"
            >
              {hub.type}
              <tspan className="fill-muted-foreground"> {hub.count}</tspan>
            </text>
          </g>
        )
      })}

      {/* Cases */}
      {layout.nodes.map((node) => {
        const record = byId.get(node.id)!
        const visible = visibleIds.has(node.id)
        const lit = focusId === node.id
        const selected = selectedId === node.id
        const inFamily = focusFamily === null || focusFamily === node.type
        const title = record.title.length > 32 ? `${record.title.slice(0, 31)}…` : record.title
        const sideX = node.labelSide === "right" ? node.r + 9 : -(node.r + 9)
        return (
          <g
            key={node.id}
            ref={setNodeEl(node.id)}
            className={cn(
              "transition-opacity duration-300",
              visible ? "cursor-pointer" : "pointer-events-none",
              !visible ? "opacity-15" : !inFamily && !lit ? "opacity-40" : focusId && !lit ? "opacity-70" : "opacity-100",
            )}
            onPointerEnter={() => onHover(node.id)}
            onPointerLeave={() => onHover(null)}
            onClick={() => onSelect(node.id)}
          >
            <circle r={14} fill="transparent" />
            {lit && <circle r={node.r + 7} fill={node.color} opacity={0.2} />}
            <circle
              r={lit ? node.r * 1.35 : node.r}
              fill={node.color}
              stroke="var(--background)"
              strokeWidth={2}
              style={{ transition: "r 0.25s ease-out" }}
            />
            {selected && <circle r={node.r + 5.5} fill="none" stroke="var(--info)" strokeWidth={1.6} />}
            {lit && (
              <g transform={`translate(${sideX} 0)`} pointerEvents="none">
                <text
                  y={-2}
                  textAnchor={node.labelSide === "right" ? "start" : "end"}
                  className={cn("fill-foreground font-medium", labelSize)}
                  paintOrder="stroke"
                  stroke="var(--background)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                >
                  {title}
                </text>
                <text
                  y={11}
                  textAnchor={node.labelSide === "right" ? "start" : "end"}
                  className="fill-muted-foreground text-[10px]"
                  paintOrder="stroke"
                  stroke="var(--background)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                >
                  {record.similarity}% match · {LANGUAGE_LABELS[toLanguageKey(record.language)]}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Recall pulse (positioned by the animation loop) */}
      <circle ref={pulseEl} fill="var(--info)" filter={`url(#${uid}-glow)`} pointerEvents="none" />
      <circle ref={rippleEl} fill="none" stroke="var(--info)" strokeWidth={1.5} pointerEvents="none" />
    </svg>
  )
}
