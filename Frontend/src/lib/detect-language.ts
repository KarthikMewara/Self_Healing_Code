import type { LanguageKey } from "@/lib/highlight"

// Cheap heuristic language sniffing for pasted code (and file extensions for
// uploads). Scores signals per language and returns the clear winner, or null
// when nothing is convincing -- the UI then just keeps the user's selection.

const SIGNALS: Record<LanguageKey, RegExp[]> = {
  python: [
    /^\s*def \w+\(.*\)\s*(->\s*[\w[\], .]+)?\s*:/m,
    /^\s*(from [\w.]+ )?import [\w., ]+$/m,
    /\belif\b/,
    /\bself\.\w+/,
    /\bNone\b/,
    /^\s*class \w+(\(.*\))?:\s*$/m,
    /\bprint\(/,
    /:\s*\n\s{4}\S/,
  ],
  go: [/^\s*package \w+/m, /\bfunc (\(\w+ \*?\w+\) )?\w*\(/, /:=/, /\bfmt\.\w+/, /\bnil\b/, /\[\]\w+\{/, /\berr != nil\b/],
  java: [
    /\bpublic (static )?(final )?(class|interface|record) \w+/,
    /\bSystem\.out\.print/,
    /\b(private|public|protected)( static)?( final)? [\w<>[\]]+ \w+\s*\(/,
    /@Override/,
    /^\s*import java\./m,
    /\bString\[\] args\b/,
  ],
  csharp: [
    /^\s*using System/m,
    /\bnamespace [\w.]+/,
    /\bConsole\.Write/,
    /\bpublic (async )?(Task|void|int|string|bool)\b/,
    /\{ get; (private )?set; \}/,
    /\bvar \w+ = new \w+/,
  ],
  ruby: [/^\s*def \w+[?!]?(\(.*\))?\s*$/m, /^\s*end\s*$/m, /\bputs\b/, /\bdo \|\w+(, ?\w+)*\|/, /^\s*require ['"]/m, /\battr_(accessor|reader)\b/, /\.each\b/],
  php: [/<\?php/, /\$\w+\s*=/, /->\w+\(/, /\bfunction \w+\(.*\$/, /\becho\b/, /\bnamespace [\w\\]+;/],
  typescript: [
    /:\s*(string|number|boolean|unknown|any|void)\b/,
    /\binterface \w+\s*\{/,
    /\btype \w+\s*=/,
    /\bas const\b/,
    /<\w+(\[\])?>\(/,
    /\bimport type\b/,
    /\w+\?:\s*\w+/,
  ],
  javascript: [/\b(const|let|var) \w+\s*=/, /=>/, /\bfunction\s*\w*\(/, /\bconsole\.\w+\(/, /\brequire\(/, /\bmodule\.exports\b/, /\bexport (default )?(function|const)\b/],
}

export function detectLanguage(code: string): LanguageKey | null {
  if (code.trim().length < 12) return null
  const scores = Object.entries(SIGNALS).map(([lang, patterns]) => ({
    lang: lang as LanguageKey,
    score: patterns.reduce((sum, re) => sum + (re.test(code) ? 1 : 0), 0),
  }))
  // TypeScript is a superset: JS signals shouldn't beat TS-specific ones.
  const ts = scores.find((s) => s.lang === "typescript")!
  const js = scores.find((s) => s.lang === "javascript")!
  if (ts.score > 0) ts.score += js.score * 0.5
  scores.sort((a, b) => b.score - a.score)
  const [best, second] = scores
  if (best.score < 2) return null
  if (second && best.score === second.score) return null
  return best.lang
}

const EXT_MAP: Record<string, LanguageKey> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  go: "go",
  java: "java",
  cs: "csharp",
  rb: "ruby",
  php: "php",
}

export function languageFromFilename(name: string): LanguageKey | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return EXT_MAP[ext] ?? null
}
