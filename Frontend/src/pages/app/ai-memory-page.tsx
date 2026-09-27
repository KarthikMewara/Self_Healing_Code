import { Brain, Bug, Database, Loader2, Network, Search, SearchX, Sparkles, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Kbd } from "@/components/app/kbd"
import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { Panel } from "@/components/app/panel"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { EmptyState } from "@/components/empty-state"
import { NumberTicker } from "@/components/fx/number-ticker"
import { Reveal } from "@/components/fx/reveal"
import { MemoryCaseCard } from "@/components/memory/memory-case-card"
import { MemoryCaseSheet } from "@/components/memory/memory-case-sheet"
import { MemoryGraph } from "@/components/memory/memory-graph"
import { LanguageDot, LanguageLabel } from "@/components/projects/language-chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { findExample } from "@/lib/examples"
import { toLanguageKey } from "@/lib/highlight"
import { EASE_OUT, SPRING, SPRING_SOFT } from "@/lib/motion"
import { searchHistoricalFixes } from "@/services/heal-api"
import { ERROR_FAMILIES, findMemoryCase, memoryRecords, type MemoryRecord } from "@/services/mock/memory"

type SortKey = "match" | "recent" | "recalled"

const LANGUAGES = Object.entries(
  memoryRecords.reduce<Record<string, number>>((acc, c) => {
    acc[c.language] = (acc[c.language] ?? 0) + 1
    return acc
  }, {}),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

const FAMILY_ITEMS = {
  all: "All error types",
  ...Object.fromEntries(ERROR_FAMILIES.map((f) => [f.type, f.type])),
}

const TOTAL_RECALLS = memoryRecords.reduce((sum, c) => sum + c.recalls, 0)

export default function AIMemoryPage() {
  const ready = usePreviewLoad("ai-memory")
  const navigate = useNavigate()
  const { loadExample, setDraft } = useDebugWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [language, setLanguage] = useState("all")
  const [family, setFamily] = useState("all")
  const [sort, setSort] = useState<SortKey>("match")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [shown, setShown] = useState<MemoryRecord | null>(null)
  const [staggered, setStaggered] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Live ChromaDB Semantic Search Simulator
  const [showLiveSearch, setShowLiveSearch] = useState(false)
  const [searchCode, setSearchCode] = useState("def divide(a, b):\n    return a / b")
  const [searchTrace, setSearchTrace] = useState("ZeroDivisionError: division by zero")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{ status: string; matches: string[]; metadata: any[] } | null>(null)
  const [searchLatency, setSearchLatency] = useState(0)

  const handleRunSearch = async () => {
    if (!searchCode.trim() || !searchTrace.trim()) return
    setIsSearching(true)
    const start = performance.now()
    try {
      const res = await searchHistoricalFixes(searchCode, searchTrace)
      setSearchResults(res)
      const lat = Math.round(performance.now() - start)
      setSearchLatency(lat)
      toast.success(`ChromaDB matched ${res.matches?.length || 0} historical vectors in ${lat}ms`)
    } catch (err: any) {
      toast.error(`Vector search failed: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const selected = findMemoryCase(searchParams.get("case")) ?? null
  // Keep the last case around so the sheet's exit animation has content.
  if (selected && selected !== shown) setShown(selected)

  const setCase = (id: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set("case", id)
        else next.delete("case")
        return next
      },
      { replace: true },
    )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = memoryRecords.filter(
      (c) =>
        (language === "all" || c.language === language) &&
        (family === "all" || c.errorType === family) &&
        (!q ||
          `${c.title} ${c.errorType} ${c.language} ${c.projectName} ${c.rootCause} ${c.fixSummary}`.toLowerCase().includes(q)),
    )
    return [...list].sort((a, b) => {
      if (sort === "recent") return b.resolvedAt.localeCompare(a.resolvedAt) || b.similarity - a.similarity
      if (sort === "recalled") return b.recalls - a.recalls || b.similarity - a.similarity
      return b.similarity - a.similarity
    })
  }, [query, language, family, sort])

  const visibleIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered])
  const filtersActive = query.trim() !== "" || language !== "all" || family !== "all"

  useEffect(() => {
    if (!ready || staggered) return
    const t = setTimeout(() => setStaggered(true), 900)
    return () => clearTimeout(t)
  }, [ready, staggered])

  // "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const clearFilters = () => {
    setQuery("")
    setLanguage("all")
    setFamily("all")
  }

  const reuse = (record: MemoryRecord) => {
    const example = record.exampleId ? findExample(record.exampleId) : undefined
    if (example) {
      loadExample(example.id)
    } else {
      setDraft({
        language: toLanguageKey(record.language),
        source: record.before,
        trace: record.trace,
        context: record.context,
        exampleId: undefined,
      })
    }
    toast.success("Loaded into the AI Debugger", {
      description: example ? `Curated example · ${example.title}` : record.title,
    })
    navigate("/debugger")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Memory"
        icon={Brain}
        tone="info"
        badge={<PreviewBadge />}
        description={
          <>
            The semantic layer: resolved cases the AI recalls to fix similar bugs faster. For the literal log of every
            session and repair, see{" "}
            <Link to="/history" className="text-primary hover:underline">
              History
            </Link>
            .
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={showLiveSearch ? "default" : "outline"}
              onClick={() => setShowLiveSearch(!showLiveSearch)}
              className="gap-1.5"
            >
              <Database className="size-3.5" />
              {showLiveSearch ? "Hide Vector Query Tool" : "Live ChromaDB Search"}
            </Button>
            <Button variant="outline" render={<Link to="/debugger" />}>
              <Bug className="size-3.5" /> Open AI Debugger
            </Button>
          </div>
        }
      />

      {!ready ? (
        <PageSkeleton layout="charts" />
      ) : (
        <>
          <AnimatePresence>
            {showLiveSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <Panel
                  title="Live ChromaDB Vector Search Simulator"
                  description="Test top-3 cosine similarity retrieval against company_code_fixes collection (FastAPI port 8000)."
                  action={
                    searchLatency > 0 && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-success border border-success/30">
                        {searchLatency}ms query latency
                      </span>
                    )
                  }
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Target Buggy Code Snippet</label>
                        <textarea
                          rows={3}
                          value={searchCode}
                          onChange={(e) => setSearchCode(e.target.value)}
                          className="w-full rounded-md border border-border bg-background/80 p-2.5 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Error Trace / Exception</label>
                        <textarea
                          rows={3}
                          value={searchTrace}
                          onChange={(e) => setSearchTrace(e.target.value)}
                          className="w-full rounded-md border border-border bg-background/80 p-2.5 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-mono">
                        Vector Model: <span className="text-foreground">all-MiniLM-L6-v2 (384-dim)</span>
                      </p>
                      <Button
                        onClick={handleRunSearch}
                        disabled={isSearching || !searchCode.trim()}
                        className="gap-2"
                      >
                        {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        {isSearching ? "Querying ChromaDB..." : "Run Vector RAG Search"}
                      </Button>
                    </div>

                    {searchResults && (
                      <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            ChromaDB Top Matches ({searchResults.matches?.length || 0} retrieved documents):
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">{searchLatency} ms</span>
                        </div>
                        <div className="grid gap-3">
                          {searchResults.matches?.map((match, idx) => (
                            <div key={idx} className="rounded-md border border-border/80 bg-muted/30 p-3 space-y-1.5 text-xs font-mono">
                              <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                                <span>RANK #{idx + 1} MATCH</span>
                                {searchResults.metadata?.[idx]?.language && (
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    {searchResults.metadata[idx].language}
                                  </span>
                                )}
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">
                                {match}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          <Reveal y={8} blur={false}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("")
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Search cases, root causes…"
                  aria-label="Search memory"
                  className="h-8 pr-9 pl-8"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
                )}
              </div>

              <div className="no-scrollbar max-w-full overflow-x-auto">
                <SegmentedControl
                  size="sm"
                  aria-label="Filter by language"
                  value={language}
                  onChange={setLanguage}
                  options={[
                    { value: "all", label: "All", count: memoryRecords.length },
                    ...LANGUAGES.map(([lang, count]) => ({
                      value: lang,
                      label: lang,
                      icon: <LanguageDot language={lang} className="size-1.5" />,
                      count,
                    })),
                  ]}
                />
              </div>

              <Select value={family} onValueChange={(v) => v && setFamily(v)} items={FAMILY_ITEMS}>
                <SelectTrigger className="h-8 min-w-40" aria-label="Filter by error type">
                  <SelectValue>
                    {(v: string) => (v === "all" ? "All error types" : <span className="font-mono text-[13px]">{v}</span>)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All error types</SelectItem>
                  {ERROR_FAMILIES.map((f) => (
                    <SelectItem key={f.type} value={f.type}>
                      <span className="font-mono text-[13px]">{f.type}</span>
                      <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">{f.count}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <SegmentedControl
                size="sm"
                aria-label="Sort cases"
                className="ml-auto"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "match", label: "Best match" },
                  { value: "recent", label: "Recent" },
                  { value: "recalled", label: "Most recalled" },
                ]}
              />
            </div>
          </Reveal>

          <Reveal y={12} delay={0.05}>
            <Panel
              padded={false}
              title="Memory graph"
              icon={Network}
              description="Cases cluster around their error family — the closer to the hub, the stronger the match. Hover to trace one, click to open it."
              action={
                <dl className="flex items-center gap-4 text-right">
                  {[
                    { label: "cases", value: memoryRecords.length },
                    { label: "families", value: ERROR_FAMILIES.length },
                    { label: "recalls", value: TOTAL_RECALLS },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dd className="text-sm font-semibold text-foreground">
                        <NumberTicker value={stat.value} startOnView={false} className="normal-nums" />
                      </dd>
                      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{stat.label}</dt>
                    </div>
                  ))}
                </dl>
              }
            >
              <div className="relative overflow-hidden">
                <div
                  aria-hidden
                  className="bg-dot-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info/10 blur-3xl"
                />
                <MemoryGraph
                  cases={memoryRecords}
                  families={ERROR_FAMILIES}
                  visibleIds={visibleIds}
                  hoveredId={hoveredId}
                  selectedId={selected?.id ?? null}
                  activeFamily={family === "all" ? null : family}
                  onHover={setHoveredId}
                  onSelect={setCase}
                  onFamilyClick={(type) => setFamily((f) => (f === type ? "all" : type))}
                  className="relative mx-auto max-w-5xl px-2 py-3"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {LANGUAGES.map(([lang]) => (
                    <LanguageLabel key={lang} language={lang} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Click a family hub to filter · pulses show the AI recalling a case</p>
              </div>
            </Panel>
          </Reveal>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No cases match"
              description={
                query.trim()
                  ? `Nothing in memory matches “${query.trim()}” with the current filters.`
                  : "No remembered case matches the current filters."
              }
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((record, i) => (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2, ease: EASE_OUT } }}
                    transition={{ default: { ...SPRING_SOFT, delay: staggered ? 0 : 0.1 + i * 0.045 }, layout: SPRING }}
                    className="min-w-0"
                  >
                    <MemoryCaseCard
                      record={record}
                      highlighted={hoveredId === record.id}
                      selected={selected?.id === record.id}
                      onHover={setHoveredId}
                      onSelect={setCase}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {filtersActive && filtered.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Showing {filtered.length} of {memoryRecords.length} cases ·{" "}
              <button type="button" onClick={clearFilters} className="text-primary hover:underline">
                Clear filters
              </button>
            </p>
          )}
        </>
      )}

      <MemoryCaseSheet
        record={selected ?? shown}
        open={ready && Boolean(selected)}
        onOpenChange={(open) => !open && setCase(null)}
        onReuse={reuse}
      />
    </div>
  )
}
