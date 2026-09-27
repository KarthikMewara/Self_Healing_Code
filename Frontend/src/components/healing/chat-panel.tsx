import { ArrowUp, MessagesSquare, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { Markdown } from "@/components/markdown"
import { useDebugWorkspace } from "@/context/debug-workspace"
import { SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

const SUGGESTIONS = ["Why does this fix work?", "Could this break other callers?", "How should I test this?", "Is there an alternative approach?"]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-info"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

/**
 * Follow-up chat bound to the heal's session_id (POST /api/v1/chat). Only
 * rendered once a heal has completed, so a session always exists.
 */
export function ChatPanel({ className }: { className?: string }) {
  const { result, chatMessages, chatSending, sendMessage } = useDebugWorkspace()
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [chatMessages.length, chatSending])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || chatSending || !result) return
    sendMessage(t)
    setInput("")
    inputRef.current?.focus()
  }

  const asked = new Set(chatMessages.filter((m) => m.role === "user").map((m) => m.content))
  const remaining = SUGGESTIONS.filter((s) => !asked.has(s))

  return (
    <section className={cn("glass flex flex-col overflow-hidden rounded-xl border border-border", className)} aria-label="Ask about this fix">
      <header className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-white shadow-[0_6px_20px_-8px_var(--info)]">
          <MessagesSquare className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Ask about this fix</h2>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">session {result?.session_id}</p>
        </div>
        <span className="ml-auto rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success">context loaded</span>
      </header>

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {chatMessages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-white">
              <Sparkles className="size-3" />
            </span>
            <div className="rounded-2xl rounded-tl-md border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground/90">
              I have the full context of this heal — the original code, the trace and the patch. Ask me anything about it.
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {chatMessages.map((m) =>
            m.role === "user" ? (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, x: 16, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={SPRING}
                className="ml-8 flex justify-end"
              >
                <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-primary/25 to-info/20 px-3.5 py-2.5 text-sm text-foreground ring-1 ring-primary/20">
                  {m.content}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={SPRING}
                className="mr-4 flex gap-2.5"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-white">
                  <Sparkles className="size-3" />
                </span>
                <div className="min-w-0 rounded-2xl rounded-tl-md border border-border bg-background/60 px-3.5 py-2.5">
                  <Markdown content={m.content} />
                </div>
              </motion.div>
            ),
          )}
          {chatSending && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-white">
                <Sparkles className="size-3" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-border bg-background/60 px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {remaining.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-border/60 px-3 py-2">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              disabled={chatSending}
              onClick={() => send(s)}
              className="shrink-0 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground transition-all hover:-translate-y-px hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-border/70 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value)
            e.target.style.height = "auto"
            e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask a follow-up… (Shift+Enter for a new line)"
          aria-label="Ask a follow-up question"
          className="max-h-[120px] min-h-9 flex-1 resize-none rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-primary/15"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.9 }}
          disabled={!input.trim() || chatSending}
          aria-label="Send"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-white shadow-[0_8px_24px_-10px_var(--primary)] transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </motion.button>
      </form>
    </section>
  )
}
