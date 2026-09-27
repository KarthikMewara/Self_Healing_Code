import { motion } from "motion/react"

import { LogoMark } from "@/components/brand/logo"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

// A QR-*looking* pattern for the mock 2FA setup: seeded noise plus the three
// finder squares, timing lines and an alignment mark. It encodes nothing and
// is deliberately labelled as not scannable wherever it's shown.

const N = 25

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FINDERS: [number, number][] = [
  [0, 0],
  [0, N - 7],
  [N - 7, 0],
]

const MODULES = (() => {
  const rand = mulberry32(20260927)
  const dark = Array.from({ length: N }, () => Array.from({ length: N }, () => rand() < 0.47))
  const clear = (r: number, c: number) => {
    if (r >= 0 && c >= 0 && r < N && c < N) dark[r][c] = false
  }
  // Finder squares (+ their quiet border) are drawn separately.
  for (const [r0, c0] of FINDERS) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) clear(r0 + r, c0 + c)
  }
  // Timing lines.
  for (let i = 8; i < N - 8; i++) {
    dark[6][i] = i % 2 === 0
    dark[i][6] = i % 2 === 0
  }
  // Alignment mark.
  const a = N - 7
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) dark[a + r][a + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1
  }
  // Quiet centre for the logo.
  const mid = Math.floor(N / 2)
  for (let r = mid - 3; r <= mid + 3; r++) for (let c = mid - 3; c <= mid + 3; c++) clear(r, c)

  const cells: [number, number][] = []
  dark.forEach((row, r) => row.forEach((on, c) => on && cells.push([r, c])))
  return cells
})()

interface QrPlaceholderProps {
  /** Sweeps a scan line over the code while waiting for the user. */
  scanning?: boolean
  className?: string
}

export function QrPlaceholder({ scanning = false, className }: QrPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label="Sample QR code for an authenticator app. Preview only, it can't be scanned."
      className={cn(
        // Real QR codes are dark-on-light in both themes.
        "relative size-40 shrink-0 overflow-hidden rounded-xl border border-border bg-card p-2.5 text-foreground shadow-sm dark:bg-foreground dark:text-background",
        className,
      )}
    >
      <motion.svg
        viewBox={`0 0 ${N} ${N}`}
        className="size-full"
        aria-hidden
        initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0.4 }}
        animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
      >
        {MODULES.map(([r, c]) => (
          <rect key={`${r}-${c}`} x={c + 0.08} y={r + 0.08} width={0.84} height={0.84} rx={0.26} fill="currentColor" />
        ))}
        {FINDERS.map(([r, c]) => (
          <g key={`${r}-${c}`} fill="currentColor">
            <rect x={c + 0.5} y={r + 0.5} width={6} height={6} rx={1.7} fill="none" stroke="currentColor" strokeWidth={1} />
            <rect x={c + 2} y={r + 2} width={3} height={3} rx={0.9} />
          </g>
        ))}
      </motion.svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-[12px] bg-card p-1 shadow-sm dark:bg-foreground">
          <LogoMark animated={false} className="size-7" />
        </span>
      </div>

      {scanning && (
        <span aria-hidden className="pointer-events-none absolute inset-0 animate-scan">
          <span className="absolute inset-x-2 bottom-0 h-px bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
          <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary/20 to-transparent" />
        </span>
      )}
    </div>
  )
}
