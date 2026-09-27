import type { Token } from "@/lib/highlight"

// Line-by-line colouring for pasted error traces: the error type pops in red,
// file:line locations read as links, function names as functions.

const LOCATION = /((?:[A-Za-z]:)?[\w./\\-]+\.(?:js|mjs|cjs|jsx|ts|tsx|py|go|java|kt|cs|rb|php))((?::line )?[:(]?\d+(?::\d+)?\)?)?/g

function splitLocations(text: string, base: Token["type"] = "plain"): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of text.matchAll(LOCATION)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(...functionTokens(text.slice(last, idx), base))
    out.push({ type: "path", value: m[0] })
    last = idx + m[0].length
  }
  if (last < text.length) out.push(...functionTokens(text.slice(last), base))
  return out
}

function functionTokens(text: string, base: Token["type"]): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of text.matchAll(/\b(at|from|in|File|line)\b|([\w$<>.]+)(?=\s*\()/g)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ type: base, value: text.slice(last, idx) })
    out.push({ type: m[1] ? "keyword" : "function", value: m[0] })
    last = idx + m[0].length
  }
  if (last < text.length) out.push({ type: base, value: text.slice(last) })
  return out
}

const HEADER =
  /^(\s*(?:Uncaught\s+|PHP\s+)?(?:Exception in thread "[^"]*"\s+)?)((?:[\w$]+\.)*[A-Z][\w$]*(?:Error|Exception)|panic|Fatal error|NoMethodError|KeyError)(\s*:\s*)(.*)$/

export function highlightTrace(trace: string): Token[][] {
  return trace.split("\n").map((line) => {
    if (!line) return []
    if (/^\s*(Traceback \(most recent call last\)|Stack trace:|goroutine \d+|\{main\}|thrown in)/.test(line)) {
      return splitLocations(line, "comment")
    }
    const h = HEADER.exec(line)
    if (h) {
      const tokens: Token[] = []
      if (h[1]) tokens.push({ type: "plain", value: h[1] })
      tokens.push({ type: "error", value: h[2] })
      tokens.push({ type: "punctuation", value: h[3] })
      tokens.push(...splitLocations(h[4], "plain"))
      return tokens
    }
    // Ruby header: file:line:in 'x': message (NoMethodError)
    const rb = /^(.*?\.rb:\d+:in [`'][^'`]+['`]:\s*)(.+?)(\s+\()([\w:]+)(\)\s*)$/.exec(line)
    if (rb) {
      return [...splitLocations(rb[1]), { type: "plain", value: rb[2] }, { type: "punctuation", value: rb[3] }, { type: "error", value: rb[4] }, { type: "punctuation", value: rb[5] }]
    }
    return splitLocations(line)
  })
}
