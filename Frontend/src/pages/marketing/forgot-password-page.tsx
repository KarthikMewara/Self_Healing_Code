import { ArrowLeft, Clock, KeyRound, Mail, PencilLine, RotateCw, Send } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { AnimatedHeight } from "@/components/auth/animated-height"
import { AuthField } from "@/components/auth/auth-field"
import { AuthHeader, AuthIcon, AuthLayout } from "@/components/auth/auth-layout"
import { prefersAutoFocus, readRememberedEmail } from "@/components/auth/auth-storage"
import { SentIllustration } from "@/components/auth/sent-illustration"
import { StatusLabel, SubmitButton, type ActionStatus } from "@/components/auth/status-button"
import { useCooldown } from "@/components/auth/use-cooldown"
import { useShake } from "@/components/auth/use-shake"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { validateEmail } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Phase = "request" | "sent"
const COOLDOWN_SECONDS = 30

// There's no mail service behind this yet, so nothing is actually sent. The
// copy never confirms that an account exists (standard practice for reset
// flows): it only says a link is on its way *if* one does.

const phaseMotion = {
  initial: { opacity: 0, y: 14, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: { opacity: 0, y: -10, filter: "blur(4px)" },
  transition: { duration: 0.28, ease: EASE_OUT },
}

const linkClass =
  "rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export default function ForgotPasswordPage() {
  const timers = useTimeouts()
  const [cardRef, shake] = useShake()
  const emailRef = useRef<HTMLInputElement>(null)
  const [autoFocus] = useState(prefersAutoFocus)

  const [phase, setPhase] = useState<Phase>("request")
  const [email, setEmail] = useState(readRememberedEmail)
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<ActionStatus>("idle")
  const [sentTo, setSentTo] = useState("")
  const [resendStatus, setResendStatus] = useState<ActionStatus>("idle")
  const cooldown = useCooldown(COOLDOWN_SECONDS)

  const error = validateEmail(email)
  const shownError = touched || submitted ? error : null

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status !== "idle") return
    setSubmitted(true)
    if (error) {
      shake()
      emailRef.current?.focus()
      return
    }
    setStatus("loading")
    timers.after(900, () => {
      setStatus("success")
      timers.after(450, () => {
        setSentTo(email.trim())
        setPhase("sent")
        setStatus("idle")
        cooldown.start()
      })
    })
  }

  const resend = () => {
    if (cooldown.remaining > 0 || resendStatus !== "idle") return
    setResendStatus("loading")
    timers.after(750, () => {
      setResendStatus("success")
      toast.success("Reset link resent", {
        description: `If an account exists for ${sentTo}, another link is on its way.`,
      })
      cooldown.start()
      timers.after(1100, () => setResendStatus("idle"))
    })
  }

  const changeEmail = () => {
    setPhase("request")
    setSubmitted(false)
    setTouched(false)
    setResendStatus("idle")
  }

  return (
    <AuthLayout cardRef={cardRef} footnote="Preview build: no email is actually sent.">
      <AnimatedHeight trigger={phase}>
        <AnimatePresence mode="wait" initial={false}>
          {phase === "request" ? (
            <motion.div key="request" {...phaseMotion}>
              <AuthHeader
                icon={<AuthIcon icon={KeyRound} />}
                title="Forgot your password?"
                description="Enter the email you log in with and we'll send you a link to choose a new one."
              />
              <form noValidate onSubmit={onSubmit} aria-label="Request a password reset link" className="space-y-5">
                <AuthField
                  ref={emailRef}
                  id="reset-email"
                  label="Work email"
                  icon={Mail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@company.com"
                  autoFocus={autoFocus}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  error={shownError}
                  valid={(touched || submitted) && !error}
                />
                <SubmitButton
                  status={status}
                  loadingLabel="Sending link…"
                  successLabel="Link sent"
                  trailingIcon={
                    <Send aria-hidden className="size-4 transition-transform duration-200 group-hover/glow:translate-x-0.5 group-hover/glow:-translate-y-0.5" />
                  }
                >
                  Send reset link
                </SubmitButton>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className={linkClass}>
                  Back to log in
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div key="sent" {...phaseMotion}>
              <SentPanel
                email={sentTo}
                remaining={cooldown.remaining}
                progress={cooldown.progress}
                resendStatus={resendStatus}
                onResend={resend}
                onChangeEmail={changeEmail}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatedHeight>
    </AuthLayout>
  )
}

interface SentPanelProps {
  email: string
  remaining: number
  progress: number
  resendStatus: ActionStatus
  onResend: () => void
  onChangeEmail: () => void
}

function SentPanel({ email, remaining, progress, resendStatus, onResend, onChangeEmail }: SentPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const waiting = remaining > 0

  // Move focus to the new heading so screen readers announce the state change.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="text-center">
      <SentIllustration className="mb-5" />
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-foreground outline-none">
        Check your inbox
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        If an account exists for <span className="font-medium break-all text-foreground">{email}</span>, a reset link is
        on its way.
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground/90">
        It can take a minute to arrive. Check your spam folder if you don't see it.
      </p>

      <div className="mt-6 space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={waiting || resendStatus !== "idle"}
          focusableWhenDisabled
          aria-label={waiting ? `Resend link, available in ${remaining} seconds` : undefined}
          onClick={onResend}
          className={cn(
            "relative h-10 w-full overflow-hidden rounded-[10px] bg-background/70 text-sm font-medium dark:bg-background/35",
            "data-disabled:text-muted-foreground data-disabled:hover:bg-background/70 dark:data-disabled:hover:bg-background/35",
            resendStatus === "success" && "border-success/40 text-success data-disabled:text-success",
          )}
        >
          {waiting && (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          )}
          <span className="relative">
            <StatusLabel
              status={resendStatus}
              loadingLabel="Resending…"
              successLabel="Link resent"
              icon={waiting ? <Clock aria-hidden className="size-4" /> : <RotateCw aria-hidden className="size-4" />}
            >
              {waiting ? (
                <span>
                  Resend available in <span className="tabular-nums">{formatCountdown(remaining)}</span>
                </span>
              ) : (
                "Resend link"
              )}
            </StatusLabel>
          </span>
        </Button>

        <Button type="button" variant="ghost" onClick={onChangeEmail} className="h-9 w-full rounded-[10px] text-muted-foreground">
          <PencilLine aria-hidden className="size-4" />
          Use a different email
        </Button>
      </div>

      <Link
        to="/login"
        className="group/back mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-4 transition-transform duration-200 group-hover/back:-translate-x-0.5" />
        Back to log in
      </Link>
    </div>
  )
}
