# Design system — v2

The brief for v2 was "the most eye-catching, most interactive version of this
product we can make" — without losing the developer-tool credibility the
original spec asked for (Linear / Vercel / Raycast / Sentry grade, trustworthy
rather than playful). Everything below serves that balance.

## The core metaphor: a bug that heals

One visual story repeats across the product, so the motion always *means*
something:

| Stage | Colour | Where you see it |
| --- | --- | --- |
| Broken | red (`destructive`) | glitching "bug." in the hero, red nodes in the neural mesh, squiggles and gutter dots on failing lines |
| AI at work | violet (`info`) | healing pulses in the mesh, the live telemetry tracker, the chat avatar |
| Healed | green (`success`) | ripples when a bug heals, green diff lines, the success check + confetti |
| Action | sky (`primary`) | buttons, links, focus rings, the active nav indicator |

The ECG-style `HeartbeatLine` (erratic red → steady green) is the same story in
one line.

## Colour tokens

Defined in [`src/index.css`](../src/index.css) as CSS variables and mapped to
Tailwind (`bg-primary`, `text-info/80`, …). Both themes are first-class.

| Token | Dark | Light | Meaning |
| --- | --- | --- | --- |
| `background` | deep navy-black `oklch(0.135 0.018 264)` | cool white `oklch(0.985 0.004 255)` | page |
| `card` / `popover` | `oklch(0.172 …)` / `oklch(0.188 …)` | white | surfaces |
| `primary` | `#38bdf8` | `#0284c7` | actions |
| `info` | `#a78bfa` | `#7c3aed` | AI is working |
| `success` | `#34d399` | `#059669` | healed / passed |
| `warning` | `#fbbf24` | `#d97706` | pending / attention |
| `destructive` | `oklch(0.704 0.191 22)` | `oklch(0.577 0.245 27)` | error / failed |

v1 used a flat neutral black; v2's navy-black gives the luminous accents
something to glow against (the team's main feedback on v1 was "the background
is plain").

Syntax colours (`--syn-*`) are tuned per theme and drive `.tok-*` classes used
by the highlighter.

## Typography

- **Geist Variable** for UI, **Geist Mono Variable** for code, logs, traces and
  numbers-as-data.
- Display headlines use tight tracking (`tracking-tighter`) and large sizes
  (up to `5.5rem`); body copy stays at 14–18px with `text-balance` on headings.
- Ligatures are disabled in code surfaces so the editor overlay stays aligned.

## Surfaces

| Utility / component | Use |
| --- | --- |
| `glass`, `glass-strong` | frosted surfaces over the atmosphere (68% / 84% card + blur + saturate) |
| [`Panel`](../src/components/app/panel.tsx) | the standard app content surface with an optional header row |
| [`SpotlightCard`](../src/components/fx/spotlight-card.tsx) | interactive tiles; the surface and 1px border light up under the cursor |
| `border-beam` + `animate-beam-spin` | an animated conic gradient ring for hero objects (simulator, final CTA) |
| [`GlowButton`](../src/components/fx/glow-button.tsx) | the one primary CTA per screen: gradient, glow, light sweep |

## Atmosphere

- [`AuroraBackdrop`](../src/components/fx/aurora-backdrop.tsx) — viewport-pinned drifting aurora, fading line grid,
  film grain and vignette. `marketing` is full strength, `app` is dialled down
  so data stays legible.
- [`NeuralField`](../src/components/fx/neural-field.tsx) — the signature canvas: a drifting constellation where bugs
  appear (red, jittering, infecting their links), a violet pulse travels to
  them, and they heal with a green ripple. It leans toward the cursor, and
  clicking empty space sends out a healing wave. Pauses offscreen and in
  background tabs.

## Motion

Shared vocabulary in [`src/lib/motion.ts`](../src/lib/motion.ts):

- **Curve:** `EASE_OUT = [0.16, 1, 0.3, 1]` — fast start, long soft landing.
- **Springs:** `SPRING` (UI indicators), `SPRING_SOFT`, `SPRING_BOUNCY` (checks,
  badges popping in).
- **Durations:** 0.2–0.35s for state swaps, 0.5–0.8s for entrances, 1–2s for
  counters and drawn paths.

Patterns:

| Pattern | Implementation |
| --- | --- |
| Scroll reveal | `Reveal`, `Stagger` + `StaggerItem` (fade + lift + un-blur) |
| Sliding indicators | shared `layoutId`: sidebar active item, segmented controls, header nav, simulator tabs |
| State swaps | `AnimatePresence` (tracker ⇄ run panel, error ⇄ success, toggles) |
| Numbers | `NumberTicker` — counts via direct DOM writes, re-animates on change |
| Streamed text | `useTypewriter` — telemetry messages, SSE frames, chat previews |
| "AI is reading" | the scan beam over code while analyzing |
| Success | drawn SVG check + `celebrate()` confetti, once per healed session |
| Theme switch | circular reveal from the click point via the View Transitions API |

### Hard-won rules

- **Never put a backdrop at a negative z-index.** Shells are `isolate`,
  backdrops `z-0`, content `z-10` (v1's "background disappears" bug).
- **Masks go on decorative layers only**, never on content (v1 faded its own
  headline this way once).
- **Clear `filter` after blur animations** (`transitionEnd: { filter: "none" }`).
  A lingering `filter: blur(0px)` turns the element into a backdrop root and
  silently kills the glass blur of everything inside it.

## Reduced motion

- The OS `prefers-reduced-motion` setting is respected by default.
- Settings → Appearance offers **System / Reduced / Full** (persisted per
  browser). Implemented by
  [`MotionPreferenceProvider`](../src/components/motion-preference.tsx): it drives
  Motion's `MotionConfig`, sets `data-motion` on `<html>` for the CSS
  kill-switch, and canvas effects render a single still frame.

## Accessibility

- Status is never colour-only: every badge pairs an icon with a label.
- Visible focus rings everywhere; icon-only buttons have `aria-label`s and
  tooltips.
- Keyboard: `⌘/Ctrl K` palette, `/` search, `?` shortcuts, `G` then a letter to
  jump, `⌘/Ctrl Enter` to analyze, Tab/Shift+Tab indentation in the editor.
- The comparison slider is a real `role="slider"` with arrow-key support.

## Component inventory

| Area | Path |
| --- | --- |
| Effects & motion primitives | `src/components/fx/*` |
| App primitives (header, panel, stat card, sparkline, ring, segmented control, skeletons, command palette, AI status pill) | `src/components/app/*` |
| Code (highlighter-backed block, overlay editor, diff viewer) | `src/components/code/*`, `src/lib/{highlight,highlight-trace,diff,stack-trace,detect-language}.ts` |
| Healing flow (telemetry tracker, chat) | `src/components/healing/*` |
| Landing sections | `src/components/marketing/*` |
| Layout shells | `src/components/layout/*` |
