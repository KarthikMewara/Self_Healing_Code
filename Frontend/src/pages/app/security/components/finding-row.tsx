import { ArchiveRestore, ChevronDown, EyeOff, WandSparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { Ref } from "react"

import { CodeBlock } from "@/components/code/code-block"
import { formatStamp } from "@/components/insights/format"
import { severityTone, StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { FindingDetail } from "@/services/mock/security"

import { SEVERITY, tint } from "./severity"

interface FindingRowProps {
  finding: FindingDetail
  expanded: boolean
  ignored: boolean
  onToggle: () => void
  onFix: () => void
  onIgnore: () => void
  onRestore: () => void
  /** Attached by AnimatePresence (popLayout) to measure the row as it leaves. */
  ref?: Ref<HTMLLIElement>
}

export function FindingRow({ ref, finding: f, expanded, ignored, onToggle, onFix, onIgnore, onRestore }: FindingRowProps) {
  const s = SEVERITY[f.severity]
  const detailsId = `finding-${f.id}-details`

  return (
    <motion.li
      ref={ref}
      layout="position"
      id={`finding-${f.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "relative scroll-mt-24 overflow-hidden rounded-xl border bg-card/40 transition-colors",
        expanded ? "border-border bg-card/70" : "border-border hover:bg-card/60",
        ignored && "opacity-75",
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: s.color }} />
      <div className="flex flex-wrap items-start gap-3 p-3 pl-4 md:flex-nowrap">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: tint(s.color), color: s.color }}
        >
          <s.icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] md:basis-auto">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-foreground">{f.title}</p>
            <StatusBadge tone={severityTone(f.severity)}>{s.label}</StatusBadge>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{f.cwe}</span>
            {f.isNew && (
              <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">New</span>
            )}
            {ignored && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Ignored
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={`${f.file}:${f.line}`}>
            {f.file}:{f.line}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {f.project} · detected {formatStamp(f.detectedAt)} · {f.rule}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-1.5 pl-11 md:w-auto md:shrink-0 md:flex-nowrap md:pl-0">
          <Button size="sm" variant="ghost" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}>
            <ChevronDown className={cn("transition-transform duration-300", expanded && "rotate-180")} />
            {expanded ? "Hide details" : "View details"}
          </Button>
          <Button size="sm" onClick={onFix}>
            <WandSparkles /> Fix this
          </Button>
          {ignored ? (
            <Button size="sm" variant="outline" onClick={onRestore}>
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onIgnore}>
              <EyeOff /> Ignore
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailsId}
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 border-t border-border/70 p-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <p className="text-sm text-muted-foreground">{f.description}</p>

                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">Remediation</p>
                  <ol className="space-y-2">
                    {f.remediation.map((step, i) => (
                      <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0 rounded-lg bg-muted/40 p-2">
                    <dt className="text-muted-foreground">File</dt>
                    <dd className="truncate font-mono text-foreground" title={f.file}>
                      {f.file}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <dt className="text-muted-foreground">Detected</dt>
                    <dd className="text-foreground">{formatStamp(f.detectedAt)}, 2026</dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 p-2">
                    <dt className="text-muted-foreground">{f.cwe}</dt>
                    <dd className="text-foreground">{f.cweName}</dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 p-2">
                    <dt className="text-muted-foreground">Rule</dt>
                    <dd className="truncate text-foreground" title={f.rule}>
                      {f.rule}
                    </dd>
                  </div>
                </dl>
              </div>

              <CodeBlock
                code={f.excerpt.code}
                language={f.language}
                filename={f.excerpt.file}
                errorLines={[f.excerpt.errorLine]}
                showLineNumbers={false}
                className="min-w-0 self-start"
                bodyClassName="max-h-72"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
