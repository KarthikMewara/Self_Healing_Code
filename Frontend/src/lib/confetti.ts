import confetti from "canvas-confetti"

// Celebration burst for a successful heal. canvas-confetti already honours
// prefers-reduced-motion via disableForReducedMotion; we also skip it when the
// user explicitly chose reduced motion in Settings.

const DARK = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#e0f2fe"]
const LIGHT = ["#0284c7", "#7c3aed", "#059669", "#d97706", "#0ea5e9"]

export function celebrate(from?: HTMLElement | null) {
  if (document.documentElement.dataset.motion === "reduced") return
  const colors = document.documentElement.classList.contains("dark") ? DARK : LIGHT

  let origin = { x: 0.5, y: 0.35 }
  if (from) {
    const rect = from.getBoundingClientRect()
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    }
  }

  const base = { origin, colors, disableForReducedMotion: true, zIndex: 80, ticks: 220, scalar: 0.9 }
  confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38 })
  setTimeout(() => confetti({ ...base, particleCount: 40, spread: 110, startVelocity: 26, decay: 0.92 }), 140)
}
