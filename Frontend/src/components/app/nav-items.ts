import {
  BarChart3,
  Brain,
  Bug,
  FlaskConical,
  FolderKanban,
  HeartPulse,
  History,
  Layers,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Single-key shortcut used as `G` then this key. */
  key: string
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, key: "d" },
      { label: "Projects", href: "/projects", icon: FolderKanban, key: "p" },
    ],
  },
  {
    label: "Healing",
    items: [
      { label: "AI Debugger", href: "/debugger", icon: Bug, key: "b" },
      { label: "Self Healing", href: "/self-healing", icon: HeartPulse, key: "h" },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "Testing", href: "/testing", icon: FlaskConical, key: "t" },
      { label: "Security", href: "/security", icon: ShieldCheck, key: "s" },
      { label: "Performance", href: "/performance", icon: Zap, key: "f" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "AI Memory", href: "/ai-memory", icon: Brain, key: "m" },
      { label: "History", href: "/history", icon: History, key: "y" },
      { label: "Analytics", href: "/analytics", icon: BarChart3, key: "a" },
    ],
  },
  {
    label: "Enterprise",
    items: [
      { label: "Training Hub", href: "/training", icon: Layers, key: "r" },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: "Settings", href: "/settings", icon: Settings, key: "," }

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM]
