import { cn } from "@/lib/utils"

/** Theme-aware shimmering placeholder block. */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer animate-shimmer rounded-md", className)} />
}

type Layout = "dashboard" | "cards" | "table" | "list" | "charts"

/** Loading state for a whole screen, shaped like the screen it stands in for. */
export function PageSkeleton({ layout = "cards", className }: { layout?: Layout; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Loading">
      {(layout === "dashboard" || layout === "charts") && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass space-y-3 rounded-xl border border-border p-4">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-7 w-20" />
              <Shimmer className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}
      {(layout === "dashboard" || layout === "charts") && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass space-y-4 rounded-xl border border-border p-4">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-56 w-full" />
          </div>
          <div className="glass space-y-3 rounded-xl border border-border p-4">
            <Shimmer className="h-4 w-28" />
            {Array.from({ length: 5 }, (_, i) => (
              <Shimmer key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      )}
      {layout === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="glass space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <Shimmer className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-3.5 w-2/3" />
                  <Shimmer className="h-3 w-1/3" />
                </div>
              </div>
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}
      {(layout === "table" || layout === "list") && (
        <div className="glass space-y-2 rounded-xl border border-border p-4">
          <Shimmer className="mb-4 h-4 w-44" />
          {Array.from({ length: layout === "table" ? 7 : 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Shimmer className={cn("h-9", layout === "table" ? "w-1/4" : "size-9 rounded-full")} />
              <Shimmer className="h-9 flex-1" />
              <Shimmer className="h-9 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
