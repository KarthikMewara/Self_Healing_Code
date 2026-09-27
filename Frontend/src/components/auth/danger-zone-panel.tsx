import { Trash2, TriangleAlert, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { DrawnCheck } from "@/components/auth/status-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const PHRASE = "delete my account"

/** Delete account, guarded by typing an exact phrase. Deletion itself is disabled in the preview. */
export function DangerZonePanel({ workspace }: { workspace: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  let correct = 0
  while (correct < typed.length && correct < PHRASE.length && typed[correct] === PHRASE[correct]) correct++
  const matches = typed === PHRASE
  const wrong = typed.length > correct

  const consequences = [
    `Your profile and login for ${workspace}`,
    "Every API key you've created, which stop working at once",
    "Your debugging sessions, fixes and follow-up chats",
  ]

  const confirm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!matches) return
    setOpen(false)
    toast.warning("Account deletion is disabled in this preview", {
      description: "Nothing was deleted. In the full product this would permanently remove your account.",
    })
  }

  return (
    <>
      <Panel
        title={
          <span className="inline-flex items-center gap-2 text-destructive">
            <TriangleAlert aria-hidden className="size-4" />
            Danger zone
          </span>
        }
        description="Irreversible actions. Take a breath first."
        className="border-destructive/35"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Permanently removes your profile, API keys and debugging history. {workspace} and its other members aren't
              affected.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setOpen(true)} className="shrink-0 self-start sm:self-center">
            <Trash2 aria-hidden /> Delete account
          </Button>
        </div>
      </Panel>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setTyped("")
        }}
      >
        <DialogContent className="sm:max-w-md" initialFocus={inputRef}>
          <form noValidate onSubmit={confirm} className="grid gap-4">
            <DialogHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-destructive/12 text-destructive ring-1 ring-destructive/25">
                <TriangleAlert aria-hidden className="size-5" />
              </div>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>This can't be undone. Here's what goes with it:</DialogDescription>
            </DialogHeader>

            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {consequences.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <X aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  {item}
                </li>
              ))}
            </ul>

            <div>
              <label htmlFor="delete-confirm" className="block text-sm text-foreground">
                To confirm, type <span className="sr-only">“{PHRASE}”</span>
                <span aria-hidden>the phrase below</span>
              </label>
              {/* The phrase lights up as it's typed correctly; a wrong character shows where it went off. */}
              <p aria-hidden className="mt-2 mb-2.5 inline-flex flex-wrap rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-sm">
                {PHRASE.split("").map((char, i) => (
                  <span
                    key={i}
                    className={cn(
                      "transition-colors duration-150",
                      i < correct
                        ? "text-destructive"
                        : wrong && i === correct
                          ? "text-warning underline decoration-wavy underline-offset-4"
                          : "text-muted-foreground",
                    )}
                  >
                    {char === " " ? " " : char}
                  </span>
                ))}
              </p>
              <Input
                ref={inputRef}
                id="delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={wrong || undefined}
                aria-describedby="delete-confirm-status"
                placeholder={PHRASE}
                className="h-9 font-mono"
              />
              <p id="delete-confirm-status" aria-live="polite" className="mt-1.5 min-h-4 text-xs">
                <AnimatePresence mode="popLayout" initial={false}>
                  {matches ? (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="inline-flex items-center gap-1.5 font-medium text-destructive"
                    >
                      <DrawnCheck className="size-3" /> Confirmed. The delete button is armed.
                    </motion.span>
                  ) : wrong ? (
                    <motion.span
                      key="wrong"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="text-warning"
                    >
                      That doesn't match. It's case-sensitive.
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!matches}
                className={cn(
                  matches &&
                    "bg-destructive text-destructive-foreground shadow-[0_8px_24px_-8px_var(--destructive)] hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90",
                )}
              >
                <Trash2 aria-hidden /> Delete my account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
