import {
  Bell,
  BellOff,
  Building2,
  CheckCheck,
  ChevronsUpDown,
  CircleCheck,
  FlaskConical,
  Keyboard,
  LogOut,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldAlert,
  User,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { AiStatusPill } from "@/components/app/ai-status-pill"
import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { ALL_NAV_ITEMS } from "@/components/app/nav-items"
import { clearActiveUser, getActiveUser } from "@/components/auth/auth-storage"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTenant } from "@/context/tenant-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LANGUAGE_COLORS, toLanguageKey } from "@/lib/highlight"
import { cn } from "@/lib/utils"
import { currentUser } from "@/services/mock-data"
import { useProjects } from "@/services/mock/projects"

interface Notification {
  id: string
  icon: LucideIcon
  tone: string
  title: string
  body: string
  time: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    icon: CircleCheck,
    tone: "text-success bg-success/12",
    title: "Fix verified",
    body: "checkout-service · null guard ready to apply",
    time: "2m",
    read: false,
  },
  {
    id: "n2",
    icon: ShieldAlert,
    tone: "text-destructive bg-destructive/12",
    title: "Critical vulnerability",
    body: "routing-gateway · hardcoded admin credentials",
    time: "1h",
    read: false,
  },
  {
    id: "n3",
    icon: FlaskConical,
    tone: "text-info bg-info/12",
    title: "Regression suite passed",
    body: "web-dashboard · 4/4 tests green",
    time: "5h",
    read: true,
  },
]

const HEALTH_DOT = { healthy: "bg-success", attention: "bg-warning", critical: "bg-destructive" } as const

function PageTitle() {
  const { pathname } = useLocation()
  const item = useMemo(
    () => ALL_NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)),
    [pathname],
  )
  if (!item) return null
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={item.href}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="hidden shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground xl:flex"
      >
        <span className="text-muted-foreground/50">/</span>
        <item.icon className="size-3.5" />
        <span className="text-foreground">{item.label}</span>
      </motion.span>
    </AnimatePresence>
  )
}

export function TopBar({ onOpenPalette, onOpenShortcuts }: { onOpenPalette: () => void; onOpenShortcuts: () => void }) {
  // Live store, so projects created / renamed / archived on the Projects page show up here.
  const projects = useProjects().filter((p) => !p.archived)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeProject = projects.find((p) => p.id === activeId) ?? projects[0]
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const unread = notifications.filter((n) => !n.read).length
  const { activeTenant, tenants, setActiveTenant, totalTenantVectors, backendLive, lastChecked } = useTenant()

  const [authUser, setAuthUser] = useState(() => getActiveUser())
  useEffect(() => {
    const onAuth = () => setAuthUser(getActiveUser())
    window.addEventListener("auth-changed", onAuth)
    return () => window.removeEventListener("auth-changed", onAuth)
  }, [])

  const displayedUser = authUser
    ? {
        name: authUser.name,
        email: authUser.email,
        initials:
          authUser.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U",
        picture: authUser.picture,
        companyName: authUser.company_tenant || "Enterprise",
        plan: authUser.provider === "google" ? "Google Enterprise" : "Team",
      }
    : currentUser

  return (
    <header className="glass-strong sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 px-3 md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      {/* Project Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <span className={cn("size-2 rounded-full", activeProject ? HEALTH_DOT[activeProject.health] : "bg-muted-foreground")} />
          <span className="max-w-28 truncate sm:max-w-36">{activeProject?.name ?? "No projects"}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Switch project</DropdownMenuLabel>
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => setActiveId(p.id)} className="gap-2.5">
                <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[toLanguageKey(p.language)] }} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className={cn("size-1.5 rounded-full", HEALTH_DOT[p.health])} />
                {p.id === activeProject?.id && <CircleCheck className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/projects" />}>All projects…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 hidden sm:block" />

      {/* Enterprise Tenant Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="hidden md:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono font-medium text-foreground transition-colors hover:bg-muted border border-border/60">
          <Building2 className="size-3.5 text-primary" />
          <span className="truncate max-w-28">{activeTenant.name}</span>
          <ChevronsUpDown className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between text-xs">
              <span>Enterprise Tenant</span>
              <span className="font-mono text-[10px] text-muted-foreground">{totalTenantVectors.toLocaleString()} vectors</span>
            </DropdownMenuLabel>
            {tenants.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setActiveTenant(t)}
                className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium text-xs text-foreground">{t.name}</span>
                  {t.id === activeTenant.id && <CircleCheck className="size-3.5 text-primary" />}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground truncate w-full">
                  {t.cluster} · {t.model.split("/")[0]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/training" />}>
            Training Hub & Vector Corpus…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PageTitle />

      <button
        type="button"
        onClick={onOpenPalette}
        className="group ml-1 hidden h-8 min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-border bg-background/50 px-2.5 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground hover:shadow-[0_0_24px_-12px_var(--primary)] md:ml-auto md:flex"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search sessions, projects, actions…</span>
        <span className="ml-auto flex gap-0.5">
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 md:ml-2">
        {/* Live Backend Connection Indicator */}
        <div
          title={backendLive ? `FastAPI server live on port 8000 (${lastChecked})` : "FastAPI server offline - running on local synthesis engine"}
          className={cn(
            "hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
            backendLive
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          )}
        >
          <span className="relative flex size-2">
            {backendLive && <span className="animate-ping absolute inline-flex size-full rounded-full bg-success opacity-75" />}
            <span className={cn("relative inline-flex size-2 rounded-full", backendLive ? "bg-success" : "bg-warning")} />
          </span>
          <span>{backendLive ? "FastAPI :8000" : "Offline Engine"}</span>
        </div>

        <AiStatusPill className="hidden sm:inline-flex" />
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Search"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="size-4" />
        </button>
        <ThemeToggle />

        <Popover>
          <PopoverTrigger
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className={cn("size-4", unread > 0 && "animate-bell origin-top")} />
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  key={unread}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-background"
                >
                  {unread}
                </motion.span>
              )}
            </AnimatePresence>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[22rem] gap-0 p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              <AnimatePresence initial={false}>
                {notifications.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-10 text-center">
                    <BellOff className="size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">You're all caught up.</p>
                  </motion.div>
                ) : (
                  notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0 }}
                      className={cn(
                        "group/n relative flex cursor-pointer gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/60",
                        !n.read && "bg-primary/[0.04]",
                      )}
                      onClick={() => setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                    >
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", n.tone)}>
                        <n.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", n.read ? "text-muted-foreground" : "font-medium text-foreground")}>{n.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">{n.time}</span>
                        {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
                      </div>
                      <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNotifications((prev) => prev.filter((x) => x.id !== n.id))
                        }}
                        className="absolute top-1 right-1 hidden size-5 items-center justify-center rounded text-muted-foreground group-hover/n:flex hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Account menu">
            <span className="relative block rounded-full bg-gradient-to-br from-primary via-info to-success p-[1.5px]">
              <Avatar size="sm" className="ring-2 ring-background">
                {displayedUser.picture && <AvatarImage src={displayedUser.picture} alt={displayedUser.name} />}
                <AvatarFallback className="bg-background text-[11px] font-semibold">{displayedUser.initials}</AvatarFallback>
              </Avatar>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{displayedUser.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{displayedUser.email}</span>
                <span className="mt-1 w-fit rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {displayedUser.companyName} · {displayedUser.plan}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/settings" />}>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to="/settings" />}>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenShortcuts}>
              <Keyboard />
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => clearActiveUser()} render={<Link to="/login" />}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
