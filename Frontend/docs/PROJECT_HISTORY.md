# Project history

## v1 — 2026-09-24

Built in one session (Claude Code, "project grp" → *Self-healing AI debugger
frontend prompt*). Repo:
[drago200507/self-healing-ai-debugger](https://github.com/drago200507/self-healing-ai-debugger)
(private). Live: <https://self-healing-ai-debugger.netlify.app>.

1. **Spec.** Started from the team's sitemap ([SPEC.md §1](SPEC.md#1-original-sitemap)).
   A detailed Lovable prompt was drafted, then an interactive-elements
   addendum, then both were merged with the backend team's API contract into
   the canonical prompt ([SPEC.md §2](SPEC.md#2-final-build-prompt-canonical)).
2. **Build.** Lovable ran out of credits mid-generation, so the frontend was
   built directly: React 19 + TypeScript + Vite, Tailwind v4, shadcn/ui on Base
   UI, recharts, react-router. The core flow (AI Debugger → Self Healing →
   Chat) was built against the contract with simulated responses; every other
   screen on sample data.
3. **Deploy.** Vercel deploys repeatedly hung in "Building" (not caused by the
   code — isolated by testing), so Netlify became the live host, with an SPA
   fallback so deep links work.
4. **Backend handoff.** The backend owner was added to the repo and sent the
   exact contract plus three things to check: CORS, exact field names, and who
   issues the auth tokens ([API_CONTRACT.md](API_CONTRACT.md#checklist-from-the-original-handoff-2026-09-24)).
5. **Feedback rounds on the landing page.**
   - "It's plain" → animated glows, gradient headline, line-by-line diff reveal.
   - "Make it the best you can" → browser-chrome product preview, live cycling
     status chip, cursor glow, shimmer CTA, dot grid.
   - "Still looks the same to the team" → full rebuild: language switcher,
     activity ticker, animated counters, 3D tilt, before/after, FAQ.
   - "The background is plain black/white" → one continuous viewport-pinned
     background (the fix for a negative z-index that hid it behind the shell).
6. **OAuth buttons** were changed to mock-login like the email form — dead
   buttons felt broken even though real OAuth doesn't exist yet.

Work then paused waiting for the backend to connect.

## v2 — 2026-09-27 (this repo)

A **separate trial repo** — the v1 repo and its live site are untouched. The
brief: take the same spec and push motion, interactivity and polish as far as
they'll go. The first commit is an exact snapshot of v1 so every v2 change is
reviewable as a diff.

What stayed the same: the API contract and its types, every route, and every
spec decision (no AI settings, one fix per heal, tenant from the token, only
the core flow on the real contract).

What's new:

- **Design system** — navy-black / cool-white themes, aurora + grid + grain
  atmosphere, glass surfaces, border beams, a shared motion vocabulary and a
  reduced-motion preference ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).
- **Landing page** — rebuilt around a live "bug that heals" story: the
  neural-mesh canvas, a glitch-then-heal headline, an interactive **Healing
  Simulator** (a mini IDE where a cursor clicks Heal, a scan beam reads the
  code, the root cause is circled, the diff morphs in and tests tick green —
  across four languages), a scroll-driven four-stage pipeline story showing the
  real SSE events, a bento grid of live feature scenes, a streaming-API
  section, a draggable before/after comparison, FAQ and a final CTA.
- **App shell** — grouped sidebar with a sliding active indicator and a live
  healing card, a top-bar AI status pill (idle / stage x of 4 / fix ready /
  needs review), notifications, a ⌘K command palette, keyboard navigation, page
  transitions and a circular theme-switch reveal.
- **AI Debugger** — a real code editor (highlighting for 8 languages, gutter,
  failing-line markers from the parsed trace, Tab/auto-indent, ⌘↵), a
  highlighted trace editor with clickable frames that jump to the line,
  language auto-detection, drag-and-drop files, examples in every language,
  and the live telemetry tracker in place of the run panel while healing.
- **Self Healing** — success banner with a drawn check, confetti and per-stage
  timings; a GitHub-grade diff (unified/split, word-level highlights, foldable
  context, copy/download); markdown explanation with highlighted code; a chat
  with typing indicators and suggested follow-ups.
- **Every other screen** rebuilt on shared primitives with loading skeletons,
  empty states, animated charts and counters, and interactions that do
  something (simulated runs and scans, undoable actions, CSV export, …).
- **Integration** — `heal-api.ts` gained a real streaming client for the
  contract that activates only when `VITE_HEAL_API_URL` is set; otherwise the
  simulation runs (now smarter: curated fixes for the examples, language-aware
  guards and trace-driven explanations for anything else).
