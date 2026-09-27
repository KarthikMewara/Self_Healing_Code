import { useEffect, useRef } from "react"

import { useMotionPreference } from "@/components/motion-preference"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// A drifting constellation of nodes that visualises "self-healing":
//   - every few seconds a node turns into a bug (red, jittering, infects its links)
//   - a pulse of light travels from a healthy neighbour to it
//   - on arrival the bug heals (green ripple) and fades back to normal
// It reacts to the cursor (nodes lean in, links light up), and clicking empty
// space sends out a healing wave. Pauses offscreen / in background tabs, and
// renders a single still frame under reduced motion.
// ---------------------------------------------------------------------------

type RGB = readonly [number, number, number]

interface Palette {
  node: RGB
  link: RGB
  bug: RGB
  heal: RGB
  pulse: RGB
  linkAlpha: number
  nodeAlpha: number
}

const PALETTES: Record<"dark" | "light", Palette> = {
  dark: {
    node: [125, 211, 252],
    link: [56, 189, 248],
    bug: [248, 113, 113],
    heal: [52, 211, 153],
    pulse: [196, 181, 253],
    linkAlpha: 0.24,
    nodeAlpha: 0.75,
  },
  light: {
    node: [2, 132, 199],
    link: [2, 132, 199],
    bug: [220, 38, 38],
    heal: [5, 150, 105],
    pulse: [124, 58, 237],
    linkAlpha: 0.16,
    nodeAlpha: 0.6,
  },
}

type NodeState = "idle" | "bug" | "healing" | "healed"

interface FieldNode {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  state: NodeState
  since: number
  seed: number
}

interface Pulse {
  from: FieldNode
  to: FieldNode
  start: number
  duration: number
}

