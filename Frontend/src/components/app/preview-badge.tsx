import { FlaskConical } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Marks a screen whose numbers are sample data. Only AI Debugger -> Self
 * Healing -> Chat is built against the real backend contract; everything that
 * wears this badge has no API designed for it yet.
 */
export function PreviewBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex h-5 cursor-help items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 text-[11px] font-medium text-warning",
              className,
            )}
          />
        }
      >
        <FlaskConical className="size-3" />
        Preview data
      </TooltipTrigger>
      <TooltipContent>Sample data — no backend endpoint exists for this screen yet.</TooltipContent>
    </Tooltip>
  )
}
