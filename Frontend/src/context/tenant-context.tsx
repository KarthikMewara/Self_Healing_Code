import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { CompanyTenant, UserSession, TrainingRecord, TrainingRun } from "@/types/contract"
import { checkHealth } from "@/services/heal-api"

export const PRESET_TENANTS: CompanyTenant[] = [
  {
    id: "stripe",
    name: "Stripe",
    domain: "stripe.com",
    cluster: "us-east-stripe-ai-01",
    model: "Llama-3-Code / ChromaDB Tenant Active",
    vectorCount: 1420,
    badgeColor: "border-primary/40 text-primary bg-primary/10",
    description: "Payment rails & financial ledger bug-fix memory cluster",
  },
  {
    id: "uber",
    name: "Uber",
    domain: "uber.com",
    cluster: "us-west-uber-gpu-04",
    model: "DeepSeek-Coder-Enterprise / ChromaDB Tenant Active",
    vectorCount: 2150,
    badgeColor: "border-success/40 text-success bg-success/10",
    description: "High-concurrency dispatch & real-time routing algorithms",
  },
  {
    id: "fintech-labs",
    name: "FinTech Labs",
    domain: "fintechlabs.io",
    cluster: "eu-central-fintech-02",
    model: "Llama-3-Code / ChromaDB Tenant Active",
    vectorCount: 890,
    badgeColor: "border-info/40 text-info bg-info/10",
    description: "High-frequency algorithmic trading and FIX protocol patches",
  },
  {
    id: "acme-health",
    name: "Acme Health",
    domain: "acmehealth.org",
    cluster: "us-central-acme-priv-01",
    model: "Llama-3-MedCode-HIPAA / ChromaDB Tenant Active",
    vectorCount: 640,
    badgeColor: "border-destructive/40 text-destructive bg-destructive/10",
    description: "HIPAA-compliant telemetry and HL7/FHIR record validation",
  },
  {
    id: "opensource",
    name: "Default Open-Source",
    domain: "opensource.org",
    cluster: "global-cluster-prod-00",
    model: "Llama-3-Code / ChromaDB Global Index",
    vectorCount: 5000,
    badgeColor: "border-warning/40 text-warning bg-warning/10",
    description: "Global corpus of 5,000 embedded real-world fixes",
  },
]

const INITIAL_TRAINING_RECORDS: TrainingRecord[] = [
  {
    id: "tr-001",
    companyId: "stripe",
    title: "Idempotency Key Race Condition in Checkout Handler",
    language: "python",
    category: "Concurrency",
    buggyCode: `def process_charge(user_id, amount, idempotency_key):\n    if check_key(idempotency_key):\n        return "duplicate"\n    record_key(idempotency_key)\n    return gateway.charge(user_id, amount)`,
    errorMessage: `IntegrityError: duplicate key value violates unique constraint "idempotency_idx"`,
    patchCode: `def process_charge(user_id, amount, idempotency_key):\n    with db.transaction():\n        if not claim_idempotency_atomic(idempotency_key):\n            return get_existing_charge(idempotency_key)\n        return gateway.charge(user_id, amount)`,
    status: "indexed",
    timestamp: "2026-09-20 14:22:01",
    astNodes: 48,
    vectorId: "vec_stripe_48821",
  },
  {
    id: "tr-002",
    companyId: "stripe",
    title: "Floating Point Precision Loss in Multi-Currency Conversion",
    language: "python",
    category: "Logic Optimization",
    buggyCode: `def convert_currency(cents, rate):\n    return int(cents * rate)`,
    errorMessage: `AssertionError: Expected 100000 cents, got 99999 cents due to float truncation`,
    patchCode: `from decimal import Decimal, ROUND_HALF_UP\n\ndef convert_currency(cents, rate):\n    d_cents = Decimal(str(cents))\n    d_rate = Decimal(str(rate))\n    return int((d_cents * d_rate).quantize(Decimal('1'), rounding=ROUND_HALF_UP))`,
    status: "indexed",
    timestamp: "2026-09-22 09:15:30",
    astNodes: 36,
    vectorId: "vec_stripe_48822",
  },
  {
    id: "tr-003",
    companyId: "uber",
    title: "Geohash Boundary Edge Overlap in Driver Assignment",
    language: "python",
    category: "Spatial Geometry",
    buggyCode: `def find_nearby_drivers(lat, lon, radius_km):\n    center_hash = geohash.encode(lat, lon, precision=6)\n    return db.query(Driver).filter(Driver.geohash == center_hash).all()`,
    errorMessage: `MissingDriverWarning: Drivers across neighbor cell boundary were omitted`,
    patchCode: `def find_nearby_drivers(lat, lon, radius_km):\n    center_hash = geohash.encode(lat, lon, precision=6)\n    neighbors = geohash.neighbors(center_hash)\n    search_hashes = [center_hash] + neighbors\n    return db.query(Driver).filter(Driver.geohash.in_(search_hashes)).all()`,
    status: "indexed",
    timestamp: "2026-09-24 18:40:12",
    astNodes: 62,
    vectorId: "vec_uber_11029",
  },
  {
    id: "tr-004",
    companyId: "fintech-labs",
    title: "Order Book Depth Buffer Overflow on WebSocket Spike",
    language: "javascript",
    category: "Memory Leak",
    buggyCode: `socket.on('depth', (data) => {\n    orderBook.bids.push(...data.bids);\n    orderBook.asks.push(...data.asks);\n});`,
    errorMessage: `RangeError: Maximum call stack size exceeded / Heap out of memory`,
    patchCode: `socket.on('depth', (data) => {\n    applyIncrementalDepth(orderBook.bids, data.bids, 100);\n    applyIncrementalDepth(orderBook.asks, data.asks, 100);\n});`,
    status: "indexed",
    timestamp: "2026-09-25 11:05:44",
    astNodes: 41,
    vectorId: "vec_fintech_7741",
  },
]

