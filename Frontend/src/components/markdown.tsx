import { Check, Copy } from "lucide-react"
import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"

import { TokenSpans } from "@/components/code/token-spans"
import { highlightLines } from "@/lib/highlight"
import { cn } from "@/lib/utils"

const FENCE_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  javascript: "javascript",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  go: "go",
  java: "java",
  cs: "csharp",
  csharp: "csharp",
  rb: "ruby",
  ruby: "ruby",
  php: "php",
}

/** Fenced code inside markdown: highlighted when the language is known, always copyable. */
function Fence({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const language = lang ? FENCE_LANG[lang.toLowerCase()] : undefined
  const lines = useMemo(() => (language ? highlightLines(code, language) : null), [code, language])

  return (
    <div className="group/fence relative overflow-hidden rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        aria-label="Copy code"
        onClick={() => {
          navigator.clipboard?.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover/fence:opacity-100 hover:text-foreground focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="scrollbar-thin overflow-x-auto p-3 font-mono text-xs leading-relaxed [font-variant-ligatures:none]">
        {lines
          ? lines.map((tokens, i) => (
              <div key={i}>
                {tokens.length ? <TokenSpans tokens={tokens} /> : " "}
              </div>
            ))
          : <code className="text-foreground/90">{code}</code>}
      </pre>
    </div>
  )
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          h1: ({ node: _node, ...props }) => <h1 className="text-lg font-semibold text-foreground" {...props} />,
          h2: ({ node: _node, ...props }) => <h2 className="text-base font-semibold text-foreground" {...props} />,
          h3: ({ node: _node, ...props }) => (
            <h3 className="flex items-center gap-2 pt-1 text-[11px] font-semibold tracking-wide text-primary uppercase" {...props} />
          ),
          p: ({ node: _node, ...props }) => <p className="text-sm leading-relaxed text-foreground/90" {...props} />,
          ul: ({ node: _node, ...props }) => <ul className="list-disc space-y-1 pl-5 text-sm marker:text-primary" {...props} />,
          ol: ({ node: _node, ...props }) => <ol className="list-decimal space-y-1 pl-5 text-sm marker:text-primary" {...props} />,
          li: ({ node: _node, ...props }) => <li className="text-foreground/90" {...props} />,
          strong: ({ node: _node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
          em: ({ node: _node, ...props }) => <em className="text-foreground/80" {...props} />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote className="border-l-2 border-info/50 pl-3 text-muted-foreground" {...props} />
          ),
          a: ({ node: _node, ...props }) => <a className="text-primary underline underline-offset-2" {...props} />,
          // Fenced blocks are rendered by `pre` below; this handles inline code.
          code: ({ node: _node, className, children, ...props }) => (
            <code
              className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground", className)}
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ node }) => {
            const codeNode = node?.children?.[0]
            if (codeNode && codeNode.type === "element" && codeNode.tagName === "code") {
              const raw = codeNode.properties?.className
              const classes: string[] = Array.isArray(raw) ? raw.map(String) : []
              const lang = classes.find((c) => c.startsWith("language-"))?.slice("language-".length)
              const text = codeNode.children.map((c) => (c.type === "text" ? c.value : "")).join("")
              return <Fence code={text.replace(/\n$/, "")} lang={lang} />
            }
            return null
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
