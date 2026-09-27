// Performance preview data. The first three insights are
// src/services/mock-data.ts performanceInsights with their before/after
// metrics as numbers; the rest are extra examples. Every figure is a projection
// from sampled traces and static analysis -- nothing here was measured live.

import type { LanguageKey } from "@/lib/highlight"
import { performanceInsights } from "@/services/mock-data"
import type { PerformanceInsight } from "@/types/domain"

export type PerfCategory = "Database" | "Memory" | "Network" | "CPU"

export interface PerfInsight extends PerformanceInsight {
  project: string
  category: PerfCategory
  metric: { label: string; unit: string; before: number; after: number }
  effort: string
  /** 0-100: how sure the analysis is that the projection holds. */
  confidence: number
  evidence: string
  /** What this insight contributes to the summary tiles once applied. */
  savings: { latency?: boolean; memoryMb?: number; requestsPerDay?: number }
  patch: { language: LanguageKey; file: string; before: string; after: string }
}

type Extra = Omit<PerfInsight, keyof PerformanceInsight>

const EXTRA: Record<string, Extra> = {
  perf_1: {
    project: "checkout-service",
    category: "Database",
    metric: { label: "p95 latency · GET /orders/history", unit: "ms", before: 820, after: 140 },
    effort: "~20 min",
    confidence: 94,
    evidence: "1,240 sampled traces: 1 + n queries per request (median n = 38)",
    savings: { latency: true },
    patch: {
      language: "typescript",
      file: "checkout-service/src/orders/history.ts",
      before: `export async function orderHistory(customerId: string) {
  const orders = await db.order.findMany({ where: { customerId } })
  for (const order of orders) {
    order.items = await db.lineItem.findMany({ where: { orderId: order.id } })
  }
  return orders
}`,
      after: `export async function orderHistory(customerId: string) {
  return db.order.findMany({
    where: { customerId },
    include: { items: true }, // one batched query instead of one per order
  })
}`,
    },
  },
  perf_2: {
    project: "routing-gateway",
    category: "Memory",
    metric: { label: "Resident memory after 24h", unit: "MB", before: 612, after: 180 },
    effort: "~45 min",
    confidence: 88,
    evidence: "Heap profile: routeCache held 1.9M entries after 24h, 71% seen once",
    savings: { memoryMb: 432 },
    patch: {
      language: "go",
      file: "routing-gateway/router/cache.go",
      before: `var routeCache = map[string]*Route{}

func cachedRoute(path string) *Route {
	if r, ok := routeCache[path]; ok {
		return r
	}
	r := resolve(path)
	routeCache[path] = r
	return r
}`,
      after: `var routeCache = lru.New[string, *Route](50_000)

func cachedRoute(path string) *Route {
	if r, ok := routeCache.Get(path); ok {
		return r
	}
	r := resolve(path)
	routeCache.Add(path, r)
	return r
}`,
    },
  },
  perf_3: {
    project: "web-dashboard",
    category: "Network",
    metric: { label: "Requests per tab switch", unit: "req", before: 4, after: 1 },
    effort: "~10 min",
    confidence: 91,
    evidence: "Real-user monitoring: ~6,100 tab switches a day, 3 duplicate fetches each",
    savings: { requestsPerDay: 18_300 },
    patch: {
      language: "typescript",
      file: "web-dashboard/src/panels/use-panel-data.ts",
      before: `const { data } = useQuery({
  queryKey: ["panel", tab],
  queryFn: () => fetchPanel(tab),
  staleTime: 0,
})`,
      after: `const { data } = useQuery({
  queryKey: ["panel", tab],
  queryFn: () => fetchPanel(tab),
  staleTime: 30_000, // reuse data fetched in the last 30s
})`,
    },
  },
}

