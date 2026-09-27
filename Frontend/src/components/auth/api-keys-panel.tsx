import { FlaskConical, KeyRound, Plus, ShieldCheck, Sparkles, Trash2, TriangleAlert } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { AnimatedHeight } from "@/components/auth/animated-height"
import { AuthField } from "@/components/auth/auth-field"
import { CopyButton } from "@/components/auth/copy-button"
import { ScrambleText } from "@/components/auth/scramble-text"
import { DrawnCheck, StatusLabel, type ActionStatus } from "@/components/auth/status-button"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { API_KEY_NAME_SUGGESTIONS, API_KEY_PREFIX, generateFakeApiKey, type ApiKey } from "@/services/mock/settings"

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

/** "2026-08-02" -> "Aug 2, 2026", read as a local date (no UTC off-by-one). */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return DATE_FORMAT.format(new Date(y, m - 1, d))
}

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const swap = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: EASE_OUT },
}

const MAX_NAME = 40

interface GenerateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNames: string[]
  onCreated: (key: ApiKey) => void
}

/** Step 1: name the key. Step 2: show the full (fake) key exactly once. */
function GenerateKeyDialog({ open, onOpenChange, existingNames, onCreated }: GenerateKeyDialogProps) {
  const timers = useTimeouts()
  const inputRef = useRef<HTMLInputElement>(null)
  const pending = useRef<ApiKey | null>(null)
  const [step, setStep] = useState<"name" | "reveal">("name")
  const [name, setName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<ActionStatus>("idle")
  const [secret, setSecret] = useState("")
  const [copied, setCopied] = useState(false)

  const trimmed = name.trim()
  const isTaken = (candidate: string) => existingNames.some((n) => n.toLowerCase() === candidate.toLowerCase())
  const error = !trimmed
    ? "Give the key a name so you can recognise it later."
    : isTaken(trimmed)
      ? "You already have a key with this name."
      : null
  const suggestions = API_KEY_NAME_SUGGESTIONS.filter((s) => !isTaken(s)).slice(0, 4)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      timers.clearAll()
      // The key only joins the table once its one-time reveal has been seen.
      if (pending.current) onCreated(pending.current)
      pending.current = null
    }
    onOpenChange(next)
  }

  const reset = () => {
    setStep("name")
    setName("")
    setSubmitted(false)
    setStatus("idle")
    setSecret("")
    setCopied(false)
  }

  const generate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status !== "idle") return
    setSubmitted(true)
    if (error) {
      inputRef.current?.focus()
      return
    }
    setStatus("loading")
    timers.after(750, () => {
      const key = generateFakeApiKey()
      pending.current = {
        id: `key_${Date.now().toString(36)}`,
        name: trimmed,
        prefix: key.slice(0, API_KEY_PREFIX.length + 4),
        createdAt: todayIso(),
        lastUsed: null,
        isNew: true,
      }
      setSecret(key)
      setStatus("idle")
      setStep("reveal")
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset()
      }}
    >
      <DialogContent className="sm:max-w-lg" initialFocus={inputRef}>
        <AnimatedHeight trigger={step}>
          <AnimatePresence mode="wait" initial={false}>
            {step === "name" ? (
              <motion.form key="name" {...swap} noValidate onSubmit={generate} aria-label="Name your new API key">
                <DialogHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-info/10 text-primary ring-1 ring-primary/25">
                    <KeyRound aria-hidden className="size-5" />
                  </div>
                  <DialogTitle>Generate a new API key</DialogTitle>
                  <DialogDescription>
                    Keys let CI jobs and integrations call the debugger API as you. Name it after where it'll be used.
                  </DialogDescription>
                </DialogHeader>

                <AuthField
                  ref={inputRef}
                  id="api-key-name"
                  label="Key name"
                  icon={KeyRound}
                  placeholder="e.g. GitHub Actions CI"
                  maxLength={MAX_NAME}
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={submitted ? error : null}
                  labelAside={
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {name.length}/{MAX_NAME}
                    </span>
                  }
                  className="mt-5"
                />

                {suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-0.5 text-[11px] text-muted-foreground">Try:</span>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setName(suggestion)
                          inputRef.current?.focus()
                        }}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" aria-busy={status === "loading" || undefined} className="relative min-w-36">
                    <StatusLabel
                      status={status}
                      loadingLabel="Generating…"
                      successLabel="Generated"
                      icon={<Sparkles aria-hidden className="size-4" />}
                    >
                      Generate key
                    </StatusLabel>
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div key="reveal" {...swap}>
                <DialogHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
                    <DrawnCheck className="size-5" />
                  </div>
                  <DialogTitle>Save your new key</DialogTitle>
                  <DialogDescription>
                    “{trimmed}” is ready. Copy it now: for your security, the full key is shown only once.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                  <code className="min-w-0 flex-1 font-mono text-[13px] leading-relaxed break-all text-foreground">
                    <ScrambleText text={secret} keep={API_KEY_PREFIX.length} />
                  </code>
                  <CopyButton value={secret} autoFocus onCopied={() => setCopied(true)} toastMessage="API key copied" />
                </div>

                <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
                  <TriangleAlert aria-hidden className="mt-px size-4 shrink-0 text-warning" />
                  <p>This is the only time the full key is shown. If you lose it, revoke it and generate a new one.</p>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <FlaskConical aria-hidden className="size-3 shrink-0 text-warning" />
                  Preview key: randomly generated, it won't authenticate anywhere.
                </p>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => handleOpenChange(false)}>{copied ? "Done" : "I've saved it"}</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedHeight>
      </DialogContent>
    </Dialog>
  )
}

