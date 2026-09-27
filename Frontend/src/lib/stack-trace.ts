// Pulls structure out of a pasted error trace so the UI can show the error
// type/message up top and make every frame clickable (jump to that line in the
// editor). Covers the common shapes for all 8 supported languages.

export interface TraceFrame {
  /** Index of the raw line this frame came from. */
  lineIndex: number
  file?: string
  line?: number
  column?: number
  fn?: string
}

export interface ParsedTrace {
  errorType?: string
  message?: string
  frames: TraceFrame[]
}

const PATTERNS: { re: RegExp; map: (m: RegExpExecArray) => Omit<TraceFrame, "lineIndex"> }[] = [
  // Python:  File "app/events.py", line 12, in get_tenant
  {
    re: /File "([^"]+)", line (\d+)(?:, in (\S+))?/,
    map: (m) => ({ file: m[1], line: Number(m[2]), fn: m[3] }),
  },
  // C#:  at Shop.Cart.Total() in C:\src\Cart.cs:line 42
  {
    re: /at\s+([\w.<>`]+)\(.*?\)\s+in\s+(.+?):line\s+(\d+)/,
    map: (m) => ({ fn: m[1], file: m[2], line: Number(m[3]) }),
  },
  // Java:  at com.acme.TokenValidator.verify(TokenValidator.java:88)
  {
    re: /at\s+([\w.$<>]+)\(([\w.-]+\.(?:java|kt|scala)):(\d+)\)/,
    map: (m) => ({ fn: m[1], file: m[2], line: Number(m[3]) }),
  },
  // JS/TS:  at applyDiscount (checkout/cart.js:2:22)   |   at checkout/cart.js:2:22
  {
    re: /at\s+(?:(?:async\s+)?([^\s(]+)\s+\()?(?:file:\/\/)?([^\s()]+?):(\d+):(\d+)\)?\s*$/,
    map: (m) => ({ fn: m[1], file: m[2], line: Number(m[3]), column: Number(m[4]) }),
  },
  // PHP:  #0 /var/www/app/Cart.php(23): Cart->total()   |   in /var/www/app/Cart.php:23
  {
    re: /#\d+\s+(\S+?\.php)\((\d+)\)(?::\s*(.+))?/,
    map: (m) => ({ file: m[1], line: Number(m[2]), fn: m[3] }),
  },
  {
    re: /in\s+(\S+?\.php)(?::|\s+on\s+line\s+)(\d+)/,
    map: (m) => ({ file: m[1], line: Number(m[2]) }),
  },
  // Ruby:  app/models/cart.rb:12:in `total'   |   app/models/cart.rb:12:in 'total'
  {
    re: /([\w./-]+\.rb):(\d+):in\s+[`'"]?([^'"`]+)/,
    map: (m) => ({ file: m[1], line: Number(m[2]), fn: m[3] }),
  },
  // Go:  /app/routing/router.go:42 +0x1d
  {
    re: /([\w./-]+\.go):(\d+)(?:\s+\+0x[\da-f]+)?/,
    map: (m) => ({ file: m[1], line: Number(m[2]) }),
  },
]

const HEADER_PATTERNS: { re: RegExp; type: number; message: number }[] = [
  // Ruby 3.4:  app/models/cart.rb:4:in 'total': undefined method 'tax_rate' for nil (NoMethodError)
  { re: /^\S+\.rb:\d+:in [`'][^'`]+['`]:\s*(.+?)\s+\(([\w:]+)\)\s*$/, type: 2, message: 1 },
  // TypeError: Cannot read properties of undefined (reading 'discount')
  {
    re: /^\s*(?:Uncaught\s+)?(?:Exception in thread "[^"]*"\s+)?((?:[\w$]+\.)*[A-Z][\w$]*(?:Error|Exception|Panic|Fault)?)\s*:\s*(.+)$/,
    type: 1,
    message: 2,
  },
  // panic: runtime error: index out of range [0] with length 0
  { re: /^\s*(panic):\s*(.+)$/, type: 1, message: 2 },
  // PHP Fatal error:  Uncaught Error: Call to a member function ...
  { re: /^\s*PHP\s+(Fatal error|Warning|Notice):\s*(.+)$/, type: 1, message: 2 },
]

export function parseStackTrace(trace: string): ParsedTrace {
  const lines = trace.split(/\r?\n/)
  const frames: TraceFrame[] = []
  let errorType: string | undefined
  let message: string | undefined

  lines.forEach((raw, lineIndex) => {
    for (const { re, map } of PATTERNS) {
      const m = re.exec(raw)
      if (m) {
        const frame = map(m)
        if (frame.line && Number.isFinite(frame.line)) frames.push({ lineIndex, ...frame })
        return
      }
    }
  })

  // Python puts the error last; most others put it first.
  const candidates = [...lines].filter((l) => l.trim())
  const ordered = /Traceback \(most recent call last\)/.test(trace) ? candidates.reverse() : candidates
  for (const line of ordered) {
    if (/^\s*(at |File "|#\d|Traceback|goroutine)/.test(line)) continue
    for (const { re, type, message: msg } of HEADER_PATTERNS) {
      const m = re.exec(line)
      if (m) {
        errorType = m[type]
        message = m[msg].trim()
        break
      }
    }
    if (errorType) break
  }

  return { errorType, message, frames }
}

/** Line numbers (1-based) in the pasted source that the trace points at. */
export function errorLinesFor(trace: string, sourceLineCount: number): number[] {
  const { frames } = parseStackTrace(trace)
  const out = new Set<number>()
  for (const f of frames) {
    if (f.line && f.line >= 1 && f.line <= sourceLineCount) {
      out.add(f.line)
      break // the innermost frame is the one that matters for the pasted snippet
    }
  }
  return [...out]
}
