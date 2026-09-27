import {
  Building2,
  CalendarDays,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  Pause,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react"
import { animate, AnimatePresence, LayoutGroup, motion } from "motion/react"
import {
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Panel } from "@/components/app/panel"
import { PreviewBadge } from "@/components/app/preview-badge"
import { SegmentedControl } from "@/components/app/segmented-control"
import { ApiKeysPanel } from "@/components/auth/api-keys-panel"
import { AuthField } from "@/components/auth/auth-field"
import { ChangePasswordPanel } from "@/components/auth/change-password-panel"
import { DangerZonePanel } from "@/components/auth/danger-zone-panel"
import { submitOnModS } from "@/components/auth/form-shortcuts"
import { SaveBar } from "@/components/auth/save-bar"
import { SecurityCheckup } from "@/components/auth/security-checkup"
import { DrawnCheck, type ActionStatus } from "@/components/auth/status-button"
import { TwoFactorPanel, type TwoFactorMode } from "@/components/auth/two-factor-panel"
import { useMediaQuery } from "@/components/auth/use-media-query"
import { useShake } from "@/components/auth/use-shake"
import { useTimeouts } from "@/components/auth/use-timeouts"
import { initialsOf, validateEmail, validateName } from "@/components/auth/validation"
import { HeartbeatLine } from "@/components/fx/heartbeat-line"
import { Stagger, StaggerItem } from "@/components/fx/reveal"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { useMotionPreference, type MotionPref } from "@/components/motion-preference"
import { useThemeSwitch } from "@/components/theme-toggle"
import { EASE_OUT, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { getActiveUser } from "@/components/auth/auth-storage"
import { accountMeta, initialApiKeys, type ApiKey } from "@/services/mock/settings"
import { currentUser } from "@/services/mock-data"

// Nothing on this screen has a backend yet: saves are simulated and live only
// until reload. There are deliberately no AI settings here -- the backend
// controls AI behaviour per tenant.

type Tab = "profile" | "appearance" | "security"
const TABS: Tab[] = ["profile", "appearance", "security"]

interface Profile {
  name: string
  email: string
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get("tab")
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "profile"
  const [direction, setDirection] = useState(1)

  // Lifted so every tab keeps its state while you move between them.
  const [profile, setProfile] = useState<Profile>(() => {
    const auth = getActiveUser()
    return { name: auth?.name || currentUser.name, email: auth?.email || currentUser.email }
  })
  const [twoFactor, setTwoFactor] = useState<TwoFactorMode>("off")
  const [keys, setKeys] = useState<ApiKey[]>(initialApiKeys)
  const [passwordChanged, setPasswordChanged] = useState(accountMeta.passwordLastChanged)

  const unusedKeys = keys.filter((key) => key.lastUsed === null && !key.isNew).length
  const openSecurityItems = (twoFactor === "on" ? 0 : 1) + (unusedKeys > 0 ? 1 : 0)

  const selectTab = (next: Tab) => {
    if (next === tab) return
    setDirection(TABS.indexOf(next) > TABS.indexOf(tab) ? 1 : -1)
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === "profile") nextParams.delete("tab")
        else nextParams.set("tab", next)
        return nextParams
      },
      { replace: true },
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage your profile, appearance and security."
        badge={<PreviewBadge />}
      />

      <SegmentedControl
        value={tab}
        onChange={selectTab}
        aria-label="Settings sections"
        options={[
          { value: "profile", label: "Profile", icon: <UserRound aria-hidden /> },
          { value: "appearance", label: "Appearance", icon: <Palette aria-hidden /> },
          {
            value: "security",
            label: "Security",
            icon: <ShieldCheck aria-hidden />,
            count: openSecurityItems || undefined,
          },
        ]}
      />

      <TabPanel active={tab === "profile"} direction={direction} label="Profile settings">
        <ProfileSection profile={profile} onSave={setProfile} />
      </TabPanel>
      <TabPanel active={tab === "appearance"} direction={direction} label="Appearance settings">
        <AppearanceSection />
      </TabPanel>
      <TabPanel active={tab === "security"} direction={direction} label="Security settings">
        <SecuritySection
          twoFactor={twoFactor}
          onTwoFactorChange={setTwoFactor}
          keys={keys}
          onKeysChange={setKeys}
          unusedKeys={unusedKeys}
          passwordChanged={passwordChanged}
          onPasswordChanged={() => setPasswordChanged("just now")}
        />
      </TabPanel>
    </div>
  )
}

