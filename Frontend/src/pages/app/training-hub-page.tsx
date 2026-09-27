import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileCode2,
  FileUp,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Panel } from "@/components/app/panel"
import { SegmentedControl } from "@/components/app/segmented-control"
import { StatCard } from "@/components/app/stat-card"
import { SpotlightCard } from "@/components/fx/spotlight-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTenant } from "@/context/tenant-context"
import { cn } from "@/lib/utils"
import { getAuthStats } from "@/services/heal-api"
import type { AuthStatsResponse, SupportedLanguage } from "@/types/contract"

type Tab = "ingest" | "metrics" | "users"

export default function TrainingHubPage() {
  const {
    activeTenant,
    tenantRecords,
    trainingRuns,
    totalTenantVectors,
    addTrainingRecord,
    deleteTrainingRecord,
    runTrainingPipeline,
    resetToDefaultData,
  } = useTenant()

  const [tab, setTab] = useState<Tab>("ingest")
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState<SupportedLanguage>("python")
  const [category, setCategory] = useState("Logic Optimization")
  const [buggyCode, setBuggyCode] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [patchCode, setPatchCode] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingStep, setTrainingStep] = useState("")
  const [trainingPct, setTrainingPct] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const [authStats, setAuthStats] = useState<AuthStatsResponse | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)

  const fetchAuthStats = () => {
    setLoadingAuth(true)
    getAuthStats()
      .then((res) => setAuthStats(res))
      .catch((e) => console.warn("Failed to load auth statistics:", e))
      .finally(() => setLoadingAuth(false))
  }

  useEffect(() => {
    fetchAuthStats()
    const onAuth = () => fetchAuthStats()
    window.addEventListener("auth-changed", onAuth)
    return () => window.removeEventListener("auth-changed", onAuth)
  }, [])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !buggyCode.trim() || !patchCode.trim()) {
      toast.error("Please fill in Title, Buggy Code, and Patch Code.")
      return
    }

    try {
      await addTrainingRecord({
        companyId: activeTenant.id,
        title: title.trim(),
        language,
        category,
        buggyCode,
        errorMessage: errorMessage.trim() || "AST invariant patch specification",
        patchCode,
      })

      toast.success(`Record "${title}" added to tenant queue!`, {
        description: "Click 'Start Training Pipeline' to vectorize.",
      })
      setTitle("")
      setBuggyCode("")
      setErrorMessage("")
      setPatchCode("")
    } catch (err: any) {
      toast.error(`Error adding record: ${err.message}`)
    }
  }

  const handleStartPipeline = async () => {
    setIsTraining(true)
    setTrainingPct(0)
    try {
      await runTrainingPipeline((step, pct) => {
        setTrainingStep(step)
        setTrainingPct(pct)
      })
      toast.success(`Cluster ${activeTenant.cluster} updated with new vector weights!`)
    } catch (err: any) {
      toast.error(`Training pipeline failed: ${err.message}`)
    } finally {
      setIsTraining(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item.title && item.buggyCode && item.patchCode) {
              addTrainingRecord({
                companyId: activeTenant.id,
                title: item.title,
                language: item.language || "python",
                category: item.category || "Dataset Upload",
                buggyCode: item.buggyCode,
                errorMessage: item.errorMessage || "Historical production incident",
                patchCode: item.patchCode,
              })
            }
          })
          toast.success(`Batch uploaded ${parsed.length} bug-fix records from ${file.name}`)
        } else if (parsed.title) {
          setTitle(parsed.title)
          if (parsed.language) setLanguage(parsed.language)
          if (parsed.buggyCode) setBuggyCode(parsed.buggyCode)
          if (parsed.errorMessage) setErrorMessage(parsed.errorMessage)
          if (parsed.patchCode) setPatchCode(parsed.patchCode)
          toast.success(`Loaded record from ${file.name}`)
        }
      } catch {
        // Plain text file as buggy code
        const text = e.target?.result as string
        setBuggyCode(text)
        setTitle(file.name.replace(/\.[^/.]+$/, ""))
        toast.info(`Imported code from ${file.name}`)
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadSampleDataset = () => {
    const sample = [
      {
        title: "Idempotency Lock Concurrency Fix",
        language: "python",
        category: "Concurrency",
        buggyCode: "if not lock.acquire(): return False\nprocess_payment()",
        errorMessage: "LockAcquisitionTimeout: Failed to acquire atomic mutex",
        patchCode: "with lock.acquire_timeout(5.0):\n    process_payment()",
      },
      {
        title: "Null Dereference in Webhook Dispatcher",
        language: "javascript",
        category: "Type Safety",
        buggyCode: "const event = payload.body.data.object;",
        errorMessage: "TypeError: Cannot read properties of undefined (reading 'object')",
        patchCode: "const event = payload?.body?.data?.object ?? null;",
      },
    ]
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTenant.id}-dataset-sample.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Downloaded sample dataset template")
  }

  const filteredRecords = tenantRecords.filter((rec) => {
    return (
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.buggyCode.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training & Vector Hub"
        description={`Manage ChromaDB vector knowledge, ingest bug-fix datasets, and monitor weights for tenant ${activeTenant.name}.`}
        icon={Layers}
        tone="primary"
        badge={
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
            {activeTenant.cluster}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              aria-label="Training tabs"
              options={[
                { value: "ingest", label: "Dataset Ingestion" },
                { value: "metrics", label: "Model Runs & Index" },
                { value: "users", label: `User Directory & Logins (${authStats?.total_users || 0})` },
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                resetToDefaultData()
                toast.info("Reset training records to factory presets")
              }}
              title="Reset records to default presets"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tenant Vector Corpus"
          value={totalTenantVectors}
          icon={Database}
          tone="primary"
          delta={tenantRecords.length}
          deltaLabel="custom additions"
        />
        <StatCard
          label="Base ChromaDB Knowledge"
          value={5000}
          icon={Layers}
          tone="info"
          suffix=" fixes"
          deltaLabel="pre-indexed corpus"
        />
        <StatCard
          label="Model Checkpoint"
          value={99.4}
          decimals={1}
          suffix="%"
          icon={Cpu}
          tone="success"
          deltaLabel={trainingRuns[0]?.version || "v1.2-enterprise"}
        />
        <StatCard
          label="Cosine Search Latency"
          value={18.4}
          decimals={1}
          suffix=" ms"
          icon={Activity}
          tone="warning"
          deltaLabel="top-3 vector match"
        />
      </div>

      {tab === "ingest" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Form: Ingest Record */}
          <div className="lg:col-span-7 space-y-6">
            <Panel
              title="Ingest Bug-Fix Pair"
              description="Provide source code and tested patch to compile new AST training vectors."
            >
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Record Title / Incident ID</label>
                  <Input
                    placeholder="e.g. Idempotency Key Race in Payment Checkout"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                      className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="go">Go</option>
                      <option value="java">Java</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Error Classification</label>
                    <Input
                      placeholder="e.g. Concurrency, Memory Leak"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-destructive">Buggy Source Code</label>
                  <textarea
                    rows={4}
                    value={buggyCode}
                    onChange={(e) => setBuggyCode(e.target.value)}
                    placeholder="Paste failing function or code snippet..."
                    className="w-full rounded-md border border-border bg-background/80 p-3 font-mono text-xs leading-relaxed focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Error Message / Stack Trace</label>
                  <Input
                    placeholder="e.g. IntegrityError: duplicate key value..."
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-success">Verified Patch Code</label>
                  <textarea
                    rows={4}
                    value={patchCode}
                    onChange={(e) => setPatchCode(e.target.value)}
                    placeholder="Paste verified AST patch..."
                    className="w-full rounded-md border border-border bg-background/80 p-3 font-mono text-xs leading-relaxed focus:border-success focus:outline-none focus:ring-1 focus:ring-success"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs font-mono text-muted-foreground">
                    Estimated AST Nodes: <strong className="text-primary">{Math.max(12, buggyCode.split("\n").length * 6)}</strong>
                  </div>
                  <Button type="submit" variant="default" className="gap-2">
                    <Sparkles className="size-4" /> Stage for Vectorization
                  </Button>
                </div>
              </form>
            </Panel>

            {/* Drag & Drop JSON */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={cn(
                "rounded-xl border-2 border-dashed p-6 text-center transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border/80 hover:border-primary/40"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <FileUp className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag & drop dataset (.json or source files)</p>
                <p className="text-xs text-muted-foreground">Batch upload historical bug-fix pairs for ChromaDB embedding</p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadSampleDataset} className="gap-1.5 text-xs">
                    <Download className="size-3.5" /> Download JSON Template
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Staged Records & Training Pipeline Runner */}
          <div className="lg:col-span-5 space-y-6">
            <Panel
              title="Vectorization Pipeline"
              description={`Isolated cluster: ${activeTenant.cluster}`}
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Staged Records:</span>
                    <span className="font-mono text-primary font-bold">{tenantRecords.length} records</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tenant Model Target:</span>
                    <span className="font-mono text-foreground truncate max-w-44">{activeTenant.model.split("/")[0]}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Vector Dimensions:</span>
                    <span className="font-mono text-foreground">384-dim (all-MiniLM-L6-v2)</span>
                  </div>
                </div>

                {isTraining && (
                  <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-primary">
                        <Loader2 className="size-3.5 animate-spin" /> {trainingStep}
                      </span>
                      <span className="font-mono font-bold text-primary">{trainingPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${trainingPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleStartPipeline}
                  disabled={isTraining || tenantRecords.length === 0}
                  className="w-full gap-2"
                >
                  {isTraining ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {isTraining ? "Vectorizing ASTs..." : "Start Training Pipeline"}
                </Button>
              </div>
            </Panel>

            <Panel
              title="Staged Tenant Records"
              description="Records in the current cluster workspace."
            >
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {tenantRecords.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No custom records staged yet.</p>
                ) : (
                  tenantRecords.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2 text-xs transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground line-clamp-1">{r.title}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {r.category} • {r.astNodes} nodes
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteTrainingRecord(r.id)
                            toast.success("Record removed from queue")
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground line-clamp-2">
                        {r.buggyCode}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        /* Model Runs & Index Tab */
        <div className="space-y-6">
          <Panel
            title="Model Checkpoints & Training Runs"
            description="Active fine-tuned weights and evaluation history."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-mono">
                    <th className="py-2.5 pr-4">Checkpoint Version</th>
                    <th className="py-2.5 px-4">Records Indexed</th>
                    <th className="py-2.5 px-4">Accuracy Score</th>
                    <th className="py-2.5 px-4">Pipeline Duration</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {trainingRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-mono font-semibold text-primary">{run.version}</td>
                      <td className="py-3 px-4 font-mono">{run.recordCount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-success font-semibold">{run.accuracyScore}%</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{run.duration}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{run.timestamp}</td>
                      <td className="py-3 pl-4 text-right">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                          <CheckCircle2 className="size-3.5" /> active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Tenant Vector Repository"
            description="Active AST embedding vectors in the tenant collection."
            actions={
              <div className="relative w-64">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter vectors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            }
          >
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No vectors match your search.</p>
              ) : (
                filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-background/50 p-4 space-y-2.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="size-4 text-primary" />
                        <span className="font-semibold text-xs text-foreground">{r.title}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {r.category}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.vectorId}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                      <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2.5 text-destructive-foreground">
                        <span className="text-[10px] font-bold uppercase text-destructive block mb-1">Buggy Spec:</span>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{r.buggyCode}</pre>
                      </div>
                      <div className="rounded-lg bg-success/5 border border-success/20 p-2.5 text-success-foreground">
                        <span className="text-[10px] font-bold uppercase text-success block mb-1">AST Patch:</span>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{r.patchCode}</pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: USERS & LOGIN AUDIT DIRECTORY */}
      {tab === "users" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Registered Users"
              value={authStats?.total_users || 0}
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Total Login Events"
              value={authStats?.total_logins || 0}
              icon={KeyRound}
              tone="success"
            />
            <StatCard
              label="Active Identity Provider"
              value="Google OAuth2"
              icon={Globe}
              tone="info"
            />
            <StatCard
              label="Persistent DB Storage"
              value="sessions.db"
              icon={Database}
              tone="warning"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Live User Directory */}
            <Panel
              title="Registered User Accounts"
              icon={Users}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchAuthStats}
                  disabled={loadingAuth}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={cn("size-3.5", loadingAuth && "animate-spin")} /> Refresh
                </Button>
              }
            >
              <div className="space-y-3">
                {(!authStats?.users || authStats.users.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No users logged in yet. Log in via Google or Email on the login screen to register your account into SQLite sessions.db.
                  </p>
                ) : (
                  authStats.users.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-xl border border-border bg-card/60 p-3.5 flex items-center justify-between gap-4 transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full border border-border bg-muted flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} className="size-full object-cover" />
                          ) : (
                            u.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground truncate">{u.name}</span>
                            <span
                              className={cn(
                                "font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold",
                                u.provider === "google"
                                  ? "bg-primary/15 text-primary border border-primary/25"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {u.provider === "google" ? "Google (Gmail)" : u.provider}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 text-right font-mono text-[11px]">
                        <span className="font-bold text-foreground">{u.login_count || 1} logins</span>
                        <span className="text-[10px] text-muted-foreground">
                          Last seen {u.last_login ? new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            {/* Login Audit Stream */}
            <Panel title="Recent Login Audit Trail" icon={ShieldCheck}>
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {(!authStats?.recent_logs || authStats.recent_logs.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No login events logged yet.
                  </p>
                ) : (
                  authStats.recent_logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border/70 bg-background/50 p-2.5 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full bg-success shrink-0" />
                        <span className="truncate text-foreground font-medium">{log.email}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
                        <span className="capitalize">{log.provider}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
