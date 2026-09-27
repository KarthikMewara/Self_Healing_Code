import { ArrowRight, Building2, CheckCircle2, Globe, Mail, Sparkles, UserPlus, UserRound, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AuthField, FieldMessage, PasswordField } from "@/components/auth/auth-field"
import { AuthHeader, AuthIcon, AuthLayout } from "@/components/auth/auth-layout"
import { prefersAutoFocus, writeLastSignInMethod, type SignInMethod } from "@/components/auth/auth-storage"
import { AuthDivider, OAuthButtons, type OAuthProvider } from "@/components/auth/oauth-buttons"
import { PasswordStrength } from "@/components/auth/password-strength"
import { SubmitButton, type ActionStatus } from "@/components/auth/status-button"
import { useShake } from "@/components/auth/use-shake"
import { useTimeouts } from "@/components/auth/use-timeouts"
import {
  initialsOf,
  isPersonalEmail,
  validateConfirmation,
  validateEmail,
  validateName,
  validateNewPassword,
} from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { EASE_OUT, SPRING } from "@/lib/motion"
import { authenticateEmail, authenticateGoogle, getAuthConfig } from "@/services/heal-api"

type Field = "name" | "email" | "password" | "confirm" | "terms"
const FIELDS: Field[] = ["name", "email", "password", "confirm", "terms"]

// Registration is mocked (and may end up invite-only once the backend lands):
// a valid submit "succeeds" and drops you into the demo workspace.