/**
 * Every section stays mounted (so drafts, dialogs and 2FA setup survive a tab
 * switch); the one coming into view slides in from the side you're heading.
 */
function TabPanel({
  active,
  direction,
  label,
  children,
}: {
  active: boolean
  direction: number
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const wasActive = useRef(active)
  const { reduced } = useMotionPreference()

  // Layout effect + an explicit starting opacity: the panel is un-hidden in the
  // same frame, so it must never paint once at full opacity before fading in.
  useLayoutEffect(() => {
    const el = ref.current
    if (active && !wasActive.current && el && !reduced) {
      el.style.opacity = "0"
      animate(el, { opacity: [0, 1], x: [direction * 28, 0] }, { duration: 0.42, ease: EASE_OUT })
    }
    wasActive.current = active
    // `direction` is read at the moment the tab activates; changing it alone shouldn't replay.
  }, [active, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} role="region" aria-label={label} hidden={!active}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function GradientAvatar({ initials }: { initials: string }) {
  const ring = { background: "conic-gradient(from 0deg, var(--primary), var(--info), var(--success), var(--primary))" }
  return (
    <div className="relative size-16 shrink-0 sm:size-[4.5rem]">
      <span aria-hidden className="absolute -inset-1 animate-spin-slow rounded-full opacity-60 blur-md" style={ring} />
      <span aria-hidden className="absolute -inset-1 animate-spin-slow rounded-full" style={ring} />
      <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-card">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={initials}
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="animate-gradient-pan text-gradient-brand text-xl font-semibold tracking-wide sm:text-2xl"
          >
            {initials}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
      <Icon aria-hidden className="size-3.5" />
      {children}
    </span>
  )
}

/** Login -> token -> workspace, with a pulse travelling along the link. */
function TenantRoute({ company }: { company: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/70 px-2 py-1 text-xs font-medium text-foreground dark:bg-background/40">
        <KeyRound aria-hidden className="size-3.5 text-primary" />
        Your login
      </span>
      <div className="flex min-w-8 flex-1 flex-col items-center gap-1">
        <div className="relative h-2 w-full overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,var(--border)_0_4px,transparent_4px_8px)]"
          />
          <motion.span
            aria-hidden
            className="absolute inset-0"
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
          >
            <span className="absolute top-1/2 right-0 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          </motion.span>
        </div>
        <span className="text-[10px] whitespace-nowrap text-muted-foreground">tenant in your token</span>
      </div>
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-info/30 bg-info/10 px-2 py-1 text-xs font-medium text-foreground">
        <Building2 aria-hidden className="size-3.5 shrink-0 text-info" />
        <span className="truncate">{company}</span>
      </span>
    </div>
  )
}

function ProfileSection({ profile, onSave }: { profile: Profile; onSave: (profile: Profile) => void }) {
  const timers = useTimeouts()
  const [shakeRef, shake] = useShake()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(profile)
  const [touched, setTouched] = useState({ name: false, email: false })
  const [status, setStatus] = useState<ActionStatus>("idle")

  const errors = { name: validateName(draft.name), email: validateEmail(draft.email) }
  const dirty = draft.name !== profile.name || draft.email !== profile.email
  const initials = initialsOf(draft.name) || currentUser.initials
  const emailChanged = draft.email.trim() !== profile.email

  const cancel = () => {
    setDraft(profile)
    setTouched({ name: false, email: false })
  }

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dirty || status !== "idle") return
    setTouched({ name: true, email: true })
    if (errors.name || errors.email) {
      shake()
      ;(errors.name ? nameRef : emailRef).current?.focus()
      return
    }
    setStatus("loading")
    timers.after(800, () => {
      const saved = { name: draft.name.trim(), email: draft.email.trim() }
      onSave(saved)
      setDraft(saved)
      setTouched({ name: false, email: false })
      setStatus("success")
      toast.success("Profile updated", { description: "Preview build: changes last until you reload the page." })
      timers.after(1400, () => setStatus("idle"))
    })
  }

  return (
    <Stagger immediate className="space-y-4">
      <StaggerItem>
        <SpotlightCard glow="var(--info)" className="p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/15 via-info/10 to-transparent"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <GradientAvatar initials={initials} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                  {draft.name.trim() || "Your name"}
                </h2>
                <AnimatePresence>
                  {dirty && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-medium text-warning ring-1 ring-warning/25"
                    >
                      Unsaved preview
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="truncate text-sm text-muted-foreground">{draft.email.trim() || "you@company.com"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip icon={Building2}>{currentUser.companyName}</Chip>
                <Chip icon={Sparkles}>{currentUser.plan} plan</Chip>
                <Chip icon={CalendarDays}>Member since {accountMeta.memberSince}</Chip>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </StaggerItem>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <StaggerItem>
          <div ref={shakeRef} className="h-full">
            <Panel
              title="Personal information"
              description={`How you appear to teammates in ${currentUser.companyName}.`}
              icon={UserRound}
              className="flex h-full flex-col"
              bodyClassName="flex flex-1 flex-col"
            >
              <form
                noValidate
                onSubmit={save}
                onKeyDown={submitOnModS}
                aria-label="Personal information"
                className="flex flex-1 flex-col"
              >
                <div className="grid flex-1 content-start gap-4 sm:grid-cols-2">
                  <AuthField
                    ref={nameRef}
                    id="settings-name"
                    label="Full name"
                    icon={UserRound}
                    autoComplete="name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    error={touched.name ? errors.name : null}
                  />
                  <AuthField
                    ref={emailRef}
                    id="settings-email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    error={touched.email ? errors.email : null}
                    note={emailChanged && !errors.email ? { tone: "info", text: "You'll log in with this address." } : null}
                  />
                </div>
                <SaveBar dirty={dirty} status={status} onCancel={cancel} />
              </form>
            </Panel>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Panel
            title="Workspace"
            description="Set by your company login"
            icon={Building2}
            className="h-full"
            action={
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Lock aria-hidden className="size-3" /> Read-only
              </span>
            }
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-info/25 to-primary/15 text-sm font-semibold text-info ring-1 ring-info/25">
                {initialsOf(currentUser.companyName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{currentUser.companyName}</p>
                <p className="text-xs text-muted-foreground">Your company's workspace</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                {currentUser.plan} plan
              </span>
            </div>
            <div className="mt-4">
              <TenantRoute company={currentUser.companyName} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Your login routes you to this workspace automatically — it isn't user-configurable. To use a different
              workspace, log in with that company's account.
            </p>
          </Panel>
        </StaggerItem>
      </div>
    </Stagger>
  )
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

type ThemeValue = "light" | "dark" | "system"

// Each preview depicts one specific theme whichever theme is active, so it
// carries that theme's own palette rather than the live tokens.
interface MiniPalette {
  bg: string
  sidebar: string
  card: string
  border: string
  fg: string
  muted: string
  primary: string
  info: string
  success: string
  warning: string
}

const LIGHT_UI: MiniPalette = {
  bg: "oklch(0.985 0.004 255)",
  sidebar: "oklch(0.975 0.006 255)",
  card: "#ffffff",
  border: "oklch(0.905 0.01 258)",
  fg: "oklch(0.21 0.02 265)",
  muted: "oklch(0.51 0.022 262)",
  primary: "#0284c7",
  info: "#7c3aed",
  success: "#059669",
  warning: "#d97706",
}

const DARK_UI: MiniPalette = {
  bg: "oklch(0.135 0.018 264)",
  sidebar: "oklch(0.148 0.019 264)",
  card: "oklch(0.172 0.02 264)",
  border: "oklch(1 0 0 / 10%)",
  fg: "oklch(0.97 0.006 260)",
  muted: "oklch(0.72 0.02 262)",
  primary: "#38bdf8",
  info: "#a78bfa",
  success: "#34d399",
  warning: "#fbbf24",
}

function Bar({ w, color, opacity = 1, className }: { w: string; color: string; opacity?: number; className?: string }) {
  return <span className={cn("block h-1 rounded-full", className)} style={{ width: w, background: color, opacity }} />
}

/** A tiny, static rendering of the app in one theme. */
function MiniUI({ p }: { p: MiniPalette }) {
  const code: [string, string, number][][] = [
    [
      ["18%", p.info, 0.9],
      ["30%", p.primary, 0.9],
    ],
    [
      ["10%", p.muted, 0.35],
      ["44%", p.success, 0.85],
    ],
    [
      ["10%", p.muted, 0.35],
      ["22%", p.warning, 0.85],
      ["16%", p.fg, 0.5],
    ],
    [["26%", p.info, 0.9]],
  ]
  return (
    <div className="flex size-full" style={{ background: p.bg }}>
      <div className="flex w-[24%] flex-col gap-[7%] border-r p-[6%]" style={{ background: p.sidebar, borderColor: p.border }}>
        <span className="block size-2 rounded-[3px]" style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.info})` }} />
        <Bar w="90%" color={p.primary} opacity={0.9} />
        <Bar w="70%" color={p.muted} opacity={0.4} />
        <Bar w="80%" color={p.muted} opacity={0.4} />
        <Bar w="60%" color={p.muted} opacity={0.4} />
      </div>
      <div className="flex flex-1 flex-col gap-[7%] p-[6%]">
        <div className="flex items-center justify-between">
          <Bar w="42%" color={p.fg} opacity={0.85} className="h-1.5" />
          <span
            className="block h-2.5 w-[22%] rounded-[3px]"
            style={{ background: `linear-gradient(90deg, ${p.primary}, ${p.info})` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-[6%]">
          {[p.primary, p.success, p.info].map((color) => (
            <div key={color} className="space-y-1 rounded-[4px] border p-[10%]" style={{ background: p.card, borderColor: p.border }}>
              <Bar w="55%" color={p.muted} opacity={0.4} />
              <Bar w="80%" color={color} className="h-1.5" />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-[5%] rounded-[4px] border p-[6%]" style={{ background: p.card, borderColor: p.border }}>
          {code.map((line, i) => (
            <div key={i} className="flex gap-[4%]">
              {line.map(([w, color, opacity], j) => (
                <Bar key={j} w={w} color={color} opacity={opacity} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ThemePreview({ value }: { value: ThemeValue }) {
  if (value === "light") return <MiniUI p={LIGHT_UI} />
  if (value === "dark") return <MiniUI p={DARK_UI} />
  return (
    <div className="relative size-full">
      <MiniUI p={LIGHT_UI} />
      <div className="absolute inset-0" style={{ clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)" }}>
        <MiniUI p={DARK_UI} />
      </div>
    </div>
  )
}

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

function ThemePicker() {
  const { theme, switchTheme } = useThemeSwitch()
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)")
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const hints: Record<ThemeValue, string> = {
    light: "Crisp and bright",
    dark: "Deep navy, the default",
    system: `Follows your OS, ${systemDark ? "dark" : "light"} right now`,
  }

  // The reveal grows from the pointer; keyboard selections grow from the card's centre.
  const choose = (value: ThemeValue, el: HTMLElement, pointer?: { x: number; y: number }) => {
    const rect = el.getBoundingClientRect()
    const origin =
      pointer && (pointer.x || pointer.y) ? pointer : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    switchTheme(value, origin)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown"
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp"
    if (!forward && !back) return
    e.preventDefault()
    const index = Math.max(0, THEME_OPTIONS.findIndex((o) => o.value === theme))
    const nextIndex = (index + (forward ? 1 : -1) + THEME_OPTIONS.length) % THEME_OPTIONS.length
    const el = buttons.current[nextIndex]
    if (!el) return
    el.focus()
    choose(THEME_OPTIONS[nextIndex].value, el)
  }

  return (
    <LayoutGroup id="theme-picker">
      <div role="radiogroup" aria-label="Theme" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-2 sm:gap-4">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }, index) => {
          const active = theme === value
          return (
            <button
              key={value}
              ref={(el) => {
                buttons.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={(e: MouseEvent<HTMLButtonElement>) =>
                choose(value, e.currentTarget, { x: e.clientX, y: e.clientY })
              }
              className="group relative rounded-xl p-1 text-left outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/60 sm:p-1.5"
            >
              {active && (
                <motion.span
                  layoutId="theme-active-ring"
                  transition={SPRING}
                  className="absolute inset-0 rounded-xl border-2 border-primary bg-primary/5 shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent),0_14px_32px_-14px_var(--primary)]"
                />
              )}
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                <div className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                  <ThemePreview value={value} />
                </div>
              </div>
              <div className="relative mt-2 flex items-center gap-1.5 px-1">
                <Icon aria-hidden className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate text-sm font-medium text-foreground">{label}</span>
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 22 }}
                      className="ml-auto hidden size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:flex"
                    >
                      <DrawnCheck className="size-3" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="relative hidden px-1 pb-0.5 text-xs text-muted-foreground sm:block">{hints[value]}</p>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

const MOTION_OPTIONS: { value: MotionPref; label: string; icon: ReactNode }[] = [
  { value: "system", label: "System", icon: <Monitor aria-hidden /> },
  { value: "reduced", label: "Reduced", icon: <Pause aria-hidden /> },
  { value: "full", label: "Full", icon: <Sparkles aria-hidden /> },
]

function MotionSettings() {
  const { pref, setPref, reduced } = useMotionPreference()
  const osReduced = useMediaQuery("(prefers-reduced-motion: reduce)")

  const copy: Record<MotionPref, string> = {
    system: `System follows your OS setting. Right now your OS asks for ${osReduced ? "reduced" : "full"} motion.`,
    reduced: "Transitions become instant and ambient effects, like the neural mesh and live feeds, hold still.",
    full: "Every animation plays, even if your OS asks for reduced motion.",
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <SegmentedControl value={pref} onChange={setPref} options={MOTION_OPTIONS} aria-label="Motion preference" />
        <div className="relative min-h-10 max-w-md">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={pref}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {copy[pref]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30 p-3 md:w-64">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-muted-foreground">Live preview</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1",
              reduced ? "bg-muted text-muted-foreground ring-border" : "bg-success/10 text-success ring-success/25",
            )}
          >
            {reduced ? <Pause aria-hidden className="size-3" /> : <Wind aria-hidden className="size-3" />}
            {reduced ? "Holding still" : "Animating"}
          </span>
        </div>
        <HeartbeatLine className="mt-2 h-14" />
      </div>
    </div>
  )
}

function AppearanceSection() {
  return (
    <Stagger immediate className="space-y-4">
      <StaggerItem>
        <Panel title="Theme" description="Dark is the default. Your choice is remembered in this browser." icon={Palette}>
          <ThemePicker />
        </Panel>
      </StaggerItem>
      <StaggerItem>
        <Panel title="Motion" description="Control how much the interface animates." icon={Wind}>
          <MotionSettings />
        </Panel>
      </StaggerItem>
    </Stagger>
  )
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

interface SecuritySectionProps {
  twoFactor: TwoFactorMode
  onTwoFactorChange: (mode: TwoFactorMode) => void
  keys: ApiKey[]
  onKeysChange: Dispatch<SetStateAction<ApiKey[]>>
  unusedKeys: number
  passwordChanged: string
  onPasswordChanged: () => void
}

function SecuritySection({
  twoFactor,
  onTwoFactorChange,
  keys,
  onKeysChange,
  unusedKeys,
  passwordChanged,
  onPasswordChanged,
}: SecuritySectionProps) {
  const { reduced } = useMotionPreference()
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })

  return (
    <Stagger immediate className="space-y-4">
      <StaggerItem>
        <SecurityCheckup
          passwordChanged={passwordChanged}
          twoFactorOn={twoFactor === "on"}
          unusedKeys={unusedKeys}
          onEnableTwoFactor={() => {
            if (twoFactor === "off") onTwoFactorChange("setup")
            scrollTo("settings-two-factor")
          }}
          onReviewKeys={() => scrollTo("settings-api-keys")}
        />
      </StaggerItem>
      <StaggerItem>
        <ChangePasswordPanel lastChanged={passwordChanged} onChanged={onPasswordChanged} />
      </StaggerItem>
      <StaggerItem>
        <TwoFactorPanel id="settings-two-factor" mode={twoFactor} onModeChange={onTwoFactorChange} />
      </StaggerItem>
      <StaggerItem>
        <ApiKeysPanel
          id="settings-api-keys"
          keys={keys}
          onKeysChange={onKeysChange}
          workspace={currentUser.companyName}
        />
      </StaggerItem>
      <StaggerItem>
        <DangerZonePanel workspace={currentUser.companyName} />
      </StaggerItem>
    </Stagger>
  )
}
