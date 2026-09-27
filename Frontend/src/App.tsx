import { lazy } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { MarketingShell } from "@/components/layout/marketing-shell"
import { DebugWorkspaceProvider } from "@/context/debug-workspace"
import { TenantProvider } from "@/context/tenant-context"
import ForgotPasswordPage from "@/pages/marketing/forgot-password-page"
import LandingPage from "@/pages/marketing/landing-page"
import LoginPage from "@/pages/marketing/login-page"
import RegisterPage from "@/pages/marketing/register-page"
import NotFoundPage from "@/pages/not-found-page"

// App screens are split out so the landing page ships without charts & co.
const DashboardPage = lazy(() => import("@/pages/app/dashboard-page"))
const AllProjectsPage = lazy(() => import("@/pages/app/projects/all-projects-page"))
const ProjectDetailsPage = lazy(() => import("@/pages/app/projects/project-details-page"))
const AIDebuggerPage = lazy(() => import("@/pages/app/debugger/ai-debugger-page"))
const SelfHealingPage = lazy(() => import("@/pages/app/debugger/self-healing-page"))
const TestingPage = lazy(() => import("@/pages/app/testing-page"))
const SecurityPage = lazy(() => import("@/pages/app/security-page"))
const PerformancePage = lazy(() => import("@/pages/app/performance-page"))
const AIMemoryPage = lazy(() => import("@/pages/app/ai-memory-page"))
const HistoryPage = lazy(() => import("@/pages/app/history-page"))
const AnalyticsPage = lazy(() => import("@/pages/app/analytics-page"))
const TrainingHubPage = lazy(() => import("@/pages/app/training-hub-page"))
const SettingsPage = lazy(() => import("@/pages/app/settings-page"))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketingShell />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          element={
            <TenantProvider>
              <DebugWorkspaceProvider>
                <AppShell />
              </DebugWorkspaceProvider>
            </TenantProvider>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<AllProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="debugger" element={<AIDebuggerPage />} />
          <Route path="self-healing" element={<SelfHealingPage />} />
          <Route path="testing" element={<TestingPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="ai-memory" element={<AIMemoryPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="training" element={<TrainingHubPage />} />
          <Route path="admin" element={<TrainingHubPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
