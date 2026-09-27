import { KeyRound, LoaderCircle, RotateCw, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { AnimatedHeight } from "@/components/auth/animated-height"
import { CopyButton } from "@/components/auth/copy-button"
import { OtpInput, type OtpStatus } from "@/components/auth/otp-input"
import { QrPlaceholder } from "@/components/auth/qr-placeholder"
import { DrawnCheck } from "@/components/auth/status-button"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { celebrate } from "@/lib/confetti"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { generateRecoveryCodes, TOTP_DEMO_SECRET } from "@/services/mock/settings"

export type TwoFactorMode = "off" | "setup" | "on"

const swap = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: EASE_OUT },
}

function StatusBadge({ mode }: { mode: TwoFactorMode }) {
  return (
    <span className="relative inline-flex h-5 min-w-[4.75rem] justify-end">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={mode}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={SPRING_BOUNCY}
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap",
            mode === "on" && "border-success/30 bg-success/10 text-success",
            mode === "setup" && "border-primary/30 bg-primary/10 text-primary",
            mode === "off" && "border-border bg-muted/60 text-muted-foreground",
          )}
        >
          {mode === "on" && <ShieldCheck aria-hidden className="size-3" />}
          {mode === "on" ? "Enabled" : mode === "setup" ? "Setting up" : "Off"}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary ring-1 ring-primary/25">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </li>
  )
}

interface TwoFactorPanelProps {
  mode: TwoFactorMode
  onModeChange: (mode: TwoFactorMode) => void
  id?: string
}

/**
 * 2FA with a mock authenticator setup: switching it on reveals a (fake) QR code
 * and a six-box code input; any six digits "verify". Turning it off asks first.
 */
