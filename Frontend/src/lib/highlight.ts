// A small, dependency-free syntax highlighter for the 8 supported languages.
// Good enough to make code, diffs and stack traces read like a real editor,
// and fully under our control so individual tokens/lines can be animated.
//
// The whole snippet is tokenized at once (so block comments and multi-line
// strings are coloured correctly) and then split into lines.

export type TokenType =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "type"
  | "constant"
  | "operator"
  | "punctuation"
  | "property"
  | "decorator"
  // Used by the stack-trace highlighter:
  | "error"
  | "path"

export interface Token {
  type: TokenType
  value: string
}

export type LanguageKey = "javascript" | "typescript" | "python" | "go" | "java" | "csharp" | "ruby" | "php"

interface LanguageSpec {
  keywords: Set<string>
  constants: Set<string>
  builtinTypes?: Set<string>
  lineComment: string[]
  blockComment?: [string, string]
  /** Characters that open a string. */
  quotes: string[]
  tripleQuotes?: boolean
  /** `@name` decorators / annotations / instance vars. */
  decorators?: boolean
  /** `$name` variables (PHP). */
  dollarVars?: boolean
  /** `:symbol` literals (Ruby). */
  symbols?: boolean
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean))

const JS_KEYWORDS =
  "break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await get set as"

