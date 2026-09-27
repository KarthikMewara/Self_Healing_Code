import { Command } from "cmdk"
import {
  Accessibility,
  ArrowRight,
  CornerDownLeft,
  FileCode2,
  FolderKanban,
  History,
  Keyboard,
  Moon,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Kbd } from "@/components/app/kbd"
import { ALL_NAV_ITEMS } from "@/components/app/nav-items"
import { useMotionPreference } from "@/components/motion-preference"
import { useThemeSwitch } from "@/components/theme-toggle"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { EXAMPLES } from "@/lib/examples"
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from "@/lib/highlight"
import { debugSessions } from "@/services/mock-data"
import { useProjects } from "@/services/mock/projects"

function Item({
  icon: Icon,
  children,
  hint,
  onSelect,
  value,
}: {
  icon: LucideIcon
  children: React.ReactNode
  hint?: React.ReactNode
  onSelect: () => void
  value?: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/90 outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground transition-colors group-data-[selected=true]:border-primary/30 group-data-[selected=true]:bg-primary/15 group-data-[selected=true]:text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </Command.Item>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowShortcuts: () => void
}) {
  const navigate = useNavigate()
  const { loadExample, reset, status } = useDebugWorkspace()
  const { resolvedTheme, switchTheme } = useThemeSwitch()
  const { reduced, setPref } = useMotionPreference()
  const projects = useProjects().filter((p) => !p.archived)

  // Close first, then act, so route changes don't fight the dialog's exit.
  const run = (fn: () => void) => {
    onOpenChange(false)
    setTimeout(fn, 10)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] w-full max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden p-0 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7)] sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command loop className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Type a command, page, project or session…"
              className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="scrollbar-thin max-h-[min(420px,60vh)] overflow-y-auto p-2">
            <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
              Nothing matches. Try “debugger” or “python”.
            </Command.Empty>

            <Command.Group heading="Actions">
              <Item icon={Sparkles} value="new debug session analyze" onSelect={() => run(() => navigate("/debugger"))} hint="G B">
                New debug session
              </Item>
              {status !== "idle" && (
                <Item icon={RotateCcw} value="reset workspace clear session" onSelect={() => run(reset)}>
                  Reset the current healing session
                </Item>
              )}
              <Item
                icon={resolvedTheme === "dark" ? Sun : Moon}
                value="toggle theme dark light appearance"
                onSelect={() => run(() => switchTheme(resolvedTheme === "dark" ? "light" : "dark"))}
              >
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              </Item>
              <Item icon={Accessibility} value="reduce motion animation accessibility" onSelect={() => run(() => setPref(reduced ? "full" : "reduced"))}>
                {reduced ? "Turn full motion back on" : "Reduce motion"}
              </Item>
              <Item icon={Keyboard} value="keyboard shortcuts help" onSelect={() => run(onShowShortcuts)} hint="?">
                Keyboard shortcuts
              </Item>
            </Command.Group>

            <Command.Group heading="Load an example into the debugger">
              {EXAMPLES.map((ex) => (
                <Item
                  key={ex.id}
                  icon={FileCode2}
                  value={`example ${ex.title} ${LANGUAGE_LABELS[ex.language]} ${ex.file}`}
                  onSelect={() =>
                    run(() => {
                      loadExample(ex.id)
                      navigate("/debugger")
                    })
                  }
                  hint={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[ex.language] }} />
                      {LANGUAGE_LABELS[ex.language]}
                    </span>
                  }
                >
                  {ex.title}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Go to">
              {ALL_NAV_ITEMS.map((item) => (
                <Item
                  key={item.href}
                  icon={item.icon}
                  value={`go ${item.label}`}
                  onSelect={() => run(() => navigate(item.href))}
                  hint={`G ${item.key.toUpperCase()}`}
                >
                  {item.label}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Projects">
              {projects.map((p) => (
                <Item key={p.id} icon={FolderKanban} value={`project ${p.name} ${p.language}`} onSelect={() => run(() => navigate(`/projects/${p.id}`))} hint={p.language}>
                  {p.name}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Recent sessions">
              {debugSessions.map((s) => (
                <Item
                  key={s.id}
                  icon={History}
                  value={`session ${s.projectName} ${s.errorSummary}`}
                  onSelect={() => run(() => navigate(`/history?session=${s.id}`))}
                  hint={s.projectName}
                >
                  <span className="font-mono text-xs">{s.errorSummary}</span>
                </Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>
                <CornerDownLeft className="size-2.5" />
              </Kbd>
              open
            </span>
            <span className="ml-auto hidden sm:inline">Tip: press G then a letter to jump anywhere</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