const INITIAL_TRAINING_RUNS: TrainingRun[] = [
  {
    id: "run-v1.2",
    version: "v1.2-enterprise",
    companyId: "stripe",
    recordCount: 1420,
    accuracyScore: 99.4,
    duration: "2m 14s",
    status: "active",
    timestamp: "2026-09-25 04:30:00",
  },
  {
    id: "run-v1.1",
    version: "v1.1-checkpoint",
    companyId: "stripe",
    recordCount: 1250,
    accuracyScore: 98.1,
    duration: "1m 58s",
    status: "completed",
    timestamp: "2026-09-18 16:12:00",
  },
  {
    id: "run-v1.0",
    version: "v1.0-genesis",
    companyId: "stripe",
    recordCount: 1000,
    accuracyScore: 95.8,
    duration: "1m 40s",
    status: "completed",
    timestamp: "2026-09-01 10:00:00",
  },
]

interface TenantContextType {
  activeTenant: CompanyTenant
  tenants: CompanyTenant[]
  setActiveTenant: (t: CompanyTenant) => void
  userSession: UserSession
  trainingRecords: TrainingRecord[]
  trainingRuns: TrainingRun[]
  tenantRecords: TrainingRecord[]
  totalTenantVectors: number
  backendLive: boolean
  lastChecked: string
  refreshHealth: () => Promise<void>
  addTrainingRecord: (record: Omit<TrainingRecord, "id" | "timestamp" | "astNodes" | "vectorId" | "status">) => Promise<TrainingRecord>
  deleteTrainingRecord: (id: string) => void
  runTrainingPipeline: (onProgress: (step: string, pct: number) => void) => Promise<void>
  resetToDefaultData: () => void
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeTenant, setActiveTenantState] = useState<CompanyTenant>(() => {
    const saved = localStorage.getItem("omniheal_active_tenant")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return PRESET_TENANTS[0]
  })

  const [userSession, setUserSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem("omniheal_user_session")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return {
      email: "alex@stripe.com",
      name: "Alex Vance",
      department: "Platform Core & Infrastructure",
      role: "Staff Systems Architect",
      company: PRESET_TENANTS[0],
      connectedAt: "2026-09-27 08:30 UTC",
    }
  })

  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(() => {
    const saved = localStorage.getItem("omniheal_training_records")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return INITIAL_TRAINING_RECORDS
  })

  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>(() => {
    const saved = localStorage.getItem("omniheal_training_runs")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return INITIAL_TRAINING_RUNS
  })

  const [backendLive, setBackendLive] = useState<boolean>(false)
  const [lastChecked, setLastChecked] = useState<string>("Checking...")

  const refreshHealth = useCallback(async () => {
    try {
      const res = await checkHealth()
      setBackendLive(res.live)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      setBackendLive(false)
      setLastChecked(new Date().toLocaleTimeString())
    }
  }, [])

  useEffect(() => {
    refreshHealth()
    const timer = setInterval(refreshHealth, 15_000)
    return () => clearInterval(timer)
  }, [refreshHealth])

  const setActiveTenant = (tenant: CompanyTenant) => {
    setActiveTenantState(tenant)
    setUserSession((prev) => ({
      ...prev,
      company: tenant,
      email: `alex@${tenant.domain}`,
    }))
    localStorage.setItem("omniheal_active_tenant", JSON.stringify(tenant))
  }

  const tenantRecords = trainingRecords.filter((r) => r.companyId === activeTenant.id)
  const totalTenantVectors = activeTenant.vectorCount + tenantRecords.length

  const addTrainingRecord = async (
    record: Omit<TrainingRecord, "id" | "timestamp" | "astNodes" | "vectorId" | "status">
  ): Promise<TrainingRecord> => {
    const newRecord: TrainingRecord = {
      ...record,
      id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      astNodes: Math.floor(Math.random() * 45) + 20,
      vectorId: `vec_${activeTenant.id}_${Math.floor(Math.random() * 89999 + 10000)}`,
      status: "queued",
    }

    const updated = [newRecord, ...trainingRecords]
    setTrainingRecords(updated)
    localStorage.setItem("omniheal_training_records", JSON.stringify(updated))
    return newRecord
  }

  const deleteTrainingRecord = (id: string) => {
    const updated = trainingRecords.filter((r) => r.id !== id)
    setTrainingRecords(updated)
    localStorage.setItem("omniheal_training_records", JSON.stringify(updated))
  }

  const runTrainingPipeline = async (onProgress: (step: string, pct: number) => void) => {
    const steps = [
      { msg: "Tokenizing AST syntactical grammar nodes...", pct: 20 },
      { msg: "Formulating SentenceTransformer MiniLM vector embeddings...", pct: 45 },
      { msg: "Writing 384-dimensional vectors to isolated ChromaDB tenant namespace...", pct: 75 },
      { msg: "Evaluating loss & cross-entropy validation score...", pct: 90 },
      { msg: "Cluster weights successfully synchronized and committed to production index!", pct: 100 },
    ]

    for (const s of steps) {
      onProgress(s.msg, s.pct)
      await new Promise((r) => setTimeout(r, 600))
    }

    // Mark queued records as indexed
    const updatedRecords = trainingRecords.map((r) =>
      r.companyId === activeTenant.id ? { ...r, status: "indexed" as const } : r
    )
    setTrainingRecords(updatedRecords)
    localStorage.setItem("omniheal_training_records", JSON.stringify(updatedRecords))

    // Add training run record
    const newRun: TrainingRun = {
      id: `run-${Date.now()}`,
      version: `v1.${trainingRuns.length + 1}-checkpoint`,
      companyId: activeTenant.id,
      recordCount: tenantRecords.length,
      accuracyScore: Number((98.5 + Math.random() * 1.3).toFixed(1)),
      duration: "1m 32s",
      status: "active",
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    }

    const updatedRuns = [newRun, ...trainingRuns]
    setTrainingRuns(updatedRuns)
    localStorage.setItem("omniheal_training_runs", JSON.stringify(updatedRuns))
  }

  const resetToDefaultData = () => {
    setTrainingRecords(INITIAL_TRAINING_RECORDS)
    setTrainingRuns(INITIAL_TRAINING_RUNS)
    localStorage.removeItem("omniheal_training_records")
    localStorage.removeItem("omniheal_training_runs")
  }

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        tenants: PRESET_TENANTS,
        setActiveTenant,
        userSession,
        trainingRecords,
        trainingRuns,
        tenantRecords,
        totalTenantVectors,
        backendLive,
        lastChecked,
        refreshHealth,
        addTrainingRecord,
        deleteTrainingRecord,
        runTrainingPipeline,
        resetToDefaultData,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider")
  return ctx
}
