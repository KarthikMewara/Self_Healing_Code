import {
  ArrowRight,
  Bug,
  Check,
  ClipboardPaste,
  Copy,
  Eraser,
  FileCode2,
  FileUp,
  History,
  MapPin,
  Sparkles,
  TerminalSquare,
  Wand2,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { PageHeader } from "@/components/app/page-header"
import { Panel } from "@/components/app/panel"
import { CodeEditor, type CodeEditorHandle } from "@/components/code/code-editor"
import { GlowButton } from "@/components/fx/glow-button"
import { TelemetryTracker } from "@/components/healing/telemetry-tracker"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebugWorkspace, type DebugDraft } from "@/context/debug-workspace"
import { detectLanguage, languageFromFilename } from "@/lib/detect-language"
import { EXAMPLES, LANDING_EXAMPLES } from "@/lib/examples"
import { LANGUAGE_COLORS, LANGUAGE_LABELS, toLanguageKey } from "@/lib/highlight"
import { highlightTrace } from "@/lib/highlight-trace"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { errorLinesFor, parseStackTrace } from "@/lib/stack-trace"
import { cn } from "@/lib/utils"
import { SUPPORTED_LANGUAGES } from "@/types/contract"

const SOURCE_PLACEHOLDER = `// Paste the code that's failing — or drop a file anywhere on this page.
export function checkoutTotal(cart) {
  const rate = cart.coupon.percentOff / 100
  return cart.total - cart.total * rate
}`

const TRACE_PLACEHOLDER = `TypeError: Cannot read properties of undefined (reading 'percentOff')
    at checkoutTotal (checkout-service/cart.js:3:28)`

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ReadyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs transition-colors", ok ? "text-foreground" : "text-muted-foreground")}>
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border transition-all duration-300",
          ok ? "border-success bg-success text-success-foreground" : "border-border",
        )}
      >
        <AnimatePresence>
          {ok && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_BOUNCY} className="flex">
              <Check className="size-2.5" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {label}
    </li>
  )
}

