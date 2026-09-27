# Backend API contract

The backend (AI inference, healing loop, database, tenant routing) is built
and owned by the backend team. This document is the interface between that
backend and this frontend. The frontend implements its side of it — and only
its side — in:

- [`src/types/contract.ts`](../src/types/contract.ts) — the request/response types, field for field
- [`src/services/heal-api.ts`](../src/services/heal-api.ts) — the only file that talks to the network

Everything else in the UI consumes those two files, so connecting the real
backend never requires touching a component.

---

## Authentication

Every request carries `Authorization: Bearer <token>`. The backend extracts
the company (tenant) from the token and routes to that company's data and
models. There is **no tenant picker** anywhere in the UI.

## 1. `POST /api/v1/heal` — Server-Sent Events

Headers: `Content-Type: application/json`, `Accept: text/event-stream`,
`Authorization: Bearer <token>`

```ts
interface HealRequest {
  language: string        // e.g. "python", "javascript"
  source_code: string     // the full broken code
  error_trace: string     // the terminal stack trace or error message
  user_context?: string   // optional: "It fails on login"
}
```

The response is a stream of events:

| Event | Payload | Used for |
| --- | --- | --- |
| `status` | `{ step: "retrieval" | "analysis" | "generation" | "testing", message: string }` | The live telemetry tracker. The UI renders `message` verbatim. |
| `complete` | `HealCompletePayload` (below) | The diff viewer, explanation and chat session. |
| `error` | `{ message: string }` | Shown when the backend gives up after its internal retries. |

```ts
interface HealCompletePayload {
  session_id: string      // stored for follow-up chat
  original_code: string
  fixed_code: string      // rendered against original_code in the diff viewer
  explanation: string     // markdown: why it failed and how it was fixed
}
```

Example stream:

```text
event: status
data: {"step":"retrieval","message":"Searching company database for similar React routing errors..."}

event: status
data: {"step":"analysis","message":"Parsing the stack trace and building the AST..."}

event: complete
data: {"session_id":"sess_8f2k1xq4","original_code":"...","fixed_code":"...","explanation":"### Root cause
..."}
```

## 2. `POST /api/v1/chat` — REST

Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`

```ts
interface ChatRequest  { session_id: string; message: string }   // session_id from the complete event
interface ChatResponse { reply_markdown: string }
```

## What the contract asks the frontend NOT to build

Model selection, temperature sliders, max-retry inputs or any other AI
configuration. The backend controls all of it per tenant. (v2 keeps this: the
only settings are profile, appearance/motion, password, 2FA and API keys.)

---

## Connecting this frontend to the backend

1. **Point the app at the API.** Create `.env.local` (git-ignored) or set the
   variable in the hosting provider, then rebuild:

   ```bash
   VITE_HEAL_API_URL=https://your-backend.example.com
   ```

   With it unset, a built-in simulation with the exact same event shapes runs
   instead, so the UI is always demoable. The UI shows a *Simulated engine* /
   *Live backend* badge so nobody confuses the two.

2. **Token.** Real login isn't built yet on either side. Until it is, a token
   can be supplied for testing with `VITE_HEAL_API_TOKEN` (build-time) or
   `localStorage["shad:token"]` (per browser). Once login exists, it should
   store the issued token under that key (or `heal-api.ts` should read it
   from wherever login keeps it).

3. **How the client reads the stream.** `EventSource` can't send a POST body,
   so the client uses `fetch` + a streamed body reader: frames are separated by
   a blank line, `event:` / `data:` fields are parsed per the SSE spec,
   comment lines (`: ...`) are ignored, and `data` is parsed as JSON. A stream
   that closes without `complete` or `error` is reported as an error.

### Checklist from the original handoff (2026-09-24)

- **CORS** — the API must allow the frontend's origin (the deployed domain and
  `http://localhost:5173` for local dev), including the `Authorization` and
  `Accept` headers and the preflight `OPTIONS` request.
- **Exact field names** — `step` / `message` on status events;
  `session_id` / `original_code` / `fixed_code` / `explanation` on complete.
- **Auth token issuance** — someone needs to own the login system that issues
  these Bearer tokens per company.

### Screens with no contract yet

