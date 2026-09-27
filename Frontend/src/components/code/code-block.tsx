import { Check, Copy } from "lucide-react"
import { motion } from "motion/react"
import { useMemo, useState, type ReactNode } from "react"

import { TokenSpans } from "@/components/code/token-spans"
import { highlightLines, LANGUAGE_COLORS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
  /** Extra header content (tabs, badges) placed before the copy button. */
  headerExtra?: ReactNode
  showHeader?: boolean
  showLineNumbers?: boolean
  /** 1-based lines tinted red with a gutter marker. */
  errorLines?: number[]
  /** 1-based lines tinted with the accent. */
  highlightLines?: number[]
  /** Reveal line by line on mount. */
  reveal?: boolean
  className?: string
  bodyClassName?: string
}

/** Read-only, syntax-highlighted code with line numbers and a copy button. */
export function CodeBlock({
  code,
  language,
  filename,
  headerExtra,
  showHeader = true,
  showLineNumbers = true,
  errorLines = [],
  highlightLines: accentLines = [],
  reveal = false,
  className,
  bodyClassName,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const lines = useMemo(() => highlightLines(code, language), [code, language])
  const lang = toLanguageKey(language)
  const errors = new Set(errorLines)
  const accents = new Set(accentLines)

  const copy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card/70", className)}>
      {showHeader && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
          <span className="truncate font-mono text-xs text-muted-foreground">{filename ?? LANGUAGE_LABELS[lang]}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {headerExtra}
            <button
              type="button"
              onClick={copy}
              aria-label="Copy code"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      )}
      <div className={cn("scrollbar-thin overflow-auto py-3 font-mono text-[12.5px] leading-[1.7] [font-variant-ligatures:none]", bodyClassName)}>
        <div className="w-max min-w-full">
          {lines.map((tokens, i) => {
            const n = i + 1
            const row = (
              <div
                className={cn(
                  "flex pr-4",
                  errors.has(n) && "bg-destructive/10 shadow-[inset_2px_0_0_var(--destructive)]",
                  accents.has(n) && "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]",
                )}
              >
                {showLineNumbers && (
                  <span
                    className={cn(
                      "w-10 shrink-0 pr-3 text-right text-muted-foreground/45 select-none",
                      errors.has(n) && "text-destructive",
                    )}
                  >
                    {n}
                  </span>
                )}
                <span className={cn("whitespace-pre", !showLineNumbers && "pl-4")}>
                  {tokens.length ? <TokenSpans tokens={tokens} /> : " "}
                </span>
              </div>
            )
            return reveal ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 40) * 0.035, duration: 0.3 }}
              >
                {row}
              </motion.div>
            ) : (
              <div key={i}>{row}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
