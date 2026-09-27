import { CircleAlert, CircleCheck, FolderGit2, FolderPlus, LoaderCircle, Pencil, Plus, Wand } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react"

import { LanguageDot } from "@/components/projects/language-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LANGUAGE_LABELS, toLanguageKey, type LanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"
import {
  createProject,
  renameProject,
  toKebabCase,
  useProjects,
  validateProjectName,
  type ProjectRecord,
} from "@/services/mock/projects"
import { SUPPORTED_LANGUAGES } from "@/types/contract"

const LANGUAGE_ITEMS = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l, LANGUAGE_LABELS[l]]))
const DESCRIPTION_LIMIT = 140

function useTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  return (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(fn, ms)
  }
}

interface NameFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  /** Validation error for the current value, if any. */
  error: string | null
  /** Show the error even before the user has typed (after a submit). */
  forceError: boolean
  shakeKey: number
  inputRef: RefObject<HTMLInputElement | null>
  unchanged?: boolean
}

/** Project-name input with live kebab-case validation and a one-click fix. */
function NameField({ id, value, onChange, error, forceError, shakeKey, inputRef, unchanged }: NameFieldProps) {
  const dirty = value.length > 0
  const showError = Boolean(error) && (dirty || forceError)
  const suggestion = showError && dirty ? toKebabCase(value) : ""
  const canSuggest = Boolean(suggestion) && suggestion !== value.trim() && !validateProjectName(suggestion)

  let hint: { key: string; tone: string; icon: typeof CircleCheck | null; text: string }
  if (showError) hint = { key: `e-${error}`, tone: "text-destructive", icon: CircleAlert, text: error! }
  else if (dirty && unchanged) hint = { key: "same", tone: "text-muted-foreground", icon: null, text: "That's the current name." }
  else if (dirty) hint = { key: "ok", tone: "text-success", icon: CircleCheck, text: `${value.trim()} is available.` }
  else hint = { key: "idle", tone: "text-muted-foreground", icon: null, text: "Lowercase letters, numbers and hyphens — e.g. billing-worker." }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Name</Label>
      <div key={shakeKey} className={cn(shakeKey > 0 && "animate-shake")}>
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="billing-worker"
          autoComplete="off"
          spellCheck={false}
          maxLength={48}
          aria-invalid={showError || undefined}
          aria-describedby={`${id}-hint`}
          className="h-9 font-mono"
        />
      </div>
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hint.key}
            id={`${id}-hint`}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.16 }}
            className={cn("flex items-center gap-1.5 text-xs", hint.tone)}
          >
            {hint.icon && <hint.icon className="size-3.5 shrink-0" />}
            {hint.text}
          </motion.p>
        </AnimatePresence>
        {canSuggest && (
          <button
            type="button"
            onClick={() => {
              onChange(suggestion)
              inputRef.current?.focus()
            }}
            className="inline-flex items-center gap-1 rounded-md text-xs text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Wand className="size-3" />
            Use <span className="font-mono">{suggestion}</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (project: ProjectRecord) => void
}

/** Key this by an open counter so every opening starts with a clean form. */
export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  useProjects() // re-validate uniqueness if the store changes while open
  const [name, setName] = useState("")
  const [languageKey, setLanguageKey] = useState<LanguageKey>("typescript")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [creating, setCreating] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const later = useTimeout()
  const error = validateProjectName(name)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (creating) return
    setSubmitted(true)
    if (error) {
      setShakeKey((k) => k + 1)
      nameRef.current?.focus()
      return
    }
    setCreating(true)
    later(() => {
      const record = createProject({ name, languageKey, description: description.slice(0, DESCRIPTION_LIMIT) })
      setCreating(false)
      onCreated(record)
      onOpenChange(false)
    }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !creating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-info/10 text-primary ring-1 ring-primary/25">
                <FolderPlus className="size-4.5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>New project</DialogTitle>
                <DialogDescription>
                  Groups one codebase's debug sessions, repairs and memory. It lives in this browser session only.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <NameField
            id="new-project-name"
            value={name}
            onChange={setName}
            error={error}
            forceError={submitted}
            shakeKey={shakeKey}
            inputRef={nameRef}
          />

          <div className="space-y-1.5">
            <Label htmlFor="new-project-language">Primary language</Label>
            <Select
              value={languageKey}
              onValueChange={(value) => value && setLanguageKey(toLanguageKey(value))}
              items={LANGUAGE_ITEMS}
            >
              <SelectTrigger id="new-project-language" className="h-9 w-full">
                <SelectValue>
                  {(value: string) => (
                    <>
                      <LanguageDot language={value} />
                      {LANGUAGE_LABELS[toLanguageKey(value)]}
                    </>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    <LanguageDot language={lang} />
                    {LANGUAGE_LABELS[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-project-description">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  description.length >= DESCRIPTION_LIMIT ? "text-warning" : "text-muted-foreground",
                )}
              >
                {description.length}/{DESCRIPTION_LIMIT}
              </span>
            </div>
            <Textarea
              id="new-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))}
              placeholder="What does this service do?"
              rows={2}
              className="min-h-16 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Repository</Label>
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50" />}>
                <Button type="button" variant="outline" disabled className="h-9 w-full justify-start gap-2 border-dashed">
                  <FolderGit2 />
                  Connect GitHub repository
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Coming soon
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Repository sync has no backend yet — paste code into the AI Debugger instead.</TooltipContent>
            </Tooltip>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="min-w-32">
              {creating ? (
                <>
                  <LoaderCircle className="animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Plus /> Create project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface RenameProjectDialogProps {
  project: ProjectRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenamed: (project: ProjectRecord, previousName: string) => void
}

/** Key this by the target project so it starts from the current name. */
export function RenameProjectDialog({ project, open, onOpenChange, onRenamed }: RenameProjectDialogProps) {
  useProjects()
  const [name, setName] = useState(project?.name ?? "")
  const [submitted, setSubmitted] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const unchanged = name.trim() === project?.name
  const error = project ? validateProjectName(name, project.id) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!project) return
    setSubmitted(true)
    if (unchanged) {
      onOpenChange(false)
      return
    }
    if (error) {
      setShakeKey((k) => k + 1)
      nameRef.current?.focus()
      return
    }
    const previous = project.name
    renameProject(project.id, name)
    onRenamed({ ...project, name: name.trim() }, previous)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-border">
                <Pencil className="size-4" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>
                  Sessions, repairs and memory stay attached — only the display name changes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <NameField
            id="rename-project-name"
            value={name}
            onChange={setName}
            error={unchanged ? null : error}
            forceError={submitted}
            shakeKey={shakeKey}
            inputRef={nameRef}
            unchanged={unchanged}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={unchanged || !name.trim()}>
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
