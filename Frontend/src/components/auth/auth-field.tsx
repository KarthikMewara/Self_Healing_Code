import {
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useId, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion"
import { cn } from "@/lib/utils"

export type MessageTone = "error" | "warning" | "success" | "info"

const TONES: Record<MessageTone, { icon: LucideIcon; className: string }> = {
  error: { icon: CircleAlert, className: "text-destructive" },
  warning: { icon: TriangleAlert, className: "text-warning" },
  success: { icon: CircleCheck, className: "text-success" },
  info: { icon: Info, className: "text-muted-foreground" },
}

/** Non-blocking guidance under a field (a warning, a confirmation, a hint). */
export interface FieldNote {
  tone: Exclude<MessageTone, "error">
  text: ReactNode
}

interface FieldMessageProps {
  id: string
  tone?: MessageTone
  message?: ReactNode
  className?: string
}

/** A message under a field that slides open (height + fade) and closes the same way. */
export function FieldMessage({ id, tone = "error", message, className }: FieldMessageProps) {
  const { icon: Icon, className: toneClass } = TONES[tone]

  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          key="message"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          <p
            id={id}
            role={tone === "error" ? "alert" : undefined}
            className={cn("flex items-start gap-1.5 pt-1.5 text-xs leading-snug", toneClass, className)}
          >
            <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>{message}</span>
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export interface AuthFieldProps extends Omit<ComponentProps<"input">, "size"> {
  label: ReactNode
  icon?: LucideIcon
  /** Blocking error: red styling, aria-invalid, announced. */
  error?: string | null
  note?: FieldNote | null
  /** Rendered at the right end of the label row (e.g. a "Forgot password?" link). */
  labelAside?: ReactNode
  /** Rendered inside the input on the right (e.g. a show/hide toggle). */
  trailing?: ReactNode
  /** Pass a boolean to reserve room for a green check that pops in when true. */
  valid?: boolean
  /** Extra ids for aria-describedby (a checklist, a meter). */
  describedBy?: string
  inputClassName?: string
}

/**
 * Labelled input with a leading icon, an animated brand-gradient focus glow
 * (red when invalid), an optional success check and an inline message that
 * animates in. Wires up aria-invalid / aria-describedby for you.
 */
export function AuthField({
  id: idProp,
  label,
  icon: Icon,
  error,
  note,
  labelAside,
  trailing,
  valid,
  describedBy,
  className,
  inputClassName,
  ...inputProps
}: AuthFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const messageId = `${id}-message`
  const invalid = Boolean(error)
  const message: { tone: MessageTone; text: ReactNode } | null = error
    ? { tone: "error", text: error }
    : note
      ? { tone: note.tone, text: note.text }
      : null
  const describedByIds = [message ? messageId : null, describedBy].filter(Boolean).join(" ") || undefined
  const reservesCheck = valid !== undefined
  const showCheck = Boolean(valid) && !invalid

  return (
    <div className={className}>
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] text-foreground/90">
          {label}
        </Label>
        {labelAside}
      </div>

      <div className="group/field relative">
        {/* Focus glow: a blurred, slowly panning brand gradient just outside the border. */}
        <span
          aria-hidden
          data-invalid={invalid || undefined}
          className={cn(
            "pointer-events-none absolute -inset-[3px] rounded-[13px] opacity-0 blur-[5px] transition-opacity duration-300",
            "bg-[linear-gradient(90deg,var(--primary),var(--info),var(--success),var(--info),var(--primary))] bg-[length:200%_100%]",
            "group-focus-within/field:animate-gradient-pan group-focus-within/field:opacity-50",
            "data-invalid:bg-destructive data-invalid:bg-none",
          )}
        />
        {Icon && (
          <Icon
            aria-hidden
            data-invalid={invalid || undefined}
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/field:text-primary data-invalid:text-destructive group-focus-within/field:data-invalid:text-destructive"
          />
        )}
        <Input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedByIds}
          className={cn(
            "relative h-10 rounded-[10px] bg-background/85 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 dark:bg-background/55",
            "focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/20",
            "aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/25",
            "autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]",
            Icon && "pl-9",
            trailing && reservesCheck ? "pr-[4.25rem]" : trailing ? "pr-10" : reservesCheck ? "pr-9" : undefined,
            inputClassName,
          )}
          {...inputProps}
        />
        {(trailing || reservesCheck) && (
          <div className="absolute inset-y-0 right-1.5 z-10 flex items-center gap-0.5">
            <AnimatePresence initial={false}>
              {showCheck && (
                <motion.span
                  key="valid"
                  initial={{ scale: 0.3, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={SPRING_BOUNCY}
                  className="flex size-7 items-center justify-center text-success"
                >
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                </motion.span>
              )}
            </AnimatePresence>
            {trailing}
          </div>
        )}
      </div>

      <FieldMessage id={messageId} tone={message?.tone} message={message?.text} />
    </div>
  )
}

function RevealToggle({ visible, controls, onToggle }: { visible: boolean; controls: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label="Show password"
      aria-pressed={visible}
      aria-controls={controls}
      // Keep focus (and the glow) in the input when toggling with a mouse.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      className="relative inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={visible ? "hide" : "show"}
          initial={{ opacity: 0, scale: 0.5, rotate: -40 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 40 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="flex"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

export type PasswordFieldProps = Omit<AuthFieldProps, "type" | "trailing" | "valid">

/** AuthField for passwords: show/hide toggle and a Caps Lock warning. */
export function PasswordField({ id: idProp, icon = LockKeyhole, note, onKeyDown, onKeyUp, onBlur, ...props }: PasswordFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const syncCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"))
  }

  return (
    <AuthField
      spellCheck={false}
      {...props}
      id={id}
      icon={icon}
      type={visible ? "text" : "password"}
      note={capsLock ? { tone: "warning", text: "Caps Lock is on." } : note}
      onKeyDown={(e) => {
        syncCapsLock(e)
        onKeyDown?.(e)
      }}
      onKeyUp={(e) => {
        syncCapsLock(e)
        onKeyUp?.(e)
      }}
      onBlur={(e) => {
        setCapsLock(false)
        onBlur?.(e)
      }}
      trailing={<RevealToggle visible={visible} controls={id} onToggle={() => setVisible((v) => !v)} />}
    />
  )
}
