import { Braces, FlaskConical, MousePointerClick, Radio } from "lucide-react"

import { NumberTicker } from "@/components/fx/number-ticker"
import { Stagger, StaggerItem } from "@/components/fx/reveal"

// Product facts (what it is), not usage claims (what it has done).
const STATS = [
  { value: 8, suffix: "", label: "languages supported", icon: Braces },
  { value: 4, suffix: "", label: "pipeline stages, streamed live", icon: Radio },
  { value: 100, suffix: "%", label: "of fixes run against tests first", icon: FlaskConical },
  { value: 1, suffix: " click", label: "from stack trace to tested fix", icon: MousePointerClick },
]

export function StatsBand() {
  return (
    <section className="relative border-y border-border/70">
      <div className="glass">
        <Stagger className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <StaggerItem
              key={s.label}
              className={
                "group relative px-4 py-10 text-center md:px-8 md:py-12 " +
                (i % 2 === 1 ? "border-l border-border/60 " : "") +
                (i >= 2 ? "border-t border-border/60 md:border-t-0 " : "") +
                (i === 2 ? "md:border-l" : "")
              }
            >
              <s.icon className="mx-auto mb-3 size-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
              <p className="text-gradient-brand animate-gradient-pan text-4xl font-semibold tracking-tight md:text-5xl">
                <NumberTicker value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-xs text-muted-foreground md:text-sm">{s.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