export function TwoFactorPanel({ mode, onModeChange, id }: TwoFactorPanelProps) {
  const timers = useTimeouts()
  const badgeRef = useRef<HTMLSpanElement>(null)
  const [verify, setVerify] = useState<OtpStatus>("idle")
  const [attempt, setAttempt] = useState(0)
  const [confirmOff, setConfirmOff] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [codesOpen, setCodesOpen] = useState(false)
  const [addedAt, setAddedAt] = useState("just now")

  const cancelSetup = () => {
    timers.clearAll()
    setVerify("idle")
    setAttempt((a) => a + 1)
    onModeChange("off")
  }

  const onSwitch = (checked: boolean) => {
    if (checked) onModeChange("setup")
    else if (mode === "setup") cancelSetup()
    else setConfirmOff(true)
  }

  const onCode = () => {
    if (verify !== "idle") return
    setVerify("verifying")
    timers.after(900, () => {
      setVerify("success")
      timers.after(800, () => {
        setVerify("idle")
        setAttempt((a) => a + 1)
        setCodes(generateRecoveryCodes())
        setCodesOpen(true)
        setAddedAt("just now")
        onModeChange("on")
        toast.success("Two-factor authentication is on", {
          description: "Save your recovery codes somewhere safe. Preview build: nothing was stored.",
        })
        celebrate(badgeRef.current)
      })
    })
  }

  const turnOff = () => {
    onModeChange("off")
    setCodes([])
    setCodesOpen(false)
    toast("Two-factor authentication turned off", { description: "Logins now need only your password." })
  }

  const regenerate = () => {
    setCodes(generateRecoveryCodes())
    toast.success("New recovery codes generated", { description: "Your previous codes no longer work." })
  }

  return (
    <>
      <Panel
        id={id}
        title="Two-factor authentication"
        description="Ask for a code from your authenticator app whenever you log in."
        icon={Smartphone}
        action={
          <div className="flex items-center gap-3">
            <span ref={badgeRef}>
              <StatusBadge mode={mode} />
            </span>
            <Switch
              checked={mode !== "off"}
              onCheckedChange={onSwitch}
              aria-label="Two-factor authentication"
              disabled={verify !== "idle"}
            />
          </div>
        }
      >
        <AnimatedHeight trigger={mode}>
          <AnimatePresence mode="wait" initial={false}>
            {mode === "off" && (
              <motion.div key="off" {...swap} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning ring-1 ring-warning/25">
                    <ShieldAlert aria-hidden className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Add a second step to your login</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Recommended. A code from your phone keeps your account safe even if your password leaks.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onModeChange("setup")} className="shrink-0 self-start sm:self-center">
                  <ShieldCheck aria-hidden /> Set up
                </Button>
              </motion.div>
            )}

            {mode === "setup" && (
              <motion.div key="setup" {...swap}>
                <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
                  <div className="flex flex-col items-center gap-2">
                    <QrPlaceholder scanning={verify === "idle"} />
                    <p className="text-[11px] text-muted-foreground">Preview only, not scannable</p>
                  </div>
                  <ol className="space-y-5">
                    <Step n={1} title="Scan it with your authenticator app">
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        1Password, Authy, Google Authenticator or any TOTP app works.
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Can't scan? Enter this key:</span>
                        <code className="rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-xs tracking-wider text-foreground">
                          {TOTP_DEMO_SECRET}
                        </code>
                        <CopyButton
                          value={TOTP_DEMO_SECRET.replace(/\s/g, "")}
                          size="icon-sm"
                          variant="ghost"
                          label="Copy setup key"
                          toastMessage="Setup key copied"
                        />
                      </div>
                    </Step>
                    <Step n={2} title="Enter the 6-digit code it shows">
                      <p id="otp-hint" className="mt-0.5 text-xs text-muted-foreground">
                        Preview build: any 6 digits will verify.
                      </p>
                      <div className="mt-3">
                        <OtpInput
                          key={attempt}
                          autoFocus
                          status={verify}
                          onComplete={onCode}
                          label="6-digit code from your authenticator app"
                          describedBy="otp-hint"
                        />
                      </div>
                      <p aria-live="polite" className="mt-2.5 flex min-h-5 items-center gap-1.5 text-xs font-medium">
                        {verify === "verifying" && (
                          <span className="inline-flex items-center gap-1.5 text-primary">
                            <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> Verifying code…
                          </span>
                        )}
                        {verify === "success" && (
                          <span className="inline-flex items-center gap-1.5 text-success">
                            <DrawnCheck className="size-3.5" /> Code verified
                          </span>
                        )}
                      </p>
                    </Step>
                  </ol>
                </div>
                <div className="mt-5 flex justify-end gap-2 border-t border-border/70 pt-3">
                  <Button variant="ghost" size="sm" onClick={cancelSetup} disabled={verify !== "idle"}>
                    Cancel setup
                  </Button>
                </div>
              </motion.div>
            )}

            {mode === "on" && (
              <motion.div key="on" {...swap} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/25 bg-success/5 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/30">
                      <Smartphone aria-hidden className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Authenticator app</p>
                      <p className="text-xs text-muted-foreground">Added {addedAt} · asked for at every login</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={codesOpen}
                    aria-controls="recovery-codes"
                    onClick={() => {
                      if (!codes.length) setCodes(generateRecoveryCodes())
                      setCodesOpen((open) => !open)
                    }}
                  >
                    <KeyRound aria-hidden />
                    {codesOpen ? "Hide recovery codes" : "View recovery codes"}
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {codesOpen && (
                    <motion.div
                      id="recovery-codes"
                      key="codes"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="max-w-md text-xs text-muted-foreground">
                            Each code works once if you lose your phone. Keep them somewhere safe, like a password manager.
                          </p>
                          <div className="flex items-center gap-2">
                            <CopyButton value={codes.join("\n")} label="Copy all" toastMessage="Recovery codes copied" />
                            <Button variant="ghost" size="sm" onClick={regenerate}>
                              <RotateCw aria-hidden /> Regenerate
                            </Button>
                          </div>
                        </div>
                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Recovery codes">
                          {codes.map((code, i) => (
                            <motion.li
                              key={code}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.035, ease: EASE_OUT }}
                              className="rounded-md border border-border bg-background/70 px-2 py-1.5 text-center font-mono text-[13px] tracking-wide text-foreground dark:bg-background/40"
                            >
                              {code}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedHeight>
      </Panel>

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Turn off two-factor authentication?"
        description="Your account will be protected by your password alone. You can turn it back on at any time."
        confirmLabel="Turn off"
        onConfirm={turnOff}
      />
    </>
  )
}
