import { BugOff, ChartColumn, FolderGit2, LayoutDashboard, Target, Timer } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/app/page-header"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { PreviewBadge } from "@/components/app/preview-badge"
import { StatCard } from "@/components/app/stat-card"
import { getActiveUser } from "@/components/auth/auth-storage"
import { Stagger, StaggerItem } from "@/components/fx/reveal"
import { formatDuration } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { usePreviewLoad } from "@/hooks/use-preview-load"
import { ActivityFeed } from "@/pages/app/dashboard/components/activity-feed"
import { HealingActivityChart } from "@/pages/app/dashboard/components/healing-activity-chart"
import { HeroPanel } from "@/pages/app/dashboard/components/hero-panel"
import { LiveHealingCard } from "@/pages/app/dashboard/components/live-healing-card"
import { PipelineTimings } from "@/pages/app/dashboard/components/pipeline-timings"
import { RecentSessions } from "@/pages/app/dashboard/components/recent-sessions"
import { TopErrors } from "@/pages/app/dashboard/components/top-errors"
import { DASHBOARD_KPIS } from "@/services/mock/dashboard"
import { currentUser } from "@/services/mock-data"

export default function DashboardPage() {
  const ready = usePreviewLoad("dashboard")
  const [authUser, setAuthUser] = useState(() => getActiveUser())

  useEffect(() => {
    const onAuth = () => setAuthUser(getActiveUser())
    window.addEventListener("auth-changed", onAuth)
    return () => window.removeEventListener("auth-changed", onAuth)
  }, [])

  const company = authUser?.company_tenant || currentUser.companyName

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Everything your AI debugger healed, tested and flagged across ${company}.`}
        icon={LayoutDashboard}
        tone="primary"
        badge={<PreviewBadge />}
        actions={
          <Button variant="outline" size="sm" render={<Link to="/analytics" />}>
            <ChartColumn /> Full analytics
          </Button>
        }
      />
      {ready ? <DashboardContent /> : <PageSkeleton layout="dashboard" />}
    </div>
  )
}

function DashboardContent() {
  const kpi = DASHBOARD_KPIS

  return (
    <div className="space-y-4 md:space-y-6">
      <Stagger immediate className="grid gap-4 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <HeroPanel />
        </StaggerItem>
        <StaggerItem>
          <LiveHealingCard />
        </StaggerItem>
      </Stagger>

      <Stagger immediate delay={0.12} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Active projects"
            value={kpi.activeProjects.value}
            icon={FolderGit2}
            tone="primary"
            delta={kpi.activeProjects.delta}
            deltaLabel="vs last month"
            sparkline={kpi.activeProjects.sparkline}
            to="/projects"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Bugs fixed (30d)"
            value={kpi.bugsFixed.value}
            icon={BugOff}
            tone="success"
            delta={kpi.bugsFixed.delta}
            deltaLabel="vs prior 30d"
            sparkline={kpi.bugsFixed.sparkline}
            to="/history"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Avg. time to fix"
            value={kpi.avgTimeToFix.value}
            format={formatDuration}
            icon={Timer}
            tone="warning"
            delta={kpi.avgTimeToFix.delta}
            positiveIsGood={false}
            deltaLabel="vs prior 30d"
            sparkline={kpi.avgTimeToFix.sparkline}
            to="/analytics"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Fix success rate"
            value={kpi.successRate.value}
            suffix="%"
            icon={Target}
            tone="info"
            delta={kpi.successRate.delta}
            deltaLabel="vs prior 30d"
            sparkline={kpi.successRate.sparkline}
            to="/analytics"
          />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <StaggerItem className="min-w-0 lg:col-span-2">
          <HealingActivityChart />
        </StaggerItem>
        <StaggerItem>
          <PipelineTimings />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <StaggerItem>
            <RecentSessions />
          </StaggerItem>
          <StaggerItem>
            <TopErrors />
          </StaggerItem>
        </div>
        <StaggerItem>
          <ActivityFeed />
        </StaggerItem>
      </Stagger>
    </div>
  )
}