function LastUsed({ apiKey }: { apiKey: ApiKey }) {
  if (apiKey.lastUsed) return <span className="text-muted-foreground">{apiKey.lastUsed}</span>
  if (apiKey.isNew) return <span className="text-muted-foreground">Not used yet</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-warning">
      Never used
    </span>
  )
}

interface ApiKeysPanelProps {
  keys: ApiKey[]
  onKeysChange: Dispatch<SetStateAction<ApiKey[]>>
  workspace: string
  id?: string
}

/** API keys table: generate (dialog + one-time reveal) and revoke (confirm), rows animate in/out. */
export function ApiKeysPanel({ keys, onKeysChange, workspace, id }: ApiKeysPanelProps) {
  const timers = useTimeouts()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  // Kept after the dialog closes so its title doesn't blank out mid-animation.
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)

  const added = (key: ApiKey) => {
    onKeysChange((prev) => [key, ...prev])
    setFreshId(key.id)
    timers.after(4000, () => setFreshId((current) => (current === key.id ? null : current)))
  }

  const revoke = () => {
    const target = revokeTarget
    if (!target) return
    onKeysChange((prev) => prev.filter((k) => k.id !== target.id))
    toast.success(`Revoked “${target.name}”`, { description: "Anything still using it stops working immediately." })
  }

  return (
    <>
      <Panel
        id={id}
        title="API keys"
        description={`${keys.length} active · let CI and integrations call the debugger API as you.`}
        icon={KeyRound}
        padded={false}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden /> Generate new key
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Your API keys</caption>
            <thead>
              <tr className="border-b border-border/70 text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">
                  Name
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell sm:px-4">
                  Created
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">
                  Last used
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {keys.map((apiKey) => {
                  const fresh = apiKey.id === freshId
                  return (
                    <motion.tr
                      key={apiKey.id}
                      layout="position"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 32, transition: { duration: 0.22, ease: EASE_OUT } }}
                      transition={SPRING_SOFT}
                      className={cn(
                        "border-b border-border/60 transition-colors duration-1000 last:border-0 hover:bg-muted/40",
                        fresh && "bg-primary/[0.07]",
                      )}
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "hidden size-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-700 sm:flex",
                              fresh ? "bg-primary/15 text-primary ring-primary/30" : "bg-muted text-muted-foreground ring-border",
                            )}
                          >
                            <KeyRound aria-hidden className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="block max-w-[8.5rem] truncate font-medium text-foreground sm:max-w-[16rem]">{apiKey.name}</span>
                              <AnimatePresence>
                                {fresh && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    className="rounded-full bg-primary/15 px-1.5 text-[10px] leading-4 font-semibold text-primary ring-1 ring-primary/25"
                                  >
                                    New
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <code className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                              {apiKey.prefix}
                              <span aria-hidden className="tracking-widest">
                                ••••<span className="hidden sm:inline">••••</span>
                              </span>
                              <span className="sr-only">(rest of the key hidden)</span>
                            </code>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground sm:table-cell sm:px-4">
                        {apiKey.isNew ? "Just now" : formatDate(apiKey.createdAt)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap sm:px-4">
                        <LastUsed apiKey={apiKey} />
                      </td>
                      <td className="px-3 py-3 text-right sm:px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Revoke ${apiKey.name}`}
                          onClick={() => {
                            setRevokeTarget(apiKey)
                            setRevokeOpen(true)
                          }}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/15"
                        >
                          <Trash2 aria-hidden />
                          <span className="hidden sm:inline">Revoke</span>
                        </Button>
                      </td>
                    </motion.tr>
                  )
                })}
                {keys.length === 0 && (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={4} className="px-4 py-10">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-center">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                          <KeyRound aria-hidden className="size-4" />
                        </span>
                        <p className="text-sm font-medium text-foreground">No API keys</p>
                        <p className="text-xs text-muted-foreground">
                          Generate one to call the debugger from CI or your own tooling.
                        </p>
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => setDialogOpen(true)}>
                          <Plus aria-hidden /> Generate your first key
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
          Keys act with your permissions in {workspace}. Treat them like passwords.
        </p>
      </Panel>

      <GenerateKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingNames={keys.map((k) => k.name)}
        onCreated={added}
      />

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title={`Revoke “${revokeTarget?.name ?? "this key"}”?`}
        description={`Anything using ${revokeTarget?.prefix ?? "it"}… will lose access immediately. This can't be undone.`}
        confirmLabel="Revoke key"
        onConfirm={revoke}
      />
    </>
  )
}
