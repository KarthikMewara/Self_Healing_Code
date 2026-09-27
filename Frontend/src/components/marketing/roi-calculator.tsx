import { Calculator, Clock, Coins, Sparkles, TrendingUp, Users } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { NumberTicker } from "@/components/fx/number-ticker"
import { Reveal } from "@/components/fx/reveal"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Button } from "@/components/ui/button"

export function RoiCalculator() {
  const [teamSize, setTeamSize] = useState<number>(30)
  const [hourlyRate, setHourlyRate] = useState<number>(85)

  // Benchmarks based on 45min manual triage vs 1.5min autonomous repair
  const bugsPerEngPerMonth = 4
  const totalMonthlyBugs = teamSize * bugsPerEngPerMonth
  const hoursSavedPerMonth = Math.round(totalMonthlyBugs * 0.72) // 43 mins saved per incident
  const annualDollarSavings = Math.round(hoursSavedPerMonth * 12 * hourlyRate)
  const bugsHealedWeekly = Math.round((totalMonthlyBugs * 12) / 52)

  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <SectionHeading
          eyebrow="ROI & Efficiency"
          title="Engineering Velocity & Dollar Impact"
          description="Calculate your team's projected bandwidth recovery and recovered payroll ROI with autonomous self-healing code."
        />

        <div className="mx-auto max-w-5xl">
          <Reveal y={16}>
            <SpotlightCard className="overflow-hidden p-6 md:p-10 border border-border/80 bg-card/60 backdrop-blur-md">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                {/* Left Controls */}
                <div className="space-y-6 lg:col-span-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 font-medium text-foreground">
                        <Users className="size-4 text-primary" /> Engineering Team Size
                      </label>
                      <span className="font-mono text-sm font-bold text-primary px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10">
                        {teamSize} Engineers
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={250}
                      step={5}
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                      <span>5 (Startup)</span>
                      <span>50 (Scale-up)</span>
                      <span>250+ (Enterprise)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 font-medium text-foreground">
                        <Coins className="size-4 text-warning" /> Blended Hourly Rate
                      </label>
                      <span className="font-mono text-sm font-bold text-foreground px-2.5 py-0.5 rounded-full border border-border bg-muted/40">
                        ${hourlyRate}/hr
                      </span>
                    </div>
                    <input
                      type="range"
                      min={45}
                      max={180}
                      step={5}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                      <span>$45/hr</span>
                      <span>$85/hr (Avg)</span>
                      <span>$180/hr (Senior / Staff)</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/50 p-4 text-xs text-muted-foreground leading-relaxed">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                      <TrendingUp className="size-3.5 text-success" /> Benchmarked MTTR Reduction
                    </p>
                    Manual incident investigation (avg. 45 min) reduced to &lt;2 minutes per incident via ChromaDB RAG & OmniRoute AST synthesis.
                  </div>
                </div>

                {/* Right Output Tiles */}
                <div className="space-y-4 lg:col-span-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-background/60 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase font-mono mb-1">Hours Saved / Mo</p>
                      <p className="text-2xl font-bold font-mono text-primary">
                        <NumberTicker value={hoursSavedPerMonth} startOnView={false} />
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Dev bandwidth</p>
                    </div>

                    <div className="rounded-xl border border-border bg-background/60 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase font-mono mb-1">Annual Savings</p>
                      <p className="text-2xl font-bold font-mono text-success">
                        $<NumberTicker value={annualDollarSavings} startOnView={false} />
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Recovered payroll</p>
                    </div>

                    <div className="rounded-xl border border-border bg-background/60 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase font-mono mb-1">Weekly Fixes</p>
                      <p className="text-2xl font-bold font-mono text-info">
                        <NumberTicker value={bugsHealedWeekly} startOnView={false} />
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Auto-patches</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Deploy the self-healing pipeline for your repository
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button render={<Link to="/debugger" />} className="gap-2">
                        <Sparkles className="size-4" /> Try Live Debugger
                      </Button>
                      <Button variant="outline" render={<Link to="/training" />}>
                        Training Hub
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
