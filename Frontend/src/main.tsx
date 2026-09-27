import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import { MotionPreferenceProvider } from "@/components/motion-preference"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <MotionPreferenceProvider>
        <TooltipProvider delay={250}>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </MotionPreferenceProvider>
    </ThemeProvider>
  </StrictMode>,
)