const MORE: PerfInsight[] = [
  {
    id: "perf_4",
    title: "Connection pool exhausted at checkout peaks",
    impact: "high",
    description: "24 workers share a pool of 10 connections, so requests queue for a connection between 14:00 and 15:00 UTC.",
    metricBefore: "410ms p95",
    metricAfter: "180ms p95 (projected)",
    project: "checkout-service",
    category: "Database",
    metric: { label: "p95 latency · POST /checkout", unit: "ms", before: 410, after: 180 },
    effort: "~5 min",
    confidence: 86,
    evidence: "Pool wait p95 of 230ms during the daily peak; zero idle connections",
    savings: { latency: true },
    patch: {
      language: "typescript",
      file: "checkout-service/src/db/pool.ts",
      before: `export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})`,
      after: `export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30, // 24 workers + headroom for cron and migrations
  idleTimeoutMillis: 30_000,
})`,
    },
  },
  {
    id: "perf_5",
    title: "JSON round-trip used as a defensive copy",
    impact: "medium",
    description: "Every event is serialized and parsed again before it reaches the sink, which never mutates it.",
    metricBefore: "1,340ms CPU per 1k events",
    metricAfter: "520ms CPU per 1k events (projected)",
    project: "ingest-pipeline",
    category: "CPU",
    metric: { label: "Worker CPU per 1k events", unit: "ms", before: 1_340, after: 520 },
    effort: "~15 min",
    confidence: 82,
    evidence: "py-spy: 61% of worker CPU inside json.dumps / json.loads",
    savings: {},
    patch: {
      language: "python",
      file: "ingest-pipeline/ingest/forward.py",
      before: `def forward(batch, sink):
    for event in batch:
        payload = json.loads(json.dumps(event))  # defensive copy
        sink.write(payload)`,
      after: `def forward(batch, sink):
    for event in batch:
        sink.write(MappingProxyType(event))  # read-only view, no copy`,
    },
  },
  {
    id: "perf_6",
    title: "Session lookup hits the database on every request",
    impact: "medium",
    description: "Sessions are re-read from Postgres per request even though 99% are under five minutes old.",
    metricBefore: "96ms p95",
    metricAfter: "12ms p95 (projected)",
    project: "auth-service",
    category: "Database",
    metric: { label: "p95 latency · GET /api/me", unit: "ms", before: 96, after: 12 },
    effort: "~1 h",
    confidence: 79,
    evidence: "8.2M session reads a day; 99.1% for sessions younger than 5 minutes",
    savings: { latency: true },
    patch: {
      language: "java",
      file: "auth-service/src/main/java/com/acme/auth/SessionStore.java",
      before: `public Session load(String id) {
    return repository.findById(id).orElseThrow(SessionNotFound::new);
}`,
      after: `private final Cache<String, Session> recent = Caffeine.newBuilder()
    .maximumSize(100_000)
    .expireAfterWrite(Duration.ofMinutes(5))
    .build();

public Session load(String id) {
    return recent.get(id, key -> repository.findById(key).orElseThrow(SessionNotFound::new));
}`,
    },
  },
  {
    id: "perf_7",
    title: "Log buffer grows without a flush limit",
    impact: "low",
    description: "The worker's structured-log buffer only flushes on shutdown, so long batches hold every line in memory.",
    metricBefore: "214MB RSS at peak",
    metricAfter: "118MB RSS at peak (projected)",
    project: "ingest-pipeline",
    category: "Memory",
    metric: { label: "Worker memory at peak", unit: "MB", before: 214, after: 118 },
    effort: "~10 min",
    confidence: 90,
    evidence: "tracemalloc: 41% of peak allocations are buffered log records",
    savings: { memoryMb: 96 },
    patch: {
      language: "python",
      file: "ingest-pipeline/ingest/logging.py",
      before: `handler = BufferingHandler(capacity=sys.maxsize)`,
      after: `handler = MemoryHandler(capacity=500, flushLevel=logging.ERROR, target=stream_handler)`,
    },
  },
  {
    id: "perf_8",
    title: "Build status polled every 5 seconds",
    impact: "low",
    description: "The builds page polls even in background tabs; server-sent events would push the same updates.",
    metricBefore: "360 requests per session",
    metricAfter: "24 requests per session (projected)",
    project: "web-dashboard",
    category: "Network",
    metric: { label: "Status requests per session", unit: "req", before: 360, after: 24 },
    effort: "~2 h",
    confidence: 84,
    evidence: "~77 builds-page sessions a day, 30 minutes on average",
    savings: { requestsPerDay: 25_900 },
    patch: {
      language: "typescript",
      file: "web-dashboard/src/builds/use-build-status.ts",
      before: `useEffect(() => {
  const timer = setInterval(refresh, 5_000)
  return () => clearInterval(timer)
}, [refresh])`,
      after: `useEffect(() => {
  const events = new EventSource(\`/api/builds/\${buildId}/events\`)
  events.onmessage = (e) => setStatus(JSON.parse(e.data))
  return () => events.close()
}, [buildId])`,
    },
  },
]

export const PERF_INSIGHTS: PerfInsight[] = [
  ...performanceInsights.map((p) => ({ ...p, ...EXTRA[p.id] })),
  ...MORE,
]

/** Relative improvement, 0-100. */
export function improvementPct(insight: PerfInsight) {
  const { before, after } = insight.metric
  return before ? Math.round(((before - after) / before) * 100) : 0
}
