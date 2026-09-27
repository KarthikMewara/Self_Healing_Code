# Product spec — Self-Healing AI Debugger (frontend)

This is the specification the frontend was built from, preserved verbatim from
the original planning session (2026-09-24, "project grp" → *Self-healing AI
debugger frontend prompt*). v1 lives in
[drago200507/self-healing-ai-debugger](https://github.com/drago200507/self-healing-ai-debugger);
this repo (v2) is a separate trial of how far the same spec can be pushed on
motion and interactivity.

**Scope:** frontend only. The backend (AI inference, healing logic, database,
multi-tenant routing) is built and owned by the backend team — see
[API_CONTRACT.md](API_CONTRACT.md) for the interface between the two.

How the pieces relate:

1. **[Original sitemap](#1-original-sitemap)** — the team's starting point.
2. **[Final build prompt](#2-final-build-prompt-canonical)** — the canonical
   spec. It merged the first prompt with the backend team's contract and
   *replaces* the two earlier drafts.
3. **[Appendix A](#appendix-a--first-draft-prompt-superseded)** and
   **[Appendix B](#appendix-b--interactive-elements-addendum-superseded)** —
   the earlier drafts, kept for history. Where they conflict with section 2
   (AI settings, multiple candidate fixes, invented pipeline steps), section 2
   wins.

---

## 1. Original sitemap

```
SELF-HEALING AI DEBUGGER
│
├── 🏠 Landing Page
│
├── 🔐 Authentication
│   ├── Login
│   ├── Register
│   └── Forgot Password
│
└── 🖥️ Application
    │
    ├── 📊 Dashboard
    │
    ├── 📁 Projects
    │   ├── All Projects
    │   ├── Create Project
    │   └── Project Details
    │
    ├── 🐛 AI Debugger
    │   ├── Code Editor
    │   ├── Console
    │   ├── Error Analysis
    │   ├── Root Cause
    │   └── AI Chat
    │
    ├── 🩹 Self Healing
    │   ├── Candidate Fixes
    │   ├── Diff Viewer
    │   ├── Test Results
    │   ├── Security Results
    │   └── Verification
    │
    ├── 🧪 Testing
    │   ├── Test Generator
    │   ├── Test Runner
    │   └── Regression Tests
    │
    ├── 🔒 Security
    │   ├── Vulnerabilities
    │   └── Security Analysis
    │
    ├── ⚡ Performance
    │   ├── Performance Analysis
    │   └── Optimization Suggestions
    │
    ├── 🧠 AI Memory
    │   └── Previous Debugging Cases
    │
    ├── 📜 History
    │   ├── Debug Sessions
    │   └── Repair History
    │
    ├── 📈 Analytics
    │
    └── ⚙️ Settings
        ├── Profile
        ├── AI Settings
        ├── Appearance
        └── Security
```

---

## 2. Final build prompt (canonical)

Differences from the drafts, as agreed at the time:

- **No AI settings.** No model selector, temperature slider, max-retry input or
  "fix aggressiveness". The backend controls all AI behaviour per tenant.
- **One fix per submission.** The `complete` event returns a single
  `fixed_code`; there is no ranked list of candidate fixes or confidence score.
- **No structured test/security results in the contract yet.** Only the
  markdown `explanation` — Testing and Security screens stay preview data.
- **Tenant comes from the login token.** No tenant picker anywhere. Whether
  Register is self-serve or invite-only was left unconfirmed.
- **Exactly four telemetry steps** (`retrieval`, `analysis`, `generation`,
  `testing`), always rendering the backend's literal message text.

````markdown
# Self-Healing AI Debugger — Frontend Build

## Role & Goal
You are building the frontend for Self-Healing AI Debugger. The backend (AI inference, healing logic, database, multi-tenant routing) is owned by a separate backend team, built to the exact API contract below. Build the UI now against a service layer that matches this contract exactly (types, endpoints, event names, headers) but backed by realistic simulated responses (staged timers / mock data), not a live server. The service layer must be swappable for the real backend later with no UI changes.

Do not invent backend configuration the user can control — no model selector, no temperature slider, no max-retry input, no "fix aggressiveness" setting. The backend controls all AI behavior internally based on the logged-in user's company tenant.

## API Contract (implement the service layer to this exactly)
Every request carries Authorization: Bearer <token>. The backend extracts the company/tenant from the token — there is no tenant picker anywhere in the UI.

POST /api/v1/heal — Server-Sent Events (Accept: text/event-stream)
Request:
interface HealRequest {
  language: string;
  source_code: string;
  error_trace: string;
  user_context?: string;
}

Stream events:
- status → { step: "retrieval" | "analysis" | "generation" | "testing", message: string } — drives the live telemetry tracker; always render the literal message text, don't invent your own copy.
- complete →
interface HealCompletePayload {
  session_id: string;
  original_code: string;
  fixed_code: string;
  explanation: string; // markdown
}
- error → { message: string } — sent after the backend exhausts its internal retries.

POST /api/v1/chat — REST
interface ChatRequest { session_id: string; message: string; }
interface ChatResponse { reply_markdown: string; }

Service layer to build now (simulated, same shape as the real thing):
- healCode(request, onStatus, onComplete, onError) — simulate by firing 3-4 staged status events with realistic messages over a few seconds, then a complete event with a realistic before/after code sample and markdown explanation.
- sendChatMessage(request): Promise<ChatResponse> — simulate a short delay, return a realistic markdown reply.

## Tech & Libraries
React + TypeScript + Vite, Tailwind CSS, shadcn/ui, lucide-react for icons, recharts for charts, react-router for routing. For the diff, build a GitHub-style viewer — red background for removed lines, green for added, side-by-side on desktop and unified on narrow screens.

## Design Direction
Precise, confident, developer-tool grade — closer to Linear, Vercel, GitHub, Sentry, Raycast than a generic admin template; this handles people's code, it should feel trustworthy, not playful. Dark mode by default with a working light toggle. Inter (or similar) for UI text, a JetBrains Mono/Fira Code style monospace for all code, logs, diffs, and stack traces. Near-black/near-white neutral base, one confident accent color for primary actions and "AI is working" moments, and consistent semantic colors everywhere: green = healthy/passed, amber = warning/pending, red = error/failed, blue/violet = AI-in-progress. Subtle borders over heavy shadows, restrained motion on state changes. Status must always be legible at a glance — badges/pills for every pass/fail/pending state, never color alone.

## Global Structure
Marketing shell (Landing, Login, Register, Forgot Password) — centered, no app chrome.
App shell — collapsible left sidebar (icon + label), top bar with project switcher, global search, notification bell (dropdown, mark-as-read/clear-all), user avatar menu (Profile/Settings/Logout), theme toggle.

Sidebar groups (suggested lucide icons): Dashboard (LayoutDashboard), Projects (FolderKanban), AI Debugger (Bug), Self Healing (HeartPulse), Testing (FlaskConical), Security (ShieldCheck), Performance (Zap), AI Memory (Brain), History (History), Analytics (BarChart3), Settings (Settings, bottom, separated).

## PHASE 1 — Core workflow (build against the real contract above, full detail)

**Auth**
- Login: email + password, calls the backend, stores the returned token; on success the user lands directly in their company's tenant — no picker anywhere.
- Register: build for completeness/demo purposes, but this flow is unconfirmed — may end up invite-only rather than self-serve.
- Forgot Password: standard email-reset flow.
- All three: validation states, "show password" toggle, GitHub/Google OAuth buttons (visual only), links between all three screens.

**Code Input** (Code Editor screen)
- Language dropdown, a Source Code pane and an Error Trace pane (syntax-highlighted, line numbers), optional "Additional context" field (maps to user_context, e.g. "It fails on login only"). Upload/drag-drop or paste into the code pane. Copy and Clear buttons.
- A prominent "Analyze" button — disabled until language + source_code + error_trace are filled, shows a loading state once clicked, calls healCode(...).

**Live Telemetry Tracker**
- Appears the instant Analyze is clicked. A checklist/stepper for the 4 backend-defined steps (Retrieving docs, Analyzing, Generating patch, Testing) that lights up as matching status events arrive, with the live message text streamed in underneath — render the backend's literal copy, don't hardcode your own step descriptions.
- On error: show the message with "Try Again" (resubmit the same request) and "Edit Code" (back to Code Input) actions.

**Diff Viewer + Explanation**
- On complete: GitHub-style diff of original_code vs fixed_code, red/green line highlighting.
- Explanation panel rendering the explanation field as markdown (this is your root-cause/summary content — there's no separate structured root-cause object).
- Actions: Copy Fixed Code, Download Fixed File, Try Again (resubmit for a fresh attempt).
- There is exactly one fixed result per submission — no confidence score, no multiple candidate fixes to choose between. Don't build a candidate carousel; that would need a backend contract change if it's ever wanted.

**AI Chat**
- Docked side panel or bottom drawer, enabled once a session_id exists from a completed heal (show a disabled state with a hint like "Run a heal first" before that). Text input + Send (Enter to send), chat-bubble history, renders reply_markdown as markdown, calls sendChatMessage({ session_id, message }).

## PHASE 2 — Supporting sections (mock-only — no backend contract exists yet for any of these; keep them visibly separate from the real Phase 1 flow, e.g. a subtle "preview data" badge)

- Projects: All Projects (grid/list, cards with name/language/last activity/health badge), Create Project (modal), Project Details (stats, linked sessions, settings tab).
- Testing: Test Generator, Test Runner (run history table), Regression Tests.
- Security: Vulnerabilities (severity-filterable table), Security Analysis (trend chart).
- Performance: Performance Analysis (before/after metrics), Optimization Suggestions.
- AI Memory: Previous Debugging Cases — searchable/filterable, links back to the originating session.
- History: Debug Sessions (filterable table), Repair History (timeline with rollback action).
- Analytics: bugs fixed over time, fix success rate, time saved, language breakdown (recharts).
- Dashboard: stat cards (Active Projects, Bugs Fixed 30d, Avg Time to Fix, Fix Success Rate), recent sessions table, activity feed, "New Debug Session" button.

## Settings
- Profile, Appearance (theme), Security (password, 2FA, API keys table) — keep.
- No AI Settings tab. Replace it with a small read-only "Workspace" panel showing the company/tenant name from the logged-in user's token — informational only, nothing configurable.

## Interactive Elements (every screen needs these named explicitly, not implied)
- Global: sidebar collapse toggle, project switcher dropdown, search, notification dropdown, user menu, theme toggle.
- Landing: primary CTA, nav links, footer links.
- Projects: New Project button, per-card "⋯" menu (Open/Rename/Archive/Delete with confirm dialog), search/filter/sort, grid/list toggle.
- Phase 2 list pages: search bar, filter dropdowns/chips, row click-through to detail, "Run Now"/"Re-scan" buttons where relevant, "View Details" per row.
- Settings: each section (Profile/Appearance/Security) has its own Save/Cancel — don't share one global save. API key table: Generate/Revoke (confirm dialog). Danger zone Delete Account requires typed confirmation.
- Every destructive action anywhere opens a confirmation dialog before firing.

## States, Responsiveness, Accessibility
Every data view needs a loading skeleton, an empty state (icon + short copy + CTA), and an error state; toasts for action feedback. Fully usable down to tablet width, sidebar collapses to icons/drawer below that. Keyboard-navigable, sufficient contrast in both themes, status never relies on color alone.
````

---

## Appendix A — first draft prompt (superseded)

````markdown
# Self-Healing AI Debugger — Frontend Build

## Role & Goal
You are building the complete frontend for **Self-Healing AI Debugger**, a professional SaaS web app for developers. Users paste in broken code and its error/stack trace; the app's AI analyzes the failure, explains the root cause, proposes verified candidate fixes, runs tests and a security scan against them, and lets the developer review, accept, or roll back the fix. Build only the **frontend** right now — no backend, database, or auth provider integration. All data must come from realistic mock data / local component state, organized behind a clean service layer (e.g. src/services/* or src/lib/api/*) with typed functions like getProjects(), getDebugSession(id), getCandidateFixes(sessionId) — written now to return mock data, swapped later for real API calls without touching any UI component. Do not wire up Supabase or any other backend integration.

## Tech & Libraries
- React + TypeScript + Vite, Tailwind CSS, shadcn/ui components
- lucide-react for icons
- recharts for charts (Analytics/Performance)
- react-router for routing
- Mimic a code editor / diff viewer visually (line numbers, gutters, syntax-style coloring). A full Monaco/CodeMirror integration is not required yet, but it should look like a real code editor and a real GitHub-style diff, not a plain textarea.

## Design Direction
- Aesthetic: precise, confident, developer-tool grade — closer to Linear, Vercel, GitHub, Sentry, Raycast than a generic admin dashboard template. This tool handles people's code; it should feel trustworthy and technical, not playful.
- Dark mode as the default theme, with a working light mode toggle.
- Typography: clean geometric sans (Inter or similar) for UI text; monospace (JetBrains Mono / Fira Code style) for all code, logs, diffs, stack traces.
- Color system: near-black/near-white neutral base; one confident accent color for primary actions and "AI" moments; semantic colors used consistently everywhere — green = healthy/passed/secure, amber = warning/pending, red = error/failed/vulnerable, blue/violet = "AI is working" states.
- Generous spacing, subtle borders instead of heavy shadows, small tasteful motion on state changes (fix applied, test passed) — never gratuitous animation.
- Status must always be legible at a glance: use badges/pills consistently for pass/fail/pending/severity everywhere they appear.

## Global Structure
Two distinct shells:
1. Marketing shell (Landing, Login, Register, Forgot Password) — centered, no app chrome.
2. App shell (everything after login) — collapsible left sidebar with icon+label nav, top bar with: current project switcher, global search, notification bell, AI status indicator (idle/analyzing/healing), user menu.

Sidebar nav groups (suggested lucide icons):
- Dashboard — LayoutDashboard
- Projects — FolderKanban
- AI Debugger — Bug
- Self Healing — HeartPulse
- Testing — FlaskConical
- Security — ShieldCheck
- Performance — Zap
- AI Memory — Brain
- History — History
- Analytics — BarChart3
- Settings — Settings (bottom of sidebar, separated)

## Build Priority
Build PHASE 1 with full detail and polish. Build PHASE 2 as complete, working, nicely laid-out pages (tables/lists/cards, reusing Phase 1 components) — consistency over novelty for these.

### PHASE 1 — Core flow (full detail)

**Landing Page**
- Hero: headline + subheadline + primary CTA ("Start Debugging Free"), with a visual of a broken code snippet turning into a green "fixed" diff beside it.
- "How it works" — 4 steps: Paste code & error → AI finds the root cause → Review verified candidate fixes → Tested & secured fix delivered.
- Feature grid (6 cards): Root cause analysis, Self-healing fixes, Auto-generated tests, Security scanning, Performance suggestions, AI memory that learns from past fixes.
- Social proof strip (logo placeholders), final CTA band, footer.

**Auth** — Login, Register, Forgot Password: centered card, email+password with validation states, GitHub/Google OAuth buttons (visual only), links between all three.

**Dashboard**
- Header greeting + "New Debug Session" primary button.
- Stat cards: Active Projects, Bugs Fixed (30d), Avg. Time to Fix, Fix Success Rate.
- Recent Debug Sessions table (project, error summary, status badge, time).
- Activity feed (AI actions: "Fixed null pointer in auth.ts", "Found 1 critical vulnerability").

**Projects**
- All Projects: grid/list toggle, cards show name, language icon, last activity, health score badge.
- Create Project: modal — name, language/framework select, description, optional "connect repository" (visual placeholder, disabled/"coming soon").
- Project Details: overview stats, tabs for linked Debug Sessions / Settings, health trend mini-chart.

**AI Debugger** (main workspace — one page with sub-tabs/panels, not separate routes)
- Code Editor panel: syntax-highlighted input, language auto-detect badge, upload/drag-drop or paste, line numbers.
- Console panel: terminal-style monospace output, color-coded by log level, auto-scroll, copy button.
- Error Analysis panel: parsed error type + message + clickable stack trace linking to code lines, AI confidence %.
- Root Cause panel: plain-English explanation card with a "show technical detail" toggle, offending lines highlighted inline in the editor, "similar past case" link (from AI Memory).
- AI Chat: docked side panel or bottom drawer, chat-bubble UI for follow-up questions, a few suggested quick-prompt chips.
- These panels should feel like one connected workspace (resizable split panes), not disconnected pages.

**Self Healing** (follows directly from AI Debugger)
- Pipeline stepper across the top: Analyze → Generate Fix → Test → Scan → Verify → Done, each step shows live status.
- Candidate Fixes: 1-3 cards, each with confidence %, one-line rationale, "Preview Diff" / "Apply" actions.
- Diff Viewer: GitHub-style unified/side-by-side diff, red/green line highlighting, copy/download fixed file.
- Test Results: pass/fail summary bar + expandable list of individual tests with status icon and duration.
- Security Results: findings list tagged Critical/High/Medium/Low with short descriptions.
- Verification: final status summary, "Mark Resolved" and "Rollback" actions.

### PHASE 2 — Supporting sections (complete, simple, consistent layouts)

- Testing: Test Generator (config form: coverage target, test types), Test Runner (run history table), Regression Tests (list with last-run status).
- Security: Vulnerabilities (project-wide table, severity-filterable), Security Analysis (trend chart + breakdown by type).
- Performance: Performance Analysis (before/after metrics), Optimization Suggestions (card list with impact estimate).
- AI Memory: Previous Debugging Cases — searchable/filterable card list, each links back to its original Debug Session; show "similarity match" badges.
- History: Debug Sessions (filterable table, links into the AI Debugger workspace for that session), Repair History (timeline of applied fixes with rollback option).
- Analytics: charts for bugs fixed over time, fix success rate, time saved, and language/error-type breakdown.
- Settings: Profile, AI Settings (model choice, fix "aggressiveness" slider, auto-apply toggle), Appearance (theme), Security (password, 2FA, API keys table).

## Data & Mock Content
Define consistent mock shapes for Project, DebugSession, Error, CandidateFix, TestResult, SecurityFinding and reuse them everywhere so numbers/names match across Dashboard, Projects, History, and Analytics instead of random placeholder text. Use realistic multi-language examples (JS/TS, Python, Go) with real-looking stack traces and diffs, not lorem ipsum.

## States
Every data view needs a loading skeleton, an empty state (icon + short copy + CTA), and an error state. Use toasts for action feedback (fix applied, test run started, etc.).

## Responsiveness & Accessibility
Fully usable down to tablet width; sidebar collapses to icons-only or a drawer below that. Keyboard-navigable, sufficient contrast in both themes — status must never rely on color alone, always pair with an icon or label.

## Explicitly out of scope for now
No real authentication, no database, no payments, no real code execution. Everything must be visually and functionally complete using mock data, structured so real API calls can be dropped in later with minimal changes.
````

---

## Appendix B — interactive elements addendum (superseded)

Still useful as a checklist of controls every screen should have; its
"AI Settings" items are superseded by section 2.

````markdown
# Interactive Elements & Actions Addendum

Add explicit interactive controls to every screen below — these were underspecified in the last prompt. Every button needs hover/disabled/loading states, and every destructive action must open a confirmation dialog before firing (never fire immediately).

## Global (every app page)
- Sidebar: collapse/expand toggle button.
- Top bar: project switcher (dropdown), global search (click or "/" to focus, results dropdown), notification bell (opens dropdown panel with mark-as-read / clear-all), user avatar (dropdown: Profile, Settings, Logout).
- Theme toggle (light/dark) in top bar or settings.

## Landing Page
- Primary CTA button ("Start Debugging Free") → Register.
- Secondary nav links (How it Works, Features, Login) that scroll or route.
- Footer links.

## Auth
- Submit button per form with loading spinner state.
- "Show password" eye-icon toggle.
- "Remember me" checkbox (Login).
- GitHub / Google OAuth buttons (visual, clickable).
- Text links between Login ↔ Register ↔ Forgot Password.

## Dashboard
- "New Debug Session" primary button (top of page) → opens AI Debugger.
- Stat cards are clickable → route to the relevant section (e.g. "Bugs Fixed" → History).
- Recent Sessions table rows are clickable → open that session.
- "View All" link on Activity Feed and Recent Sessions.

## Projects
- "New Project" button → Create Project modal.
- Each project card has a "⋯" menu: Open, Rename, Archive, Delete (Delete opens a confirm dialog).
- Create Project modal: Save and Cancel buttons, inline field validation.
- Search input + language filter dropdown + sort dropdown (Recent/Name/Health) + grid/list view toggle.
- Project Details: "New Debug Session" button scoped to that project, tab switcher (Overview/Sessions/Settings).

## AI Debugger
- Prominent "Analyze" / "Debug This" button — the core action that kicks off the pipeline and moves the user into Self Healing. Disabled until both code and error are present; shows a loading/analyzing state when clicked.
- "Upload File" and "Paste from Clipboard" buttons on the Code Editor panel.
- "Copy Code" button on the editor.
- "Clear" / "Reset" button.
- Language auto-detect badge is a dropdown (user can override).
- AI Chat: text input + Send button (Enter to send), clickable suggested-prompt chips, "Copy" button on code blocks inside chat replies.
- Stack trace frames in Error Analysis are clickable → jump to that line in the editor.
- Root Cause panel: "Show technical detail" toggle, "View similar case" link (→ AI Memory).

## Self Healing
- Each Candidate Fix card: "Preview Diff", "Apply Fix", and "Regenerate" (try a different approach) buttons.
- Diff Viewer: "Copy" and "Download Fixed File" buttons; per-hunk Accept/Reject is a nice-to-have if time allows, otherwise whole-fix Apply is enough.
- Test Results: "Re-run Tests" button; each failing test row expandable with a "View Details" toggle.
- Security Results: "Re-scan" button; each finding has "View Details" and "Ignore" actions.
- Pipeline stepper: completed steps are clickable to jump back and review that stage.
- Final actions: "Mark Resolved" (primary) and "Rollback" (secondary/destructive, confirm dialog).

## Testing / Security / Performance (Phase 2)
- "Run Now" / "Re-scan" button on each section.
- Severity/status filter dropdowns, search input.
- Row-level "View Details" action; for vulnerabilities, an additional "Fix This" button that routes into a new Self Healing flow scoped to that finding.

## AI Memory / History
- Search bar + filter chips (by language, status, date range).
- Row/card click → opens the original Debug Session (read-only replay).
- "Restore this fix" button on a past Repair History entry.

## Analytics
- Date-range picker.
- Export button (CSV/PDF, visual only for now).
- Chart legend items toggle series visibility on click.

## Settings
- Each form section (Profile, AI Settings, Appearance, Security) has its own Save and Cancel buttons — don't share one global save.
- AI Settings: "auto-apply fixes" toggle switch, "fix aggressiveness" slider.
- Security tab: "Enable 2FA" toggle, API Keys table with "Generate New Key" and per-row "Revoke" (confirm dialog).
- Danger zone: "Delete Account" button, red/destructive styling, requires typed confirmation in the dialog.
````
