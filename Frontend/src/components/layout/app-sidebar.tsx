import { ArrowRight, Search } from "lucide-react"
import { motion } from "motion/react"
import { Link, useLocation } from "react-router-dom"

import { LogoMark } from "@/components/brand/logo"
import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from "@/components/app/nav-items"
import { ProgressRing } from "@/components/app/progress-ring"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { securityFindings } from "@/services/mock-data"

const urgentFindings = securityFindings.filter((f) => f.severity === "critical" || f.severity === "high").length

function NavButton({ item, active, badge }: { item: NavItem; active: boolean; badge?: React.ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link to={item.href} onClick={() => isMobile && setOpenMobile(false)} />}
        isActive={active}
        tooltip={item.label}
        className="relative data-active:bg-transparent"
      >
        {active && (
          <motion.span
            layoutId="sidebar-active"
            transition={SPRING}
            className="absolute inset-0 rounded-md bg-sidebar-accent shadow-[inset_2px_0_0_var(--primary),0_0_22px_-10px_var(--primary)]"
          />
        )}
        <item.icon className={cn("relative z-10 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
        <span className="relative z-10">{item.label}</span>
      </SidebarMenuButton>
      {badge}
    </SidebarMenuItem>
  )
}

function HealingDot() {
  const { status } = useDebugWorkspace()
  if (status === "idle") return null
  const color = status === "analyzing" ? "bg-info" : status === "complete" ? "bg-success" : "bg-destructive"
  return (
    <SidebarMenuBadge>
      <span className="relative flex size-2">
        {status === "analyzing" && <span className={cn("animate-ping-soft absolute inline-flex size-full rounded-full", color)} />}
        <span className={cn("relative inline-flex size-2 rounded-full", color)} />
      </span>
    </SidebarMenuBadge>
  )
}

function HealingCard() {
  const { status, statusEvents, startedAt, finishedAt } = useDebugWorkspace()
  const pct = status === "complete" ? 100 : status === "analyzing" ? (statusEvents.length / 4) * 90 + 5 : status === "error" ? 100 : 0
  const tone = status === "error" ? "danger" : status === "complete" ? "success" : "info"
  const copy =
    status === "analyzing"
      ? { title: "Healing in progress", body: statusEvents[statusEvents.length - 1]?.message ?? "Connecting to the healing engine…", to: "/debugger", cta: "Watch it" }
      : status === "complete"
        ? {
            title: "Fix ready",
            body: `Healed in ${(((finishedAt ?? 0) - (startedAt ?? 0)) / 1000).toFixed(1)}s — review the diff.`,
            to: "/self-healing",
            cta: "Review fix",
          }
        : status === "error"
          ? { title: "Needs review", body: "The engine couldn't heal the last run.", to: "/self-healing", cta: "See why" }
          : { title: "Engine idle", body: "Paste a bug and its stack trace to start.", to: "/debugger", cta: "Start" }

  return (
    <Link
      to={copy.to}
      className="group/heal relative mx-1 block overflow-hidden rounded-xl border border-sidebar-border bg-gradient-to-br from-primary/10 via-transparent to-info/12 p-3 transition-colors hover:border-primary/30 group-data-[collapsible=icon]:hidden"
    >
      <div className="flex items-center gap-2.5">
        <ProgressRing value={pct} size={30} stroke={3} tone={tone} animateOnView={false}>
          <span
            className={cn(
              "size-1.5 rounded-full",
              status === "analyzing" ? "animate-breathe bg-info" : status === "complete" ? "bg-success" : status === "error" ? "bg-destructive" : "bg-muted-foreground",
            )}
          />
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground">{copy.title}</p>
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{copy.body}</p>
        </div>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
        {copy.cta} <ArrowRight className="size-3 transition-transform group-hover/heal:translate-x-0.5" />
      </span>
    </Link>
  )
}

export function AppSidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { pathname } = useLocation()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <LogoMark className="size-7" />
          <span className="flex min-w-0 flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">Self-Healing</span>
            <span className="mt-0.5 truncate text-[11px] text-muted-foreground">AI Debugger</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onOpenPalette}
          className="mx-1 flex h-8 items-center gap-2 rounded-lg border border-sidebar-border bg-background/40 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          <Search className="size-3.5" />
          Search or jump to…
          <span className="ml-auto flex gap-0.5">
            <Kbd>{MOD_KEY}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavButton
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    badge={
                      item.href === "/self-healing" ? (
                        <HealingDot />
                      ) : item.href === "/security" && urgentFindings > 0 ? (
                        <SidebarMenuBadge className="rounded-full bg-destructive/15 text-[10px] text-destructive">{urgentFindings}</SidebarMenuBadge>
                      ) : undefined
                    }
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <HealingCard />
        <SidebarMenu>
          <NavButton item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
