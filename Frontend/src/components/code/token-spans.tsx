import type { Token } from "@/lib/highlight"

/** Renders one line of highlighted tokens. */
export function TokenSpans({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={`tok-${t.type}`}>
          {t.value}
        </span>
      ))}
    </>
  )
}

/**
 * Same as TokenSpans, but wraps the character ranges in `ranges` (word-level
 * diff changes) in a highlight mark, splitting tokens where needed.
 */
export function EmphasizedTokens({
  tokens,
  ranges,
  markClassName,
}: {
  tokens: Token[]
  ranges: [number, number][]
  markClassName: string
}) {
  if (!ranges.length) return <TokenSpans tokens={tokens} />

  const out: React.ReactNode[] = []
  let offset = 0
  tokens.forEach((token, ti) => {
    const start = offset
    const end = offset + token.value.length
    offset = end
    // Collect the boundaries that fall inside this token.
    const cuts = new Set<number>([start, end])
    for (const [a, b] of ranges) {
      if (a > start && a < end) cuts.add(a)
      if (b > start && b < end) cuts.add(b)
    }
    const points = [...cuts].sort((x, y) => x - y)
    for (let p = 0; p < points.length - 1; p++) {
      const a = points[p]
      const b = points[p + 1]
      const text = token.value.slice(a - start, b - start)
      const marked = ranges.some(([ra, rb]) => a >= ra && b <= rb)
      out.push(
        <span key={`${ti}-${p}`} className={`tok-${token.type}${marked ? ` ${markClassName}` : ""}`}>
          {text}
        </span>,
      )
    }
  })
  return <>{out}</>
}
