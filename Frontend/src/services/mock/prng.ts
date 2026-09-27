// Deterministic helpers for generated preview data. Everything built with
// these is identical on every load and in every browser, so the numbers quoted
// on different screens (and in screenshots) always agree.

export type Rand = () => number

/** mulberry32 -- tiny, fast, good-enough PRNG. Returns floats in [0, 1). */
export function createRng(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a string hash, used to derive stable seeds from ids. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Picks a key with probability proportional to its weight. */
export function pickWeighted<T extends string>(rand: Rand, weights: ReadonlyArray<readonly [T, number]>): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  let roll = rand() * total
  for (const [key, w] of weights) {
    roll -= w
    if (roll <= 0) return key
  }
  return weights[weights.length - 1][0]
}

/**
 * Largest-remainder apportionment: whole numbers proportional to `weights`
 * that add up to exactly `total`.
 */
export function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (w / sum) * total)
  const result = raw.map((r) => Math.floor(r))
  let remaining = total - result.reduce((a, b) => a + b, 0)
  const byFraction = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac)
  for (let k = 0; remaining > 0 && k < byFraction.length; k++, remaining--) result[byFraction[k].i] += 1
  return result
}

export function round(value: number, decimals = 0) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}
