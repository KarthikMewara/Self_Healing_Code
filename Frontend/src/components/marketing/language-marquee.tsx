import { Check, X } from "lucide-react"

import { LANGUAGE_COLORS, LANGUAGE_EXTENSIONS, LANGUAGE_LABELS, type LanguageKey } from "@/lib/highlight"

const LANGS = Object.keys(LANGUAGE_LABELS) as LanguageKey[]

const ERRORS = [
  "TypeError",
  "KeyError",
  "NullPointerException",
  "nil pointer dereference",
  "IndexError",
  "DivideByZeroException",
  "NoMethodError",
  "Call to a member function on null",
  "ReferenceError",
  "index out of range",
  "UnboundLocalError",
  "ConcurrentModificationException",
  "Maximum update depth exceeded",
  "undefined is not a function",
]

function Row({ children, reverse, duration }: { children: React.ReactNode; reverse?: boolean; duration: string }) {
  return (
    <div className="group mask-fade-x flex overflow-hidden">
      <div
        className={
          "flex w-max shrink-0 gap-3 pr-3 group-hover:[animation-play-state:paused] " +
          (reverse ? "animate-marquee-reverse" : "animate-marquee")
        }
        style={{ "--marquee-duration": duration } as React.CSSProperties}
      >
        {children}
        {children}
      </div>
    </div>
  )
}

export function LanguageMarquee() {
  return (
    <section className="relative py-14 md:py-16" aria-label="Supported languages and errors">
      <p className="mb-7 text-center text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Fluent in your stack · fluent in your stack traces
      </p>
      <div className="space-y-3">
        <Row duration="42s">
          {LANGS.map((l) => (
            <span
              key={l}
              className="glass flex items-center gap-2.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
            >
              <span className="size-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: LANGUAGE_COLORS[l], color: LANGUAGE_COLORS[l] }} />
              {LANGUAGE_LABELS[l]}
              <span className="font-mono text-xs text-muted-foreground">.{LANGUAGE_EXTENSIONS[l]}</span>
            </span>
          ))}
        </Row>
        <Row reverse duration="56s">
          {ERRORS.map((e) => (
            <span
              key={e}
              className="group/err glass flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 font-mono text-xs text-muted-foreground transition-colors duration-300 hover:border-success/40 hover:text-foreground"
            >
              <span className="relative flex size-4 items-center justify-center">
                <X className="absolute size-3.5 text-destructive transition-all duration-300 group-hover/err:scale-0 group-hover/err:rotate-90" />
                <Check className="absolute size-3.5 scale-0 text-success transition-all duration-300 group-hover/err:scale-100" />
              </span>
              <span className="transition-colors group-hover/err:line-through group-hover/err:decoration-success/60">{e}</span>
            </span>
          ))}
        </Row>
      </div>
    </section>
  )
}