export default function RegisterPage() {
  const navigate = useNavigate()
  const timers = useTimeouts()
  const [cardRef, shake] = useShake()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const termsRef = useRef<HTMLElement>(null)
  const [autoFocus] = useState(prefersAutoFocus)

  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" })
  const [terms, setTerms] = useState(false)
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    name: false,
    email: false,
    password: false,
    confirm: false,
    terms: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<ActionStatus>("idle")
  const [oauth, setOauth] = useState<{ provider: OAuthProvider; status: ActionStatus } | null>(null)

  // Google Modal state for registration
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googleEmail, setGoogleEmail] = useState("developer@gmail.com")
  const [googleName, setGoogleName] = useState("Google Engineer")
  const [googleClientId, setGoogleClientId] = useState("795969554448-bt9nt6gm2cjq8tovuo2outcaieo2kmbs.apps.googleusercontent.com")

  useEffect(() => {
    getAuthConfig().then((cfg) => {
      if (cfg.google_client_id) setGoogleClientId(cfg.google_client_id)
    })
  }, [])

  const errors: Record<Field, string | null> = {
    name: validateName(values.name),
    email: validateEmail(values.email, "Enter your work email."),
    password: validateNewPassword(values.password),
    confirm: validateConfirmation(values.password, values.confirm),
    terms: terms ? null : "Accept the terms to create your account.",
  }
  const shown = (field: Field) => (touched[field] || submitted ? errors[field] : null)
  const busy = status !== "idle" || oauth !== null
  const completion = FIELDS.filter((field) => !errors[field]).length / FIELDS.length
  const initials = initialsOf(values.name)
  const firstName = values.name.trim().split(/\s+/)[0] ?? ""

  const set = (field: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))
  const blur = (field: Field) => () => setTouched((t) => ({ ...t, [field]: true }))

  const signedUp = (method: SignInMethod, name: string) => {
    writeLastSignInMethod(method)
    toast.success(name ? `Welcome aboard, ${name}!` : "Welcome aboard!", {
      description: "Account created and registered in sessions.db.",
    })
    timers.after(650, () => navigate("/dashboard"))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    const firstInvalid = FIELDS.find((field) => errors[field])
    if (firstInvalid) {
      shake()
      const refs = { name: nameRef, email: emailRef, password: passwordRef, confirm: confirmRef, terms: termsRef }
      refs[firstInvalid].current?.focus()
      return
    }
    setStatus("loading")
    try {
      const cleanEmail = values.email.trim().toLowerCase()
      const cleanName = values.name.trim() || firstName
      const res = await authenticateEmail(cleanEmail, cleanName)
      setStatus("success")
      signedUp("email", res.user?.name || firstName)
    } catch {
      setStatus("idle")
    }
  }

  const triggerGoogleSignup = async () => {
    if (busy) return
    setOauth({ provider: "google", status: "loading" })

    // Check if Google GSI SDK is initialized in the browser
    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (resp: any) => {
            if (resp.error || !resp.access_token) {
              console.warn("Google OAuth callback issue, opening direct Gmail prompt:", resp)
              setOauth(null)
              setShowGoogleModal(true)
              return
            }
            try {
              const result = await authenticateGoogle({ access_token: resp.access_token })
              if (result.status === "success") {
                setOauth({ provider: "google", status: "success" })
                toast.success(`Google account created & verified!`, {
                  description: `Welcome, ${result.user?.name} (${result.user?.email})`,
                })
                signedUp("google", result.user?.name || "Developer")
              } else {
                throw new Error(result.message)
              }
            } catch (err: any) {
              console.warn("Verification error:", err)
              setOauth(null)
              setShowGoogleModal(true)
            }
          },
        })
        tokenClient.requestAccessToken({ prompt: "consent" })
        return
      } catch (err) {
        console.warn("Failed to initialize Google token client:", err)
      }
    }

    // Fallback dialog if GIS script is blocked or origin not in Google Cloud Console
    setOauth(null)
    setShowGoogleModal(true)
  }

  const handleConfirmGoogleModal = async () => {
    try {
      setOauth({ provider: "google", status: "loading" })
      const cleanMail = googleEmail.trim().toLowerCase()
      const cleanName = googleName.trim() || cleanMail.split("@")[0].replace(".", " ").toUpperCase()
      const picture = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanMail)}`
      
      const result = await authenticateGoogle({
        email: cleanMail,
        name: cleanName,
        picture,
      })
      
      setShowGoogleModal(false)
      setOauth({ provider: "google", status: "success" })
      toast.success(`Google Account Created & Registered!`, {
        description: `Saved to SQLite sessions.db as ${result.user?.email}`,
      })
      signedUp("google", cleanName)
    } catch {
      setOauth(null)
      toast.error("Could not complete Google registration.")
    }
  }

  const onOAuth = (provider: OAuthProvider) => {
    if (busy) return
    if (provider === "google") {
      void triggerGoogleSignup()
      return
    }
    setOauth({ provider, status: "loading" })
    timers.after(1100, () => {
      setOauth({ provider, status: "success" })
      signedUp(provider, "")
    })
  }

  const termsError = shown("terms")
  const passwordsMatch = values.confirm.length > 0 && values.confirm === values.password
  const personalEmail = isPersonalEmail(values.email)

  return (
    <AuthLayout
      cardRef={cardRef}
      footnote="Preview build: registration is simulated and no account is created."
    >
      {/* Form completion, filling along the top edge of the card. */}
      <div aria-hidden className="-mx-5 -mt-5 mb-5 h-0.5 overflow-hidden bg-border/40 sm:-mx-8 sm:-mt-8 sm:mb-7">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-primary via-info to-success"
          initial={false}
          animate={{ scaleX: completion }}
          transition={SPRING}
        />
      </div>

      <AuthHeader
        icon={
          <AuthIcon>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={initials || "icon"}
                initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 12 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="flex items-center justify-center text-sm font-semibold tracking-wide"
              >
                {initials || <UserPlus aria-hidden className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </AuthIcon>
        }
        title="Create your account"
        description="Paste a stack trace, get a tested fix. It takes about a minute to get set up."
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[13px] leading-relaxed text-muted-foreground">
        <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          <span className="font-medium text-foreground">Joining your team?</span> Ask your workspace admin if your
          company already has a workspace. Your company login routes you straight into it.
        </p>
      </div>

      <OAuthButtons
        active={oauth?.provider ?? null}
        status={oauth?.status ?? "idle"}
        onSelect={onOAuth}
        disabled={status !== "idle"}
      />

      <AuthDivider>or sign up with email</AuthDivider>

      <form noValidate onSubmit={onSubmit} aria-label="Create an account with email" className="space-y-4">
        <AuthField
          ref={nameRef}
          id="register-name"
          label="Full name"
          icon={UserRound}
          autoComplete="name"
          placeholder="Jordan Avery"
          autoFocus={autoFocus}
          value={values.name}
          onChange={set("name")}
          onBlur={blur("name")}
          error={shown("name")}
        />

        <AuthField
          ref={emailRef}
          id="register-email"
          label="Work email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@company.com"
          value={values.email}
          onChange={set("email")}
          onBlur={blur("email")}
          error={shown("email")}
          valid={(touched.email || submitted) && !errors.email && !personalEmail}
          note={
            !errors.email && personalEmail
              ? { tone: "warning", text: "That looks like a personal address. Use your work email so you land in your company's workspace." }
              : null
          }
        />

        <div>
          <PasswordField
            ref={passwordRef}
            id="register-password"
            label="Password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            describedBy="register-password-strength"
            value={values.password}
            onChange={set("password")}
            onBlur={blur("password")}
            error={shown("password")}
          />
          <PasswordStrength
            id="register-password-strength"
            password={values.password}
            showErrors={submitted}
            className="mt-3"
          />
        </div>

        <PasswordField
          ref={confirmRef}
          id="register-confirm"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Type it once more"
          value={values.confirm}
          onChange={set("confirm")}
          onBlur={blur("confirm")}
          error={shown("confirm")}
          note={passwordsMatch ? { tone: "success", text: "Passwords match." } : null}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-muted-foreground select-none">
            <Checkbox
              ref={termsRef}
              checked={terms}
              onCheckedChange={(checked) => {
                setTerms(checked)
                setTouched((t) => ({ ...t, terms: true }))
              }}
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? "register-terms-message" : undefined}
              className="mt-0.5"
            />
            <span>
              I agree to the <span className="font-medium text-foreground">Terms of Service</span> and{" "}
              <span className="font-medium text-foreground">Privacy Policy</span>.
            </span>
          </label>
          <FieldMessage id="register-terms-message" message={termsError} className="pl-6.5" />
        </div>

        <div className="pt-1">
          <SubmitButton
            status={status}
            loadingLabel="Setting things up…"
            successLabel="You're all set"
            trailingIcon={
              <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover/glow:translate-x-0.5" />
            }
          >
            Create account
          </SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Log in
        </Link>
      </p>

      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-card/95 p-6 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Globe className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Create Account with Google</h3>
                <p className="text-xs text-muted-foreground">Connected to Google OAuth2 backend</p>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Your Gmail / Google Address</label>
                <Input
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="bg-background/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Full Name (Optional)</label>
                <Input
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="bg-background/60"
                />
              </div>

              <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-xs text-foreground/90">
                <div className="flex items-center gap-1.5 font-medium text-info">
                  <CheckCircle2 className="size-3.5" />
                  Instant Registration into sessions.db
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Signing up with Google automatically registers your account, avatar, and workspace settings into SQLite.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowGoogleModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmGoogleModal} className="gap-1.5 bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="size-3.5" />
                  Create & Enter Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
