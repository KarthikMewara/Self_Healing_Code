import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { findExample } from "@/lib/examples"
import { parseStackTrace } from "@/lib/stack-trace"
import { healCode, sendChatMessage, type HealHandle } from "@/services/heal-api"
import type { ChatMessage, HealCompletePayload, HealRequest, HealStatusEvent } from "@/types/contract"

export type WorkspaceStatus = "idle" | "analyzing" | "complete" | "error"

/** A contract status event plus the client-side time it arrived. */
export type TimedStatusEvent = HealStatusEvent & { at: number }

/** What's currently typed into the AI Debugger (survives navigation). */
export interface DebugDraft {
  language: string
  source: string
  trace: string
  context: string
  /** Set when the draft came from "Load example". */
  exampleId?: string
}

/** A heal that finished during this browser session. */
export interface CompletedHeal {
  sessionId: string
  language: string
  errorSummary: string
  finishedAt: number
  durationMs: number
  outcome: "resolved" | "failed"
}

interface DebugWorkspaceState {
  status: WorkspaceStatus
  request: HealRequest | null
  statusEvents: TimedStatusEvent[]
  startedAt: number | null
  finishedAt: number | null
  result: HealCompletePayload | null
  errorMessage: string | null
  chatMessages: ChatMessage[]
  chatSending: boolean
  draft: DebugDraft
  /** Heals completed this session, newest first. */
  completed: CompletedHeal[]
  setDraft: (patch: Partial<DebugDraft>) => void
  loadExample: (id: string) => void
  submit: (request: HealRequest) => void
  retry: () => void
  cancel: () => void
  reset: () => void
  sendMessage: (text: string) => void
}

const DebugWorkspaceContext = createContext<DebugWorkspaceState | null>(null)

const DRAFT_KEY = "shad:draft"
const EMPTY_DRAFT: DebugDraft = { language: "typescript", source: "", trace: "", context: "" }

function readDraft(): DebugDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) return { ...EMPTY_DRAFT, ...JSON.parse(raw) }
  } catch {
    // Unavailable storage just means a fresh draft.
  }
  return EMPTY_DRAFT
}

function summarize(request: HealRequest) {
  const { errorType, message } = parseStackTrace(request.error_trace)
  if (errorType) return `${errorType}: ${message ?? ""}`.trim()
  return request.error_trace.split("\n")[0]?.slice(0, 120) || "Unknown error"
}

export function DebugWorkspaceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WorkspaceStatus>("idle")
  const [request, setRequest] = useState<HealRequest | null>(null)
  const [statusEvents, setStatusEvents] = useState<TimedStatusEvent[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [result, setResult] = useState<HealCompletePayload | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatSending, setChatSending] = useState(false)
  const [draft, setDraftState] = useState<DebugDraft>(readDraft)
  const [completed, setCompleted] = useState<CompletedHeal[]>([])
  const handleRef = useRef<HealHandle | null>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Non-fatal.
    }
  }, [draft])

  useEffect(() => () => handleRef.current?.cancel(), [])

  const setDraft = useCallback((patch: Partial<DebugDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadExample = useCallback((id: string) => {
    const ex = findExample(id)
    if (!ex) return
    setDraftState({ language: ex.language, source: ex.original, trace: ex.trace, context: ex.context ?? "", exampleId: ex.id })
  }, [])

  const submit = useCallback((req: HealRequest) => {
    handleRef.current?.cancel()
    const began = Date.now()
    setRequest(req)
    setStatus("analyzing")
    setStatusEvents([])
    setStartedAt(began)
    setFinishedAt(null)
    setResult(null)
    setErrorMessage(null)
    setChatMessages([])

    handleRef.current = healCode(req, {
      onStatus: (event) => setStatusEvents((prev) => [...prev, { ...event, at: Date.now() }]),
      onComplete: (payload) => {
        const now = Date.now()
        setResult(payload)
        setFinishedAt(now)
        setStatus("complete")
        setCompleted((prev) => [
          {
            sessionId: payload.session_id,
            language: req.language,
            errorSummary: summarize(req),
            finishedAt: now,
            durationMs: now - began,
            outcome: "resolved",
          },
          ...prev,
        ])
      },
      onError: (event) => {
        const now = Date.now()
        setErrorMessage(event.message)
        setFinishedAt(now)
        setStatus("error")
        setCompleted((prev) => [
          {
            sessionId: `failed_${now.toString(36)}`,
            language: req.language,
            errorSummary: summarize(req),
            finishedAt: now,
            durationMs: now - began,
            outcome: "failed",
          },
          ...prev,
        ])
      },
    })
  }, [])

  const retry = useCallback(() => {
    if (request) submit(request)
  }, [request, submit])

  const cancel = useCallback(() => {
    handleRef.current?.cancel()
    handleRef.current = null
    setStatus("idle")
    setStatusEvents([])
    setStartedAt(null)
    setFinishedAt(null)
  }, [])

  const reset = useCallback(() => {
    handleRef.current?.cancel()
    handleRef.current = null
    setStatus("idle")
    setRequest(null)
    setStatusEvents([])
    setStartedAt(null)
    setFinishedAt(null)
    setResult(null)
    setErrorMessage(null)
    setChatMessages([])
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      if (!result) return
      const userMessage: ChatMessage = { id: `msg_${Date.now()}`, role: "user", content: text, createdAt: Date.now() }
      setChatMessages((prev) => [...prev, userMessage])
      setChatSending(true)
      sendChatMessage({ session_id: result.session_id, message: text })
        .then((res) => {
          setChatMessages((prev) => [
            ...prev,
            { id: `msg_${Date.now()}_r`, role: "assistant", content: res.reply_markdown, createdAt: Date.now() },
          ])
        })
        .catch((err: unknown) => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_e`,
              role: "assistant",
              content: `**Couldn't reach the assistant.** ${err instanceof Error ? err.message : "Please try again."}`,
              createdAt: Date.now(),
            },
          ])
        })
        .finally(() => setChatSending(false))
    },
    [result],
  )

  const value = useMemo<DebugWorkspaceState>(
    () => ({
      status,
      request,
      statusEvents,
      startedAt,
      finishedAt,
      result,
      errorMessage,
      chatMessages,
      chatSending,
      draft,
      completed,
      setDraft,
      loadExample,
      submit,
      retry,
      cancel,
      reset,
      sendMessage,
    }),
    [
      status,
      request,
      statusEvents,
      startedAt,
      finishedAt,
      result,
      errorMessage,
      chatMessages,
      chatSending,
      draft,
      completed,
      setDraft,
      loadExample,
      submit,
      retry,
      cancel,
      reset,
      sendMessage,
    ],
  )

  return <DebugWorkspaceContext.Provider value={value}>{children}</DebugWorkspaceContext.Provider>
}

export function useDebugWorkspace() {
  const ctx = useContext(DebugWorkspaceContext)
  if (!ctx) throw new Error("useDebugWorkspace must be used within DebugWorkspaceProvider")
  return ctx
}
