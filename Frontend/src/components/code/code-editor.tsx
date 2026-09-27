import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"

import { TokenSpans } from "@/components/code/token-spans"
import { highlightLines, type Token } from "@/lib/highlight"
import { cn } from "@/lib/utils"

// A lightweight code editor: a transparent <textarea> for real editing
// (selection, undo, IME, mobile keyboards) laid exactly over a highlighted
// <pre>. Both share font metrics, padding and scroll position.

const LINE_H = 22
const PAD_Y = 12
// The mirror layers get extra bottom room so they can always scroll as far as
// the textarea does, even when it grows a horizontal scrollbar.
const SCROLLBAR_SLACK = 16

export interface CodeEditorHandle {
  /** Put the caret at the start of a 1-based line, scroll it into view and flash it. */
  focusLine: (line: number) => void
  focus: () => void
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  /** Custom highlighter (e.g. for stack traces). Defaults to the language highlighter. */
  highlighter?: (code: string) => Token[][]
  placeholder?: string
  /** 1-based lines to mark as failing. */
  errorLines?: number[]
  readOnly?: boolean
  /** Sweep a scanning beam across the code (while the AI is analyzing). */
  scanning?: boolean
  onSubmit?: () => void
  onCursorChange?: (pos: { line: number; col: number }) => void
  className?: string
  id?: string
  "aria-label"?: string
  "aria-describedby"?: string
}

