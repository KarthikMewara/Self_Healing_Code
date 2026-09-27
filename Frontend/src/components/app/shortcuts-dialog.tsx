import { Kbd, MOD_KEY } from "@/components/app/kbd"
import { ALL_NAV_ITEMS } from "@/components/app/nav-items"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const GENERAL: { keys: string[]; label: string }[] = [
  { keys: [MOD_KEY, "K"], label: "Open the command palette" },
  { keys: ["/"], label: "Open the command palette" },
  { keys: [MOD_KEY, "B"], label: "Collapse / expand the sidebar" },
  { keys: [MOD_KEY, "Enter"], label: "Analyze (in the AI Debugger)" },
  { keys: ["Tab"], label: "Indent in the code editor (Shift+Tab to outdent)" },
  { keys: ["?"], label: "Show this list" },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around without touching the mouse.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">General</p>
            {GENERAL.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground/90">{s.label}</span>
                <span className="flex shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Go to (press G, then…)</p>
            {ALL_NAV_ITEMS.map((item) => (
              <div key={item.href} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-foreground/90">
                  <item.icon className="size-3.5 text-muted-foreground" />
                  {item.label}
                </span>
                <span className="flex gap-1">
                  <Kbd>G</Kbd>
                  <Kbd>{item.key.toUpperCase()}</Kbd>
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
