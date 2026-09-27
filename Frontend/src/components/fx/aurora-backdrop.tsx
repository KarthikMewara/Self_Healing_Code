import { cn } from "@/lib/utils"

/**
 * Viewport-pinned atmosphere: drifting aurora light, a fading line grid and a
 * whisper of film grain. Lives at z-0 inside an `isolate` shell (never a
 * negative z-index, which would slide it under the shell's own background),
 * so it follows the reader down the entire page in both themes.
 *
 * `marketing` is the full-strength version; `app` is dialed down so data
 * screens stay calm and legible.
 */
export function AuroraBackdrop({ variant = "marketing" }: { variant?: "marketing" | "app" }) {
  const app = variant === "app"

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Aurora ribbons */}
      <div className={cn("absolute inset-0", app ? "opacity-45" : "opacity-100")}>
        <div
          className="animate-blob-drift absolute top-[-18%] left-[-10%] size-[46rem] rounded-full blur-[120px] will-change-transform"
          style={{ background: "var(--aurora-1)" }}
        />
        <div
          className="animate-blob-drift-alt absolute top-[-8%] right-[-14%] size-[40rem] rounded-full blur-[120px] will-change-transform"
          style={{ background: "var(--aurora-2)", animationDelay: "-6s" }}
        />
        <div
          className="animate-blob-drift absolute top-[48%] left-[-16%] size-[36rem] rounded-full blur-[120px] will-change-transform"
          style={{ background: "var(--aurora-3)", animationDelay: "-12s" }}
        />
        <div
          className="animate-blob-drift-alt absolute right-[-12%] bottom-[-18%] size-[42rem] rounded-full blur-[120px] will-change-transform"
          style={{ background: "var(--aurora-4)", animationDelay: "-3s" }}
        />
        {!app && (
          <div
            className="animate-aurora absolute top-[-30%] left-1/2 h-[60rem] w-[120rem] -translate-x-1/2 opacity-60 blur-[90px]"
            style={{
              background:
                "conic-gradient(from 200deg at 50% 50%, transparent 0deg, var(--aurora-1) 60deg, transparent 120deg, var(--aurora-2) 200deg, transparent 260deg, var(--aurora-3) 320deg, transparent 360deg)",
            }}
          />
        )}
      </div>

      {/* Line grid, fading out toward the edges */}
      <div
        className={cn("bg-line-grid absolute inset-0", app ? "opacity-50" : "opacity-100")}
        style={{
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)",
        }}
      />

      {/* Grain */}
      <div className="bg-noise absolute inset-0 mix-blend-overlay" />

      {/* Vignette keeps the edges grounded */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 20%, transparent 55%, color-mix(in oklch, var(--background) 70%, transparent) 100%)",
        }}
      />
    </div>
  )
}