Only **AI Debugger → Self Healing → Chat** is backed by this contract.
Dashboard, Projects, Testing, Security, Performance, AI Memory, History and
Analytics run on sample data (`src/services/mock-data.ts`,
`src/services/mock/*`) and are labelled *Preview data* in the UI. Connecting
the backend will not make those show real data until endpoints are designed for
them.

---

## Appendix — the contract as originally shared (verbatim)

The formatting was flattened when it was pasted; kept here unedited for the
record.

```text
Role & GoalYou are the Frontend Engineering Team building the UI for a Self-Healing Code Debugger. The backend architecture, AI inference, and database are entirely handled by our team. Your goal is to build the user interface and integrate it perfectly with our API based on the exact contract defined below.Do not assume backend states or invent configuration toggles (like "temperature sliders" or "model selectors"). The backend handles all AI configurations, LLM routing, and RAG retrieval internally based on the user's company login tenant.Core Workflow ExperienceAuth: User logs in (determines their company tenant so our backend routes to the correct fine-tuned data).Submission: User pastes buggy code and error logs into an editor.Live Telemetry (Transparency): Upon submission, the UI must display a live, step-by-step progress tracker showing the backend's internal thought process (e.g., Retrieving docs ➔ Analyzing AST ➔ Generating patch ➔ Testing).The Diff Viewer: Once healed, the UI must render a GitHub-style side-by-side or inline Diff Viewer comparing the old code to the new code.Conversational Chat: Below or beside the code, a chat interface allows the user to ask follow-up questions about the fix (maintaining session memory).🔌 API CONTRACT & SCHEMASWe will expose two main endpoints. All requests must include an Authorization: Bearer <token> header. The backend will extract the Company ID from this token to route the query to the correct AI server.1. Submit Code for Healing (Server-Sent Events)Because the healing loop takes time, this endpoint uses SSE (text/event-stream) so you can show live progress before the final code arrives.   Endpoint: POST /api/v1/healHeaders: Content-Type: application/json, Accept: text/event-stream, Authorization: Bearer <token>Request Body (JSON):TypeScriptinterface HealRequest {
  language: string; // e.g., "python", "javascript"
  source_code: string; // The full broken code
  error_trace: string; // The terminal stack trace or error message
  user_context?: string; // Optional: user's description (e.g. "It fails on login")
}
Response Stream (SSE Events):You must listen for the following event types on the stream to update the UI:Event: status (Used for the Live Telemetry Tracker)JSON{
  "step": "retrieval", // enum: "retrieval", "analysis", "generation", "testing"
  "message": "Searching company database for similar React routing errors..."
}
Event: complete (The final payload containing the code to render the Diff)TypeScriptinterface HealCompletePayload {
  session_id: string; // STORE THIS for follow-up chat
  original_code: string;
  fixed_code: string; // Render against original_code in a Diff Viewer
  explanation: string; // Markdown summary of why it failed and how it was fixed
}
Event: error (If the AI cannot heal the code after max retries)JSON{ "message": "Failed to resolve error after 3 attempts. Please manually review." }
2. Follow-Up Chat (REST)Once a session is created from the healing endpoint, the user can ask questions about the patch.Endpoint: POST /api/v1/chatHeaders: Content-Type: application/json, Authorization: Bearer <token>Request Body:TypeScriptinterface ChatRequest {
  session_id: string; // Received from the /heal 'complete' event
  message: string; // User's follow up question
}
Response (JSON):TypeScriptinterface ChatResponse {
  reply_markdown: string; // The AI's answer
}
🖥️ FRONTEND COMPONENT REQUIREMENTSPlease build the following UI components to consume these APIs. You have full creative control over styling (Tailwind, Material, CSS, etc.), but these functional states must exist:Code Input Area:Needs a language dropdown.Needs a pane for source_code and a pane for error_trace.Live Telemetry Tracker:While the API is resolving, show a dynamic loading state that updates its text based on the status events received from the SSE stream (e.g., a stepper or spinning icon with text: "Analyzing AST..." ➔ "Generating patch...").GitHub-Style Diff Viewer:Once the complete event fires, replace the input editor with a Diff Viewer (we recommend using libraries like react-diff-viewer or Monaco Editor's built-in diff functionality).Red background for removed lines, Green for added lines.Contextual Chat Drawer:A side-panel or below-code chat interface that passes the session_id to the /chat endpoint.Do NOT build:Model selection dropdowns, temperature sliders, or max-retry inputs. The backend strictly controls all parameters.
```
