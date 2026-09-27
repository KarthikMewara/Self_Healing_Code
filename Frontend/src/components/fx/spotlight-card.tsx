import { useRef, type ComponentProps } from "react"

import { cn } from "@/lib/utils"

interface SpotlightCardProps extends ComponentProps<"div"> {
  /** CSS color for the glow; defaults to the primary accent. */
  glow?: string
  /** Radius of the cursor light, in px. */
  size?: number
  /** Adds the frosted glass surface (default) vs. a plain card surface. */
  surface?: "glass" | "card" | "none"
}

/**
 * A card whose surface and 1px border light up under the cursor.
 * The light layers are decorative siblings -- never masks on the content --
 * so text is never faded by the effect.
 */
export function SpotlightCard({
  className,
  children,
  glow = "var(--primary)",
  size = 380,
  surface = "glass",
  style,
  onPointerMove,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current
        if (el) {
          const rect = el.getBoundingClientRect()
          el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
          el.style.setProperty("--my", `${e.clientY - rect.top}px`)
        }
        onPointerMove?.(e)
      }}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-xl border border-border",
        surface === "glass" && "glass",
        surface === "card" && "bg-card",
        className,
      )}
      style={{ "--spot-glow": glow, "--spot-size": `${size}px`, ...style } as React.CSSProperties}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(var(--spot-size) circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklch, var(--spot-glow) 13%, transparent), transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          padding: 1,
          background:
            "radial-gradient(calc(var(--spot-size) * 0.7) circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklch, var(--spot-glow) 75%, transparent), transparent 40%)",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />
      {children}
    </div>
  )
}