interface Ripple {
  x: number
  y: number
  start: number
  color: RGB
  max: number
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

const BUG_MS = 1100
const HEALED_MS = 2400

export function NeuralField({ className, density = 1 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPreference()

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let linkDist = 140
    let palette = PALETTES[document.documentElement.classList.contains("dark") ? "dark" : "light"]
    const nodes: FieldNode[] = []
    const pulses: Pulse[] = []
    const ripples: Ripple[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    let nextBugAt = performance.now() + 900
    let raf = 0
    let last = performance.now()
    let visible = true
    let pageVisible = !document.hidden

    const makeNode = (): FieldNode => ({
      x: rand(0, width),
      y: rand(0, height),
      vx: rand(-0.016, 0.016),
      vy: rand(-0.012, 0.012),
      r: rand(1.1, 2.1),
      state: "idle",
      since: 0,
      seed: Math.random() * 1000,
    })

    const syncCount = () => {
      const target = Math.round(Math.max(28, Math.min(95, (width * height) / 15000)) * density)
      while (nodes.length < target) nodes.push(makeNode())
      if (nodes.length > target) nodes.length = target
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      linkDist = width < 640 ? 110 : 145
      syncCount()
      for (const n of nodes) {
        if (n.x > width) n.x = rand(0, width)
        if (n.y > height) n.y = rand(0, height)
      }
    }

    const heal = (n: FieldNode, now: number) => {
      n.state = "healed"
      n.since = now
      ripples.push({ x: n.x, y: n.y, start: now, color: palette.heal, max: 46 })
    }

    const spawnBug = (now: number) => {
      const active = nodes.filter((n) => n.state === "bug" || n.state === "healing").length
      if (active >= 2) return
      const margin = 40
      const candidates = nodes.filter(
        (n) => n.state === "idle" && n.x > margin && n.x < width - margin && n.y > margin && n.y < height - margin,
      )
      if (!candidates.length) return
      const n = candidates[Math.floor(Math.random() * candidates.length)]
      n.state = "bug"
      n.since = now
      ripples.push({ x: n.x, y: n.y, start: now, color: palette.bug, max: 26 })
    }

    const dispatchHealer = (bug: FieldNode, now: number) => {
      let best: FieldNode | null = null
      let bestD = Infinity
      for (const n of nodes) {
        if (n === bug || n.state !== "idle") continue
        const d = Math.hypot(n.x - bug.x, n.y - bug.y)
        if (d > 60 && d < bestD) {
          best = n
          bestD = d
        }
      }
      bug.state = "healing"
      bug.since = now
      if (!best) {
        heal(bug, now)
        return
      }
      pulses.push({ from: best, to: bug, start: now, duration: Math.min(1100, 380 + bestD * 2.2) })
    }

    const draw = (now: number, dt: number, animateFrame: boolean) => {
      ctx.clearRect(0, 0, width, height)

      // --- update
      if (animateFrame) {
        for (const n of nodes) {
          n.x += n.vx * dt
          n.y += n.vy * dt
          if (mouse.active) {
            const dx = mouse.x - n.x
            const dy = mouse.y - n.y
            const d = Math.hypot(dx, dy)
            if (d < 170 && d > 1) {
              const pull = (1 - d / 170) * 0.0009 * dt
              n.x += dx * pull
              n.y += dy * pull
            }
          }
          const pad = 20
          if (n.x < -pad) n.x = width + pad
          if (n.x > width + pad) n.x = -pad
          if (n.y < -pad) n.y = height + pad
          if (n.y > height + pad) n.y = -pad

          if (n.state === "bug" && now - n.since > BUG_MS) dispatchHealer(n, now)
          if (n.state === "healed" && now - n.since > HEALED_MS) n.state = "idle"
        }
        if (now > nextBugAt) {
          spawnBug(now)
          nextBugAt = now + rand(1500, 2900)
        }
      }

      // --- links
      ctx.lineWidth = 1
      const maxD2 = linkDist * linkDist
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > maxD2) continue
          const d = Math.sqrt(d2)
          let alpha = (1 - d / linkDist) * palette.linkAlpha
          let color = palette.link
          if (a.state === "bug" || b.state === "bug" || a.state === "healing" || b.state === "healing") {
            color = palette.bug
            alpha *= 1.9
          } else if (a.state === "healed" || b.state === "healed") {
            color = palette.heal
            alpha *= 1.7
          }
          if (mouse.active) {
            const mx = (a.x + b.x) / 2 - mouse.x
            const my = (a.y + b.y) / 2 - mouse.y
            const md = Math.hypot(mx, my)
            if (md < 180) alpha *= 1 + (1 - md / 180) * 2.2
          }
          ctx.strokeStyle = rgba(color, alpha)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // --- cursor "grab" lines
      if (mouse.active) {
        for (const n of nodes) {
          const d = Math.hypot(n.x - mouse.x, n.y - mouse.y)
          if (d < 150) {
            ctx.strokeStyle = rgba(palette.pulse, (1 - d / 150) * 0.35)
            ctx.beginPath()
            ctx.moveTo(mouse.x, mouse.y)
            ctx.lineTo(n.x, n.y)
            ctx.stroke()
          }
        }
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 130)
        glow.addColorStop(0, rgba(palette.link, 0.12))
        glow.addColorStop(1, rgba(palette.link, 0))
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 130, 0, Math.PI * 2)
        ctx.fill()
      }

      // --- nodes
      for (const n of nodes) {
        const age = now - n.since
        if (n.state === "bug" || n.state === "healing") {
          const jitter = n.state === "bug" ? 1.1 : 0.4
          const jx = n.x + Math.sin(now * 0.09 + n.seed) * jitter
          const jy = n.y + Math.cos(now * 0.11 + n.seed) * jitter
          const ring = 6 + Math.sin(now * 0.012) * 2
          ctx.strokeStyle = rgba(palette.bug, 0.55)
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(jx, jy, ring, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = rgba(palette.bug, 0.18)
          ctx.beginPath()
          ctx.arc(jx, jy, ring + 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = rgba(palette.bug, 1)
          ctx.beginPath()
          ctx.arc(jx, jy, 2.8, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = 1
        } else if (n.state === "healed") {
          const fade = 1 - age / HEALED_MS
          ctx.fillStyle = rgba(palette.heal, 0.2 * fade)
          ctx.beginPath()
          ctx.arc(n.x, n.y, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = rgba(palette.heal, 0.5 + 0.5 * fade)
          ctx.beginPath()
          ctx.arc(n.x, n.y, 2.6, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const twinkle = 0.75 + Math.sin(now * 0.002 + n.seed) * 0.25
          ctx.fillStyle = rgba(palette.node, palette.nodeAlpha * twinkle)
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // --- healing pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        const t = Math.min(1, (now - p.start) / p.duration)
        const e = easeInOut(t)
        const x = p.from.x + (p.to.x - p.from.x) * e
        const y = p.from.y + (p.to.y - p.from.y) * e
        const trail = ctx.createLinearGradient(p.from.x, p.from.y, x, y)
        trail.addColorStop(0, rgba(palette.pulse, 0))
        trail.addColorStop(1, rgba(palette.pulse, 0.85))
        ctx.strokeStyle = trail
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(p.from.x, p.from.y)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.lineWidth = 1
        ctx.fillStyle = rgba(palette.pulse, 0.25)
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = rgba(palette.pulse, 1)
        ctx.beginPath()
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fill()
        if (t >= 1) {
          pulses.splice(i, 1)
          if (p.to.state === "healing") heal(p.to, now)
        }
      }

      // --- ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const t = (now - r.start) / 900
        if (t >= 1) {
          ripples.splice(i, 1)
          continue
        }
        ctx.strokeStyle = rgba(r.color, (1 - t) * 0.7)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(r.x, r.y, 4 + t * r.max, 0, Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = 1
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      draw(now, dt, true)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (reduced || raf || !visible || !pageVisible) return
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    resize()
    if (reduced) {
      // A composed still: one bug mid-heal and one freshly healed node.
      const now = performance.now()
      if (nodes[3]) Object.assign(nodes[3], { state: "bug", since: now })
      if (nodes[7]) Object.assign(nodes[7], { state: "healed", since: now - 400 })
      draw(now, 0, false)
    } else {
      start()
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) draw(performance.now(), 0, false)
    })
    ro.observe(host)

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(canvas)

    const onVisibility = () => {
      pageVisible = !document.hidden
      if (pageVisible) start()
      else stop()
    }
    document.addEventListener("visibilitychange", onVisibility)

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouse.active = e.pointerType === "mouse" && x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
      mouse.x = x
      mouse.y = y
    }
    const onPointerLeave = () => {
      mouse.active = false
    }
    const onPointerDown = (e: PointerEvent) => {
      if (reduced) return
      const target = e.target as HTMLElement | null
      if (!target || !host.contains(target)) return
      if (target.closest("a,button,input,textarea,select,[role=button],[data-no-heal]")) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const now = performance.now()
      ripples.push({ x, y, start: now, color: palette.heal, max: 140 })
      ripples.push({ x, y, start: now + 120, color: palette.pulse, max: 90 })
      for (const n of nodes) {
        const d = Math.hypot(n.x - x, n.y - y)
        if (d < 220 && (n.state === "bug" || n.state === "healing")) heal(n, now)
        else if (d < 120 && n.state === "idle") {
          n.state = "healed"
          n.since = now - HEALED_MS * 0.4
        }
      }
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    document.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("pointerdown", onPointerDown)

    const themeObserver = new MutationObserver(() => {
      palette = PALETTES[document.documentElement.classList.contains("dark") ? "dark" : "light"]
      if (reduced) draw(performance.now(), 0, false)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      themeObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [reduced, density])

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none absolute inset-0", className)} />
}
