import { ScrollProgress } from "@/components/fx/scroll-progress"
import { ApiSection } from "@/components/marketing/api-section"
import { BentoFeatures } from "@/components/marketing/bento-features"
import { CompareSlider } from "@/components/marketing/compare-slider"
import { FaqSection } from "@/components/marketing/faq-section"
import { FinalCta } from "@/components/marketing/final-cta"
import { Hero } from "@/components/marketing/hero"
import { LanguageMarquee } from "@/components/marketing/language-marquee"
import { PipelineSection } from "@/components/marketing/pipeline-section"
import { RoiCalculator } from "@/components/marketing/roi-calculator"
import { StatsBand } from "@/components/marketing/stats-band"

export default function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <Hero />
      <StatsBand />
      <LanguageMarquee />
      <PipelineSection />
      <BentoFeatures />
      <ApiSection />
      <CompareSlider />
      <RoiCalculator />
      <FaqSection />
      <FinalCta />
    </>
  )
}
