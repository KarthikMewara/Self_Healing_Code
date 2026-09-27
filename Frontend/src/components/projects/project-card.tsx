import { Activity, Archive, ArrowUpRight, Clock, Ellipsis, Pencil, Trash } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router-dom"

import { ProgressRing } from "@/components/app/progress-ring"
import { Sparkline } from "@/components/app/sparkline"
import { NumberTicker } from "@/components/fx/number-ticker"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { LanguageLabel } from "@/components/projects/language-chip"
import { StatusBadge } from "@/components/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { HEALTH_META, type ProjectRecord } from "@/services/mock/projects"

export type ProjectView = "grid" | "list"

interface ProjectCardProps {
  project: ProjectRecord
  view: ProjectView
  /** Sessions per day, last 14 days. */
  sessionsTrend: number[]
  /** Just created: runs a border beam + wash so the eye finds it. */
  highlighted?: boolean
  onRename: (project: ProjectRecord) => void
  onArchive: (project: ProjectRecord) => void
  onDelete: (project: ProjectRecord) => void
}

export function HealthBadge({ project, className }: { project: ProjectRecord; className?: string }) {
  if (project.healthScore === null) {
    return (
      <StatusBadge tone="neutral" className={className}>
        No data yet
      </StatusBadge>
    )
  }
  const meta = HEALTH_META[project.health]
  return (
    <StatusBadge tone={meta.tone} className={className}>
      {meta.label}
    </StatusBadge>
  )
}

function HealthRing({ project, size }: { project: ProjectRecord; size: number }) {
  const score = project.healthScore
  const tone = score === null ? "primary" : HEALTH_META[project.health].tone
  return (
    <ProgressRing value={score ?? 0} size={size} stroke={size > 44 ? 4 : 3.5} tone={tone}>
      <span className={cn("font-semibold text-foreground tabular-nums", size > 44 ? "text-[13px]" : "text-[11px]")}>
        {score === null ? "—" : <NumberTicker value={score} duration={1.1} />}
      </span>
    </ProgressRing>
  )
}

function ProjectMenu({ project, onRename, onArchive, onDelete }: Omit<ProjectCardProps, "view" | "sessionsTrend">) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={`Actions for ${project.name}`}
                  className="relative z-20 -mt-1 -mr-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground"
                />
              }
            />
          }
        >
          <Ellipsis className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Project actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem render={<Link to={`/projects/${project.id}`} />}>
          <ArrowUpRight /> Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(project)}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(project)}>
          <Archive /> Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(project)}>
          <Trash /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Stretched link: the whole card is clickable, nested controls sit above it. */
function CardLink({ project }: { project: ProjectRecord }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      data-card-link
      className="outline-none after:absolute after:inset-0 after:z-0 after:rounded-xl after:content-['']"
    >
      {project.name}
    </Link>
  )
}

function NewPill() {
  return (
    <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
      New
    </span>
  )
}

/**
 * A project tile for the All Projects grid or list. The outer layout/presence
 * animation is owned by the page; this renders the surface and its content,
 * cross-fading when the view changes.
 */
export function ProjectCard({ project, view, sessionsTrend, highlighted, onRename, onArchive, onDelete }: ProjectCardProps) {
  const glow = project.healthScore === null ? "var(--primary)" : HEALTH_META[project.health].color
  const recent = sessionsTrend.reduce((sum, n) => sum + n, 0)
  const menu = <ProjectMenu project={project} onRename={onRename} onArchive={onArchive} onDelete={onDelete} />
  const list = view === "list"

  return (
    <SpotlightCard
      glow={glow}
      className={cn(
        "group/project h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-30px_var(--spot-glow)]",
        "has-[a[data-card-link]:focus-visible]:ring-2 has-[a[data-card-link]:focus-visible]:ring-ring/60",
        list ? "px-3 py-3 sm:px-4" : "p-4",
      )}
    >
      {highlighted && (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-primary/10"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: EASE_OUT }}
          />
        </>
      )}

      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.08, ease: EASE_OUT }}
        className={list ? "flex items-center gap-3 sm:gap-4" : "flex h-full flex-col gap-4"}
      >
        {list ? (
          <>
            <HealthRing project={project} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 truncate font-mono text-sm font-semibold tracking-tight text-foreground">
                  <CardLink project={project} />
                </h3>
                {project.isNew && <NewPill />}
                <HealthBadge project={project} className="hidden sm:inline-flex" />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description}</p>
            </div>
            <LanguageLabel language={project.language} className="hidden w-24 shrink-0 md:inline-flex" />
            <div className="hidden w-28 shrink-0 lg:block">
              {sessionsTrend.length > 1 ? (
                <Sparkline data={sessionsTrend} color={glow} className="h-7" />
              ) : (
                <span className="text-[11px] text-muted-foreground">No sessions yet</span>
              )}
            </div>
            <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:inline">
              <span className="font-medium text-foreground tabular-nums">{project.sessionsCount}</span> sessions
            </span>
            <span className="hidden w-24 shrink-0 text-xs text-muted-foreground xl:inline">{project.lastActivity}</span>
            {menu}
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <HealthRing project={project} size={48} />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 truncate font-mono text-[0.9rem] font-semibold tracking-tight text-foreground">
                    <CardLink project={project} />
                  </h3>
                  {project.isNew && <NewPill />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <LanguageLabel language={project.language} />
                  <HealthBadge project={project} />
                </div>
              </div>
              {menu}
            </div>

            <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{project.description}</p>

            <div className="mt-auto space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Sessions · last 14 days</span>
                <span className="font-medium text-foreground tabular-nums">{recent}</span>
              </div>
              {sessionsTrend.length > 1 ? (
                <Sparkline data={sessionsTrend} color={glow} className="h-9" />
              ) : (
                <div className="flex h-9 items-center rounded-md border border-dashed border-border px-2.5 text-[11px] text-muted-foreground">
                  No sessions yet — start one from the AI Debugger
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-3.5" />
                <span className="font-medium text-foreground tabular-nums">{project.sessionsCount}</span> sessions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {project.lastActivity}
              </span>
            </div>
          </>
        )}
      </motion.div>
    </SpotlightCard>
  )
}