const LANGS: Record<LanguageKey, LanguageSpec> = {
  javascript: {
    keywords: words(JS_KEYWORDS),
    constants: words("true false null undefined NaN Infinity"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
  },
  typescript: {
    keywords: words(
      `${JS_KEYWORDS} interface type enum implements private public protected readonly declare namespace abstract keyof infer satisfies is`,
    ),
    constants: words("true false null undefined NaN Infinity"),
    builtinTypes: words("string number boolean any unknown never void object bigint symbol Record Partial Promise Array"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
    decorators: true,
  },
  python: {
    keywords: words(
      "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
    ),
    constants: words("True False None self cls"),
    builtinTypes: words("int str float bool dict list tuple set bytes object Exception"),
    lineComment: ["#"],
    quotes: ['"', "'"],
    tripleQuotes: true,
    decorators: true,
  },
  go: {
    keywords: words(
      "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
    ),
    constants: words("true false nil iota"),
    builtinTypes: words("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
  },
  java: {
    keywords: words(
      "abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static super switch synchronized this throw throws transient try volatile while var record",
    ),
    constants: words("true false null"),
    builtinTypes: words("int long short byte char boolean double float void String Object Integer List Map Optional"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'"],
    decorators: true,
  },
  csharp: {
    keywords: words(
      "abstract as async await base break case catch class const continue default delegate do else enum event explicit extern finally fixed for foreach get if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed set sizeof static struct switch this throw try typeof unchecked unsafe using var virtual void volatile while record init",
    ),
    constants: words("true false null"),
    builtinTypes: words("int long short byte char bool double float decimal string object dynamic Task List Dictionary"),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'"],
    decorators: false,
  },
  ruby: {
    keywords: words(
      "alias and begin break case class def defined? do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield require require_relative attr_accessor attr_reader private",
    ),
    constants: words("true false nil"),
    lineComment: ["#"],
    quotes: ['"', "'"],
    decorators: true,
    symbols: true,
  },
  php: {
    keywords: words(
      "abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile extends final finally fn for foreach function global if implements include instanceof insteadof interface isset list match namespace new or print private protected public readonly require return static switch throw trait try unset use var while yield",
    ),
    constants: words("true false null TRUE FALSE NULL"),
    builtinTypes: words("int float string bool array object mixed void"),
    lineComment: ["//", "#"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'"],
    dollarVars: true,
  },
}

export const LANGUAGE_LABELS: Record<LanguageKey, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  java: "Java",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
}

export const LANGUAGE_EXTENSIONS: Record<LanguageKey, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  go: "go",
  java: "java",
  csharp: "cs",
  ruby: "rb",
  php: "php",
}

/** Brand-ish dot colours used on chips and cards. */
export const LANGUAGE_COLORS: Record<LanguageKey, string> = {
  javascript: "#f7df1e",
  typescript: "#3178c6",
  python: "#3572a5",
  go: "#00add8",
  java: "#e76f00",
  csharp: "#9b4f96",
  ruby: "#cc342d",
  php: "#777bb4",
}

export function toLanguageKey(value: string | null | undefined): LanguageKey {
  const v = (value ?? "").toLowerCase().replace(/\s+/g, "")
  if (v === "c#" || v === "cs" || v === "csharp") return "csharp"
  if (v === "js" || v === "javascript" || v === "node") return "javascript"
  if (v === "ts" || v === "typescript") return "typescript"
  if (v === "py" || v === "python") return "python"
  if (v === "golang" || v === "go") return "go"
  if (v === "rb" || v === "ruby") return "ruby"
  if (v === "java") return "java"
  if (v === "php") return "php"
  return "javascript"
}

const IDENT_START = /[A-Za-z_$]/
const IDENT = /[\w$]/
const OPERATORS = "+-*/%=!<>&|^~?:"
const PUNCTUATION = "{}()[];,."

function startsWithAt(code: string, i: number, token: string) {
  return code.startsWith(token, i)
}

/** Tokenize a whole snippet into a flat token list (newlines kept inside tokens). */
export function tokenize(code: string, language: string): Token[] {
  const spec = LANGS[toLanguageKey(language)]
  const tokens: Token[] = []
  const push = (type: TokenType, value: string) => {
    if (!value) return
    const prev = tokens[tokens.length - 1]
    if (prev && prev.type === type && (type === "plain" || type === "punctuation")) prev.value += value
    else tokens.push({ type, value })
  }

  let i = 0
  const n = code.length
  while (i < n) {
    const ch = code[i]

    // Block comment
    if (spec.blockComment && startsWithAt(code, i, spec.blockComment[0])) {
      const end = code.indexOf(spec.blockComment[1], i + spec.blockComment[0].length)
      const stop = end === -1 ? n : end + spec.blockComment[1].length
      push("comment", code.slice(i, stop))
      i = stop
      continue
    }

    // Line comment
    const lineComment = spec.lineComment.find((c) => startsWithAt(code, i, c))
    if (lineComment) {
      const end = code.indexOf("\n", i)
      const stop = end === -1 ? n : end
      push("comment", code.slice(i, stop))
      i = stop
      continue
    }

    // Triple-quoted strings (Python docstrings)
    if (spec.tripleQuotes && (startsWithAt(code, i, '"""') || startsWithAt(code, i, "'''"))) {
      const q = code.slice(i, i + 3)
      const end = code.indexOf(q, i + 3)
      const stop = end === -1 ? n : end + 3
      push("string", code.slice(i, stop))
      i = stop
      continue
    }

    // Strings
    if (spec.quotes.includes(ch)) {
      let j = i + 1
      while (j < n) {
        if (code[j] === "\\") {
          j += 2
          continue
        }
        if (code[j] === ch) {
          j++
          break
        }
        // Only backtick strings may span lines.
        if (code[j] === "\n" && ch !== "`") break
        j++
      }
      push("string", code.slice(i, j))
      i = j
      continue
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(code[i + 1] ?? ""))) {
      const m = /^(0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?[a-zA-Z]*|\.\d+)/.exec(code.slice(i, i + 40))
      if (m) {
        push("number", m[0])
        i += m[0].length
        continue
      }
    }

    // Decorators / annotations / instance variables
    if (spec.decorators && ch === "@" && IDENT_START.test(code[i + 1] ?? "")) {
      let j = i + 1
      while (j < n && (IDENT.test(code[j]) || code[j] === ".")) j++
      push("decorator", code.slice(i, j))
      i = j
      continue
    }

    // PHP variables
    if (spec.dollarVars && ch === "$" && IDENT_START.test(code[i + 1] ?? "")) {
      let j = i + 1
      while (j < n && IDENT.test(code[j])) j++
      push("property", code.slice(i, j))
      i = j
      continue
    }

    // Ruby symbols
    if (spec.symbols && ch === ":" && IDENT_START.test(code[i + 1] ?? "") && code[i - 1] !== ":") {
      let j = i + 1
      while (j < n && IDENT.test(code[j])) j++
      push("constant", code.slice(i, j))
      i = j
      continue
    }

    // Identifiers
    if (IDENT_START.test(ch)) {
      let j = i + 1
      while (j < n && IDENT.test(code[j])) j++
      // Ruby predicate / bang methods
      if (spec.symbols && (code[j] === "?" || code[j] === "!") && code[j + 1] !== "=") j++
      const word = code.slice(i, j)
      let k = j
      while (k < n && (code[k] === " " || code[k] === "\t")) k++
      const next = code[k]
      let p = i - 1
      while (p >= 0 && (code[p] === " " || code[p] === "\t")) p--
      const prev = code[p]

      let type: TokenType = "plain"
      if (spec.keywords.has(word)) type = "keyword"
      else if (spec.constants.has(word)) type = "constant"
      else if (next === "(") type = "function"
      else if (spec.builtinTypes?.has(word)) type = "type"
      else if (/^[A-Z]/.test(word)) type = /^[A-Z0-9_]+$/.test(word) && word.length > 1 ? "constant" : "type"
      else if (prev === "." || (prev === ">" && code[p - 1] === "-")) type = "property"
      push(type, word)
      i = j
      continue
    }

    if (OPERATORS.includes(ch)) {
      let j = i + 1
      while (j < n && OPERATORS.includes(code[j])) j++
      push("operator", code.slice(i, j))
      i = j
      continue
    }

    if (PUNCTUATION.includes(ch)) {
      push("punctuation", ch)
      i++
      continue
    }

    push("plain", ch)
    i++
  }
  return tokens
}

/** Tokenize, then split into per-line token arrays. */
export function highlightLines(code: string, language: string): Token[][] {
  const lines: Token[][] = [[]]
  for (const token of tokenize(code, language)) {
    const parts = token.value.split("\n")
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ type: token.type, value: part })
    })
  }
  return lines
}
