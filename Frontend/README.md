# Self-Healing AI Debugger — v2 (frontend)

> Paste the bug. Get back a tested fix — with every step of the reasoning streamed live.

The frontend for **Self-Healing AI Debugger**: developers paste broken code and
its error trace, an AI backend streams its healing pipeline (retrieval →
analysis → generation → testing) and returns a tested patch with a plain-English
explanation and a follow-up chat.

**v2 is a separate trial build.** It starts from an exact snapshot of v1
([drago200507/self-healing-ai-debugger](https://github.com/drago200507/self-healing-ai-debugger))
and pushes motion, interactivity and polish as far as they'll go — so the team
can compare the two side by side. The v1 repo and site are untouched.

**Frontend only.** The backend is built and owned by the backend team; this
repo implements the frontend's side of their contract and nothing more.

## Highlights

- **A landing page that tells the story live** — a neural-mesh canvas where bugs
  appear and get healed (it reacts to your cursor; click empty space for a
  healing wave), a glitch-then-heal headline, and an interactive **Healing
  Simulator**: a mini IDE where a cursor clicks *Heal*, a scan beam reads the
  code, the root cause is circled, the diff morphs in and tests tick green —
  in four languages.
- **Scroll-driven "How it works"** tied to the real SSE events, a bento grid of
  live feature scenes, a streaming-API section, and a draggable before/after.
- **A real code editor** — highlighting for 8 languages, failing-line markers
  from the parsed stack trace, clickable trace frames that jump to the line,
  auto language detection, drag-and-drop files, Tab/auto-indent, `⌘/Ctrl ↵`.
- **Live telemetry** that renders the backend's literal status messages with
  per-stage timings, then a success banner (drawn check + confetti), a
  GitHub-grade diff (unified/split, word-level highlights, foldable context)
  and a session-aware follow-up chat.
- **An app shell built for keyboards** — `⌘/Ctrl K` command palette, `G`+letter
  navigation, `?` for shortcuts, a live AI-status pill, sliding indicators,
  page transitions, and a circular theme-switch reveal.
- **Every screen interactive** — loading skeletons, empty states, animated
  charts and counters, simulated runs and scans, undoable actions, CSV export.
- **Light + dark, and reduced motion** — both themes first-class; the OS
  reduced-motion setting is honoured, with a System / Reduced / Full override
  in Settings.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Try **AI Debugger → Load example**, then
`⌘/Ctrl ↵`. Put `unrecoverable` in an error trace to see the failure path.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Oxlint |

## Connecting the backend

Everything network-related lives in [`src/services/heal-api.ts`](src/services/heal-api.ts),
typed by [`src/types/contract.ts`](src/types/contract.ts). By default it runs a
built-in simulation with the exact contract shapes (the UI shows a *Simulated
engine* badge). To use the real backend:

```bash
# .env.local (git-ignored) — or set it in the hosting provider, then rebuild
VITE_HEAL_API_URL=https://your-backend.example.com
# optional, until real login issues tokens:
VITE_HEAL_API_TOKEN=...
```

Contract, SSE framing details and the CORS / field-name / auth checklist:
**[docs/API_CONTRACT.md](docs/API_CONTRACT.md)**.

Only **AI Debugger → Self Healing → Chat** has a backend contract today. The
other screens use sample data from `src/services/mock-data.ts` and
`src/services/mock/*` and are labelled *Preview data*.

## Docs

| Doc | Contents |
| --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | The original sitemap and the full build prompts, verbatim |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | The backend contract and how this frontend connects to it |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, surfaces, motion vocabulary, accessibility, component map |
| [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) | How v1 was built and what changed in v2 |

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · shadcn/ui on Base UI ·
Motion · cmdk · Recharts · react-router 7 · sonner · canvas-confetti.
The syntax highlighter, diff engine, trace parser and editor are in-house (no
Monaco/CodeMirror), which keeps the bundle small and every token animatable.

## Project structure

```text
src/
  components/
    fx/          neural field, aurora, reveal, ticker, spotlight, magnetic, glow button…
    app/         page header, panel, stat card, sparkline, ring, segmented control,
                 command palette, AI status pill, skeletons
    code/        code block, overlay editor, diff viewer
    healing/     telemetry tracker, chat panel
    marketing/   landing sections (hero, simulator, pipeline, bento, API, compare, FAQ, CTA)
    layout/      marketing + app shells, sidebar, top bar
    ui/          shadcn/ui (Base UI) primitives
  context/       debug workspace (the live heal state)
  lib/           highlighter, diff, stack-trace parser, language detection, examples, motion
  pages/         marketing/*, app/*, not-found
  services/      heal-api (contract boundary), mock-data, mock/*
  types/         contract (backend), domain (preview screens)
docs/            spec, API contract, design system, history
```

## Deploying

It's a static SPA: build to `dist/` and serve with a fallback to `index.html`
(`public/_redirects` handles Netlify, `vercel.json` handles Vercel).
