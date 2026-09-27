import { ArrowDownRight, Plus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

import { Reveal, Stagger, StaggerItem } from "@/components/fx/reveal"
import { Eyebrow } from "@/components/marketing/section-heading"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const FAQS = [
  {
    q: "Does it actually run my code?",
    a: "No — it never executes anything of yours. It parses the AST and stack trace to reason about the failure, generates a patch, and validates it against your existing test suite in an isolated environment.",
  },
  {
    q: "What languages does it support?",
    a: "JavaScript, TypeScript, Python, Go, Java, C#, Ruby and PHP today.",
  },
  {
    q: "Does my code leave my company's workspace?",
    a: "No — every request is routed and scoped by your company's tenant, which comes from your login token. Nothing crosses between companies.",
  },
  {
    q: "What happens if it can't find a fix?",
    a: "After a few internal attempts it tells you plainly rather than guessing, and hands you whatever analysis it already has. You can edit the code or context and try again.",
  },
  {
    q: "Can I ask follow-up questions about a fix?",
    a: "Yes. Every heal creates a session, and the chat keeps that session's context — ask why the patch is safe, what else it touches, or how to test it.",
  },
  {
    q: "Is there an API?",
    a: "The app runs on the same streaming API you can call yourself: POST /api/v1/heal streams live status events and a complete payload; POST /api/v1/chat answers follow-ups.",
  },
  {
    q: "Can I undo a fix it applied?",
    a: "Every applied fix is tracked in Repair History with a one-click rollback — and a restore if you change your mind.",
  },
]

function Item({ q, a, open, onToggle, i }: { q: string; a: string; open: boolean; onToggle: () => void; i: number }) {
  const id = `faq-${i}`
  return (
    <div
      className={cn(
        "glass rounded-xl border transition-colors duration-300",
        open ? "border-primary/35 shadow-[0_0_40px_-18px_var(--primary)]" : "border-border hover:border-border/100",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground md:text-base"
      >
        {q}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
            open ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground",
          )}
        >
          <Plus className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24 md:px-8 md:py-32">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Reveal className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">Questions you might have</h2>
          <p className="text-muted-foreground">
            The short version: it explains before it changes anything, it tests before it hands anything back, and your code
            stays inside your company's tenant.
          </p>
          <a href="#api" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Read the streaming API <ArrowDownRight className="size-4 -rotate-90" />
          </a>
        </Reveal>
        <Stagger className="space-y-3">
          {FAQS.map((f, i) => (
            <StaggerItem key={f.q}>
              <Item q={f.q} a={f.a} i={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