function insertText(ta: HTMLTextAreaElement, text: string) {
  ta.focus()
  // execCommand keeps the native undo stack intact; fall back if unsupported.
  const ok = typeof document.execCommand === "function" && document.execCommand("insertText", false, text)
  if (!ok) {
    const { selectionStart: s, selectionEnd: e } = ta
    ta.setRangeText(text, s, e, "end")
    ta.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    value,
    onChange,
    language,
    highlighter,
    placeholder,
    errorLines = [],
    readOnly = false,
    scanning = false,
    onSubmit,
    onCursorChange,
    className,
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
  },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const [activeLine, setActiveLine] = useState(1)
  const [focused, setFocused] = useState(false)
  const [flashLine, setFlashLine] = useState<number | null>(null)

  const lines = useMemo(
    () => (highlighter ? highlighter(value) : highlightLines(value, language)),
    [value, language, highlighter],
  )
  const lineCount = Math.max(1, value.split("\n").length)
  const errors = useMemo(() => new Set(errorLines), [errorLines])
  const unit = language === "go" ? "\t" : language === "python" ? "    " : "  "

  const syncScroll = () => {
    const ta = taRef.current
    if (!ta) return
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop
      preRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
  }

  const updateCursor = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    const before = ta.value.slice(0, ta.selectionStart)
    const line = before.split("\n").length
    const col = ta.selectionStart - before.lastIndexOf("\n")
    setActiveLine(line)
    onCursorChange?.({ line, col })
  }, [onCursorChange])

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    focusLine: (line: number) => {
      const ta = taRef.current
      if (!ta) return
      const all = ta.value.split("\n")
      const target = Math.max(1, Math.min(line, all.length))
      const offset = all.slice(0, target - 1).reduce((sum, l) => sum + l.length + 1, 0)
      ta.focus()
      ta.setSelectionRange(offset, offset)
      ta.scrollTop = Math.max(0, (target - 1) * LINE_H - ta.clientHeight / 2 + LINE_H)
      syncScroll()
      updateCursor()
      setFlashLine(target)
      window.setTimeout(() => setFlashLine(null), 1400)
    },
  }))

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onSubmit?.()
      return
    }
    if (readOnly) return

    if (e.key === "Tab") {
      e.preventDefault()
      const { selectionStart: s, selectionEnd: end, value: v } = ta
      const blockStart = v.lastIndexOf("\n", s - 1) + 1
      const multi = v.slice(s, end).includes("\n")
      if (!multi && !e.shiftKey) {
        insertText(ta, unit)
        return
      }
      // Indent / outdent every selected line.
      const blockEnd = end
      const block = v.slice(blockStart, blockEnd)
      const changed = block
        .split("\n")
        .map((l) => (e.shiftKey ? l.replace(new RegExp(`^(\\t|${" ".repeat(unit === "\t" ? 2 : unit.length)}| {1,3})`), "") : unit + l))
        .join("\n")
      ta.setSelectionRange(blockStart, blockEnd)
      insertText(ta, changed)
      ta.setSelectionRange(blockStart, blockStart + changed.length)
      return
    }

    if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      const { selectionStart: s, value: v } = ta
      const lineStart = v.lastIndexOf("\n", s - 1) + 1
      const current = v.slice(lineStart, s)
      const indent = /^[\t ]*/.exec(current)?.[0] ?? ""
      const opens = language === "python" ? /:\s*$/.test(current) : /[{[(]\s*$/.test(current)
      insertText(ta, `\n${indent}${opens ? unit : ""}`)
    }
  }

  const gutterWidth = `${Math.max(2, String(lineCount).length) + 2.2}ch`

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-lg border border-border bg-background/50 font-mono text-[13px] [font-variant-ligatures:none] transition-shadow duration-300",
        focused && "border-primary/40 shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_14%,transparent)]",
        className,
      )}
    >
      {/* Gutter */}
      <div
        ref={gutterRef}
        aria-hidden
        className="shrink-0 overflow-hidden border-r border-border/60 bg-muted/25 text-right text-muted-foreground/45 tabular-nums select-none"
        style={{ width: gutterWidth, paddingTop: PAD_Y, paddingBottom: PAD_Y + SCROLLBAR_SLACK }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const n = i + 1
          const isError = errors.has(n)
          return (
            <div
              key={n}
              className={cn(
                "relative pr-2.5 transition-colors",
                n === activeLine && focused && "text-foreground",
                isError && "text-destructive",
              )}
              style={{ height: LINE_H, lineHeight: `${LINE_H}px` }}
            >
              {isError && <span className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />}
              {n}
            </div>
          )
        })}
      </div>

      {/* Code */}
      <div className="relative min-w-0 flex-1">
        <pre
          ref={preRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre"
          style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y + SCROLLBAR_SLACK, lineHeight: `${LINE_H}px`, tabSize: 2 }}
        >
          <div className="w-max min-w-full">
            {lines.map((tokens, i) => {
              const n = i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    "px-4 transition-colors duration-300",
                    errors.has(n) && "bg-destructive/10 shadow-[inset_2px_0_0_var(--destructive)]",
                    !errors.has(n) && n === activeLine && focused && "bg-foreground/[0.04]",
                    flashLine === n && "bg-primary/20 shadow-[inset_2px_0_0_var(--primary)]",
                  )}
                  style={{ height: LINE_H }}
                >
                  {tokens.length ? <TokenSpans tokens={tokens} /> : " "}
                </div>
              )
            })}
          </div>
        </pre>

        {!value && placeholder && (
          <pre
            aria-hidden
            className="pointer-events-none absolute inset-0 m-0 overflow-hidden px-4 whitespace-pre text-muted-foreground/45"
            style={{ paddingTop: PAD_Y, lineHeight: `${LINE_H}px` }}
          >
            {placeholder}
          </pre>
        )}

        <textarea
          ref={taRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          onSelect={updateCursor}
          onClick={updateCursor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className="code-input scrollbar-thin absolute inset-0 m-0 resize-none overflow-auto border-0 px-4 whitespace-pre outline-none"
          style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y, lineHeight: `${LINE_H}px` }}
        />

        {scanning && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-primary/[0.03]" />
            <div
              className="animate-scan absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 40%, color-mix(in oklch, var(--primary) 12%, transparent) 48%, color-mix(in oklch, var(--primary) 65%, transparent) 50%, color-mix(in oklch, var(--primary) 12%, transparent) 52%, transparent 60%)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
})
