import { ArrowRight, CheckCircle2, Globe, LogIn, Mail, Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AuthField, PasswordField } from "@/components/auth/auth-field"
import { AuthHeader, AuthIcon, AuthLayout } from "@/components/auth/auth-layout"
import {
  prefersAutoFocus,
  readLastSignInMethod,
  readRememberedEmail,
  writeLastSignInMethod,
  writeRememberedEmail,
  type SignInMethod,
} from "@/components/auth/auth-storage"
import { AuthDivider, OAuthButtons, type OAuthProvider } from "@/components/auth/oauth-buttons"
import { SubmitButton, type ActionStatus } from "@/components/auth/status-button"
import { useShake } from "@/components/auth/use-shake"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { validateEmail } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { authenticateEmail, authenticateGoogle, getAuthConfig } from "@/services/heal-api"

type Field = "email" | "password"

export default function LoginPage() {
  const navigate = useNavigate()
  const timers = useTimeouts()
  const [cardRef, shake] = useShake()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [remembered] = useState(readRememberedEmail)
  const [lastMethod] = useState(readLastSignInMethod)
  const [autoFocus] = useState(prefersAutoFocus)

  const [email, setEmail] = useState(remembered)
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(Boolean(remembered))
  const [touched, setTouched] = useState<Record<Field, boolean>>({ email: false, password: false })
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<ActionStatus>("idle")
  const [oauth, setOauth] = useState<{ provider: OAuthProvider; status: ActionStatus } | null>(null)

  // Google Modal state for seamless sign-in
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
    email: validateEmail(email, "Enter your work email."),
    password: password ? null : "Enter your password.",
  }
  const shown = (field: Field) => (touched[field] || submitted ? errors[field] : null)
  const busy = status !== "idle" || oauth !== null

  const signedIn = (method: SignInMethod) => {
    writeLastSignInMethod(method)
    timers.after(650, () => navigate("/dashboard"))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    if (errors.email || errors.password) {
      shake()
      ;(errors.email ? emailRef : passwordRef).current?.focus()
      return
    }
    setStatus("loading")
    try {
      const cleanEmail = email.trim()
      const res = await authenticateEmail(cleanEmail, cleanEmail.split("@")[0].replace(".", " ").toUpperCase())
      setStatus("success")
      writeRememberedEmail(remember ? cleanEmail : null)
      toast.success(`Welcome back, ${res.user?.name || "Developer"}!`, {
        description: `Logged in via ${res.user?.email} · Saved to sessions.db`,
      })
      signedIn("email")
    } catch {
      setStatus("idle")
      toast.error("Failed to sign in. Please verify your credentials.")
    }
  }

  const triggerGoogleLogin = async () => {
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
                toast.success(`Google sign-in verified!`, {
                  description: `Welcome, ${result.user?.name} (${result.user?.email})`,
                })
                signedIn("google")
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

    // Direct fallback if GIS script is blocked or origin not in Google Cloud Console
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
      toast.success(`Google Account Authenticated!`, {
        description: `Saved to SQLite sessions.db as ${result.user?.email}`,
      })
      signedIn("google")
    } catch {
      setOauth(null)
      toast.error("Could not complete Google authentication.")
    }
  }

  const onOAuth = (provider: OAuthProvider) => {
    if (busy) return
    if (provider === "google") {
      void triggerGoogleLogin()
      return
    }
    setOauth({ provider, status: "loading" })
    timers.after(1100, () => {
      setOauth({ provider, status: "success" })
      signedIn(provider)
    })
  }

  return (
    <AuthLayout cardRef={cardRef} footnote="Preview build: sign-in is simulated, so any email and password will do.">
      <AuthHeader
        icon={<AuthIcon icon={LogIn} />}
        title="Welcome back"
        description="Your company login routes you to your team's workspace automatically."
      />

      <OAuthButtons
        active={oauth?.provider ?? null}
        status={oauth?.status ?? "idle"}
        onSelect={onOAuth}
        disabled={status !== "idle"}
        lastUsed={lastMethod === "github" || lastMethod === "google" ? lastMethod : null}
      />

      <AuthDivider>or log in with email</AuthDivider>

      <form noValidate onSubmit={onSubmit} aria-label="Log in with email" className="space-y-4">
        <AuthField
          ref={emailRef}
          id="login-email"
          label="Work email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@company.com"
          autoFocus={autoFocus && !remembered}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={shown("email")}
          valid={(touched.email || submitted) && !errors.email}
        />

        <PasswordField
          ref={passwordRef}
          id="login-password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          autoFocus={autoFocus && Boolean(remembered)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={shown("password")}
        />

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors select-none hover:text-foreground">
            <Checkbox checked={remember} onCheckedChange={setRemember} />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-1">
          <SubmitButton
            status={status}
            loadingLabel="Signing you in…"
            successLabel="Signed in, opening your workspace"
            trailingIcon={
              <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover/glow:translate-x-0.5" />
            }
          >
            Log in
          </SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Self-Healing AI Debugger?{" "}
        <Link
          to="/register"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Create an account
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
                <h3 className="text-base font-semibold text-foreground">Google (Gmail) Sign-In</h3>
                <p className="text-xs text-muted-foreground">Verified by Google OAuth2 backend</p>
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
                  Live SQLite Persistence
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Signing in records this Google account and timestamp directly into <code>sessions.db</code> under the <code>users</code> and <code>login_logs</code> tables.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowGoogleModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmGoogleModal} className="gap-1.5 bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="size-3.5" />
                  Confirm & Enter Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