function ExamplesMenu({ onPick }: { onPick: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="glass">
            <Wand2 /> Load example
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Realistic bugs, one per language</DropdownMenuLabel>
          {EXAMPLES.map((ex) => (
            <DropdownMenuItem key={ex.id} onClick={() => onPick(ex.id)} className="items-start gap-2.5 py-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: LANGUAGE_COLORS[ex.language] }} />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{ex.title}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">{ex.file}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AIDebuggerPage() {
  const { status, statusEvents, startedAt, finishedAt, errorMessage, result, submit, retry, cancel, draft, setDraft, loadExample } =
    useDebugWorkspace()
  const navigate = useNavigate()
  const editorRef = useRef<CodeEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cursor, setCursor] = useState({ line: 1, col: 1 })
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const prevStatus = useRef(status)
  const [completedHere, setCompletedHere] = useState(false)

  const { language, source, trace, context } = draft
  const lang = toLanguageKey(language)
  const lineCount = source ? source.split("\n").length : 0
  const parsed = useMemo(() => parseStackTrace(trace), [trace])
  const errorLines = useMemo(() => errorLinesFor(trace, lineCount), [trace, lineCount])
  const detected = useMemo(() => detectLanguage(source), [source])
  const analyzing = status === "analyzing"
  const ready = { source: source.trim().length > 0, trace: trace.trim().length > 0 }
  const canAnalyze = ready.source && !analyzing

  // Only jump to the results when a heal finishes *here* -- revisiting this
  // page later with an old result must not bounce you away again.
  useEffect(() => {
    const was = prevStatus.current
    prevStatus.current = status
    if (was === "analyzing" && status === "complete") {
      setCompletedHere(true)
      const t = setTimeout(() => navigate("/self-healing"), 1100)
      return () => clearTimeout(t)
    }
  }, [status, navigate])

  const analyze = useCallback(() => {
    if (!canAnalyze) {
      toast.error("Add the code that's failing first.")
      return
    }
    setCompletedHere(false)
    const effectiveTrace = trace.trim() || "Analyze code for runtime exceptions, syntax errors, and edge-case bugs"
    submit({ language: lang, source_code: source, error_trace: effectiveTrace, user_context: context.trim() || undefined })
  }, [canAnalyze, submit, lang, source, trace, context])

  // Cmd/Ctrl+Enter anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        analyze()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [analyze])

  const pickExample = (id: string) => {
    loadExample(id)
    const ex = EXAMPLES.find((e) => e.id === id)
    toast.success(`Loaded “${ex?.title}”`, { description: `${ex ? LANGUAGE_LABELS[ex.language] : ""} · press ${MOD_KEY}+Enter to heal it` })
  }

  const loadFile = async (file: File) => {
    if (file.size > 512_000) {
      toast.error("That file is over 500 KB — paste just the failing function instead.")
      return
    }
    const text = await file.text()
    if (/\.(log|txt|trace)$/i.test(file.name) && parseStackTrace(text).frames.length > 0) {
      setDraft({ trace: text })
      toast.success(`Loaded ${file.name} as the error trace`)
      return
    }
    const fileLang = languageFromFilename(file.name) ?? detectLanguage(text)
    setDraft({ source: text, exampleId: undefined, ...(fileLang ? { language: fileLang } : {}) })
    toast.success(`Loaded ${file.name}`, fileLang ? { description: `Detected ${LANGUAGE_LABELS[fileLang]}` } : undefined)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.info("Your clipboard is empty.")
        return
      }
      const pastedLang = detectLanguage(text)
      setDraft({ source: text, exampleId: undefined, ...(pastedLang ? { language: pastedLang } : {}) })
      toast.success("Pasted from clipboard", pastedLang ? { description: `Detected ${LANGUAGE_LABELS[pastedLang]}` } : undefined)
    } catch {
      toast.error(`Clipboard access was blocked — click in the editor and press ${MOD_KEY}+V instead.`)
    }
  }

  const clearAll = () => {
    const snapshot: DebugDraft = { ...draft }
    setDraft({ source: "", trace: "", context: "", exampleId: undefined })
    toast("Cleared the workspace", { action: { label: "Undo", onClick: () => setDraft(snapshot) } })
  }

  const jumpTo = (line?: number) => {
    if (!line) return
    if (line > lineCount) {
      toast.info(`That frame points at line ${line}, outside the ${lineCount}-line snippet you pasted.`)
      return
    }
    editorRef.current?.focusLine(line)
  }

  const showTracker = analyzing || status === "error" || (status === "complete" && completedHere)
  const missingHint = !ready.source
    ? "Paste the failing code to continue"
    : detected && detected !== lang
      ? `Heads up: this looks like ${LANGUAGE_LABELS[detected]}`
      : ready.trace
        ? "Ready — error trace attached for targeted precision"
        : "Ready — the engine streams every step as it works (Error trace optional)"

  return (
    <div
      className="space-y-6"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return
        dragDepth.current++
        setDragging(true)
      }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) void loadFile(file)
      }}
    >
      <PageHeader
        icon={Bug}
        title="AI Debugger"
        description="Paste broken code and the error it throws. The engine streams its reasoning live, then hands you a tested fix."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="glass gap-1.5" render={<Link to="/history" />}>
              <History className="size-3.5 text-primary" /> Past Sessions
            </Button>
            <ExamplesMenu onPick={pickExample} />
          </div>
        }
      />

      <AnimatePresence>
        {status === "complete" && result && !completedHere && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="glass flex flex-wrap items-center gap-3 rounded-xl border border-success/30 px-4 py-3"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-success/15 text-success">
              <Check className="size-4" />
            </span>
            <p className="text-sm text-foreground">
              Your last heal is ready <span className="font-mono text-xs text-muted-foreground">{result.session_id}</span>
            </p>
            <Button size="sm" variant="outline" className="ml-auto" render={<Link to="/self-healing" />}>
              Review the fix <ArrowRight />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* Source code */}
        <Panel
          title="Source code"
          icon={FileCode2}
          padded={false}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              <AnimatePresence>
                {detected && detected !== lang && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setDraft({ language: detected })}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2.5 text-[11px] font-medium text-info transition-colors hover:bg-info/20"
                  >
                    <Sparkles className="size-3" /> Looks like {LANGUAGE_LABELS[detected]} — switch
                  </motion.button>
                )}
              </AnimatePresence>
              <Select value={lang} onValueChange={(v) => v && setDraft({ language: v })}>
                <SelectTrigger size="sm" className="w-36" aria-label="Language">
                  <SelectValue>
                    {(v: string) => (
                      <>
                        <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[toLanguageKey(v)] }} />
                        {LANGUAGE_LABELS[toLanguageKey(v)]}
                      </>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[l] }} />
                      {LANGUAGE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void loadFile(file)
                  e.target.value = ""
                }}
              />
              <ToolButton label="Upload a file" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="size-3.5" />
              </ToolButton>
              <ToolButton label="Paste from clipboard" onClick={() => void pasteFromClipboard()}>
                <ClipboardPaste className="size-3.5" />
              </ToolButton>
              <ToolButton
                label="Copy code"
                onClick={() => {
                  if (!source) return toast.info("Nothing to copy yet.")
                  navigator.clipboard?.writeText(source)
                  toast.success("Code copied")
                }}
              >
                <Copy className="size-3.5" />
              </ToolButton>
              <ToolButton label="Clear everything" onClick={clearAll}>
                <Eraser className="size-3.5" />
              </ToolButton>
            </div>
          }
        >
          <CodeEditor
            ref={editorRef}
            id="source"
            aria-label="Source code"
            value={source}
            onChange={(v) => setDraft({ source: v, exampleId: undefined })}
            language={lang}
            placeholder={SOURCE_PLACEHOLDER}
            errorLines={errorLines}
            readOnly={analyzing}
            scanning={analyzing}
            onSubmit={analyze}
            onCursorChange={setCursor}
            className="h-[440px] rounded-none border-0 bg-transparent"
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 bg-muted/25 px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span>{lineCount} lines</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[lang] }} />
              {LANGUAGE_LABELS[lang]}
            </span>
            {errorLines.length > 0 && (
              <button type="button" onClick={() => jumpTo(errorLines[0])} className="flex items-center gap-1 text-destructive hover:underline">
                <span className="size-1.5 rounded-full bg-destructive" /> failing line {errorLines[0]}
              </button>
            )}
            {!source && (
              <span className="flex flex-wrap items-center gap-1.5 font-sans">
                Try:
                {LANDING_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => pickExample(ex.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <span className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[ex.language] }} />
                    {LANGUAGE_LABELS[ex.language]}
                  </button>
                ))}
              </span>
            )}
            <span className="ml-auto hidden font-sans sm:inline">Drop a file anywhere to load it</span>
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Error trace */}
          <Panel
            title="Error trace"
            icon={TerminalSquare}
            padded={false}
            action={
              parsed.errorType ? (
                <span className="max-w-48 truncate rounded-full bg-destructive/12 px-2.5 py-1 font-mono text-[11px] font-medium text-destructive">
                  {parsed.errorType}
                </span>
              ) : undefined
            }
          >
            <CodeEditor
              id="trace"
              aria-label="Error trace"
              value={trace}
              onChange={(v) => setDraft({ trace: v })}
              language="plain"
              highlighter={highlightTrace}
              placeholder={TRACE_PLACEHOLDER}
              readOnly={analyzing}
              onSubmit={analyze}
              className="h-[200px] rounded-none border-0 bg-transparent text-[12px]"
            />
            {parsed.frames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2.5">
                <span className="text-[11px] text-muted-foreground">Frames:</span>
                {parsed.frames.slice(0, 6).map((f, i) => {
                  const inRange = !!f.line && f.line <= lineCount
                  return (
                    <button
                      key={`${f.lineIndex}-${i}`}
                      type="button"
                      onClick={() => jumpTo(f.line)}
                      title={inRange ? `Jump to line ${f.line}` : "Outside the pasted snippet"}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors",
                        inRange
                          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">
                        {f.file?.split(/[\\/]/).pop()}:{f.line}
                        {f.fn ? ` · ${f.fn.split(".").pop()}` : ""}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

          {/* Run panel ⇄ live telemetry */}
          <AnimatePresence mode="wait" initial={false}>
            {showTracker ? (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <TelemetryTracker
                  orientation="vertical"
                  events={statusEvents}
                  status={status}
                  startedAt={startedAt}
                  finishedAt={finishedAt}
                  errorMessage={errorMessage}
                  onCancel={cancel}
                  onRetry={retry}
                  onEdit={cancel}
                />
              </motion.div>
            ) : (
              <motion.div
                key="run"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <Panel title="Context & run" icon={Sparkles}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="context" className="text-xs font-medium text-muted-foreground">
                        Additional context <span className="font-normal">(optional)</span>
                      </label>
                      <Input
                        id="context"
                        value={context}
                        onChange={(e) => setDraft({ context: e.target.value })}
                        placeholder="e.g. Only fails when the cart has no coupon"
                        className="bg-background/50"
                      />
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Readiness">
                      <ReadyItem ok label={`${LANGUAGE_LABELS[lang]} selected`} />
                      <ReadyItem ok={ready.source} label="Source code" />
                      <ReadyItem ok={ready.trace} label={ready.trace ? "Error trace" : "Error trace (optional)"} />
                    </ul>
                    <GlowButton size="lg" className="h-11 w-full text-[0.95rem]" disabled={!canAnalyze} onClick={analyze}>
                      <Sparkles className="size-4" /> Analyze & heal
                      <span className="ml-2 hidden gap-0.5 opacity-80 sm:inline-flex">
                        <Kbd className="border-white/30 bg-white/15 text-inherit">{MOD_KEY}</Kbd>
                        <Kbd className="border-white/30 bg-white/15 text-inherit">↵</Kbd>
                      </span>
                    </GlowButton>
                    <p className={cn("text-center text-xs", canAnalyze ? "text-muted-foreground" : "text-warning")}>{missingHint}</p>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Drop overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/60 bg-card/80 px-8 py-12 text-center shadow-2xl"
            >
              <FileUp className="animate-float-y size-10 text-primary" />
              <p className="text-base font-semibold text-foreground">Drop to load it</p>
              <p className="text-sm text-muted-foreground">Code files load into the editor; a .log with a stack trace loads into the trace.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
