import { LANGUAGE_COLORS, toLanguageKey } from "@/lib/highlight"
import type { MemoryRecord } from "@/services/mock/memory"

// Memory graph geometry: a memory "core" in the middle, one hub per error
// family on an ellipse around it, and each case clustered on the far side of
// its hub -- closer to the hub the better it matched. Pure and deterministic.

export interface Pt {
  x: number
  y: number
}

export interface HubLayout {
  key: string
  type: string
  count: number
  x: number
  y: number
  dx: number
  dy: number
  phase: number
}

export interface NodeLayout {
  id: string
  hubKey: string
  type: string
  projectId: string
  x: number
  y: number
  r: number
  color: string
  phase: number
  amp: number
  speed: number
  labelSide: "left" | "right"
}

export interface LinkLayout {
  id: string
  from: string
  to: string
  kind: "core" | "hub" | "peer"
  bend: number
}

export interface GraphLayout {
  w: number
  h: number
  core: Pt
  hubs: HubLayout[]
  nodes: NodeLayout[]
  links: LinkLayout[]
}

// Largest families take the roomy left/right slots first.
const SLOTS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [-0.5, -0.87],
  [0.5, 0.87],
  [0.5, -0.87],
  [-0.5, 0.87],
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function buildLayout(cases: MemoryRecord[], families: { type: string; count: number }[], compact: boolean): GraphLayout {
  const w = compact ? 360 : 880
  const h = compact ? 460 : 360
  const core = { x: w / 2, y: h / 2 }
  const rx = compact ? 112 : 285
  const ry = compact ? 158 : 112

  const hubs: HubLayout[] = families.map((family, i) => {
    const slot = SLOTS[i] ?? [Math.cos((i / families.length) * Math.PI * 2), Math.sin((i / families.length) * Math.PI * 2)]
    return {
      key: `hub:${family.type}`,
      type: family.type,
      count: family.count,
      x: core.x + slot[0] * rx,
      y: core.y + slot[1] * ry,
      dx: slot[0],
      dy: slot[1],
      phase: i * 1.7,
    }
  })

  const nodes: NodeLayout[] = []
  hubs.forEach((hub) => {
    const members = cases.filter((c) => c.errorType === hub.type).sort((a, b) => b.similarity - a.similarity)
    const base = Math.atan2(hub.y - core.y, hub.x - core.x)
    const m = members.length
    const step = Math.min(0.78, 2.3 / Math.max(m, 1))
    members.forEach((c, k) => {
      const angle = base + (k - (m - 1) / 2) * step
      const dist = (compact ? 36 : 52) + (100 - c.similarity) * (compact ? 0.26 : 0.42)
      const x = clamp(hub.x + Math.cos(angle) * dist, 16, w - 16)
      const y = clamp(hub.y + Math.sin(angle) * dist, 16, h - 16)
      nodes.push({
        id: c.id,
        hubKey: hub.key,
        type: c.errorType,
        projectId: c.projectId,
        x,
        y,
        r: (compact ? 4.5 : 5) + (c.similarity / 100) * (compact ? 2.5 : 3.5),
        color: LANGUAGE_COLORS[toLanguageKey(c.language)],
        phase: (nodes.length + 1) * 2.399,
        amp: compact ? 2.2 : 3.4,
        speed: 0.34 + (k % 3) * 0.09,
        labelSide: x > w * 0.6 ? "left" : "right",
      })
    })
  })

  const links: LinkLayout[] = [
    ...hubs.map((hub, i) => ({ id: `core-${hub.key}`, from: "core", to: hub.key, kind: "core" as const, bend: i % 2 ? 0.08 : -0.08 })),
    ...nodes.map((n, i) => ({ id: `hub-${n.id}`, from: n.hubKey, to: n.id, kind: "hub" as const, bend: i % 2 ? 0.14 : -0.14 })),
  ]
  // Same project, different error family: the cross-links that make it a web.
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      if (a.projectId === b.projectId && a.type !== b.type) {
        links.push({ id: `peer-${a.id}-${b.id}`, from: a.id, to: b.id, kind: "peer", bend: 0.22 })
      }
    }
  }

  return { w, h, core, hubs, nodes, links }
}

export function curve(a: Pt, b: Pt, bend: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const c = { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend }
  return { c, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}` }
}

export function pointOn(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
