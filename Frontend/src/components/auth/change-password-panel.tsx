import { KeyRound } from "lucide-react"
import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Panel } from "@/components/app/panel"
import { PasswordField } from "@/components/auth/auth-field"
import { submitOnModS } from "@/components/auth/form-shortcuts"
import { PasswordStrength } from "@/components/auth/password-strength"
import { SaveBar } from "@/components/auth/save-bar"
import type { ActionStatus } from "@/components/auth/status-button"
import { useShake } from "@/components/auth/use-shake"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { validateConfirmation, validateNewPassword } from "@/components/auth/validation"

type Field = "current" | "next" | "confirm"
const FIELDS: Field[] = ["current", "next", "confirm"]
const EMPTY: Record<Field, string> = { current: "", next: "", confirm: "" }
const UNTOUCHED: Record<Field, boolean> = { current: false, next: false, confirm: false }

interface ChangePasswordPanelProps {
  lastChanged: string
  onChanged: () => void
}

/** Change password with its own Save/Cancel (mocked: nothing leaves the browser). */
export function ChangePasswordPanel({ lastChanged, onChanged }: ChangePasswordPanelProps) {
  const timers = useTimeouts()
  const [shakeRef, shake] = useShake()
  const currentRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState(UNTOUCHED)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<ActionStatus>("idle")
  // Bumped to remount the fields (resets their show/hide toggles too).
  const [formKey, setFormKey] = useState(0)

  const errors: Record<Field, string | null> = {
    current: values.current ? null : "Enter your current password.",
    next:
      validateNewPassword(values.next, "Choose a new password.") ??
      (values.next === values.current ? "Choose a password you aren't already using." : null),
    confirm: validateConfirmation(values.next, values.confirm),
  }
  const dirty = FIELDS.some((field) => values[field])
  const shown = (field: Field) => (touched[field] || submitted ? errors[field] : null)
  const passwordsMatch = values.confirm.length > 0 && values.confirm === values.next

  const set = (field: Field) => (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [field]: e.target.value }))
  const blur = (field: Field) => () => setTouched((t) => ({ ...t, [field]: true }))

  const reset = () => {
    setValues(EMPTY)
    setTouched(UNTOUCHED)
    setSubmitted(false)
    setFormKey((k) => k + 1)
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dirty || status !== "idle") return
    setSubmitted(true)
    const firstInvalid = FIELDS.find((field) => errors[field])
    if (firstInvalid) {
      shake()
      const refs = { current: currentRef, next: nextRef, confirm: confirmRef }
      refs[firstInvalid].current?.focus()
      return
    }
    setStatus("loading")
    timers.after(900, () => {
      setStatus("success")
      onChanged()
      toast.success("Password updated", { description: "Preview build: nothing was sent to a server." })
      timers.after(1300, () => {
        setStatus("idle")
        reset()
      })
    })
  }

  return (
    <div ref={shakeRef}>
      <Panel title="Password" description={`Last changed ${lastChanged}.`} icon={KeyRound}>
        <form key={formKey} noValidate onSubmit={onSubmit} onKeyDown={submitOnModS} aria-label="Change password">
          <div className="grid gap-4 md:grid-cols-2">
            <PasswordField
              ref={currentRef}
              id="settings-current-password"
              label="Current password"
              autoComplete="current-password"
              placeholder="Your current password"
              value={values.current}
              onChange={set("current")}
              onBlur={blur("current")}
              error={shown("current")}
              labelAside={
                <Link
                  to="/forgot-password"
                  className="rounded-sm text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Forgot it?
                </Link>
              }
              className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]"
            />
            <div>
              <PasswordField
                ref={nextRef}
                id="settings-new-password"
                label="New password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                describedBy="settings-new-password-strength"
                value={values.next}
                onChange={set("next")}
                onBlur={blur("next")}
                error={shown("next")}
              />
              <PasswordStrength
                id="settings-new-password-strength"
                password={values.next}
                showErrors={submitted}
                className="mt-3"
              />
            </div>
            <PasswordField
              ref={confirmRef}
              id="settings-confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              placeholder="Type it once more"
              value={values.confirm}
              onChange={set("confirm")}
              onBlur={blur("confirm")}
              error={shown("confirm")}
              note={passwordsMatch ? { tone: "success", text: "Passwords match." } : null}
            />
          </div>
          <SaveBar
            dirty={dirty}
            status={status}
            onCancel={reset}
            saveLabel="Update password"
            savingLabel="Updating…"
            savedLabel="Updated"
            idleText="Use 8+ characters with a number, an uppercase letter and a symbol."
          />
        </form>
      </Panel>
    </div>
  )
}
