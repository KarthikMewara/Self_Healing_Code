// AI Memory preview data -- the *semantic* layer: resolved cases the AI recalls
// when a new bug looks like one it has fixed before. It extends the four
// canonical cases in src/services/mock-data.ts with more history, and gives
// every case a plausible before/after snippet, trace and root cause.
//
// Cases that correspond to a curated debugger example carry `exampleId`, so
// "Reuse in debugger" can load the exact example. The rest hand their own
// snippet to the debugger draft. `similarity` is how closely the case matched
// the latest session that recalled it (`sessionId`). Deterministic.

import { findExample } from "@/lib/examples"
import { memoryCases } from "@/services/mock-data"
import type { MemoryCase } from "@/types/domain"

export interface MemoryRecord extends MemoryCase {
  projectId: string
  projectName: string
  /** Where the fix landed, shown on the diff. */
  file: string
  before: string
  after: string
  trace: string
  context: string
  /** May contain `inline code` spans. */
  rootCause: string
  fixSummary: string
  /** What made it match its latest session. */
  signals: string[]
  /** Times the AI has drawn on this case. */
  recalls: number
  /** Curated debugger example with the same bug, if any. */
  exampleId?: string
}

type CaseSeed = Omit<MemoryRecord, keyof MemoryCase> & Partial<MemoryCase>
type ExampleCase = Omit<CaseSeed, "file" | "before" | "after" | "trace" | "context"> & { exampleId: string }

const CANONICAL: Record<string, CaseSeed | ExampleCase> = {
  case_1: {
    projectId: "proj_1",
    projectName: "checkout-service",
    file: "checkout-service/src/pricing/discount.ts",
    before: `export function applyDiscount(order: Order): number {
  const cart = order.carts.find((c) => c.id === order.activeCartId)!
  const rate = order.coupon?.percentOff ?? 0
  return cart.total - cart.total * (rate / 100)
}`,
    after: `export function applyDiscount(order: Order): number {
  // Removing a coupon rebuilds the cart under a new id.
  const cart = order.carts.find((c) => c.id === order.activeCartId) ?? order.carts.at(-1)
  if (!cart) {
    throw new CheckoutError(\`Order \${order.id} has no cart to price\`)
  }
  const rate = order.coupon?.percentOff ?? 0
  return cart.total - cart.total * (rate / 100)
}`,
    trace: `TypeError: Cannot read properties of undefined (reading 'total')
    at applyDiscount (checkout-service/src/pricing/discount.ts:4:15)
    at removeCoupon (checkout-service/src/routes/coupons.ts:62:20)
    at Layer.handle (node_modules/express/lib/router/layer.js:95:5)`,
    context: "Only after a shopper removes a coupon — the cart is rebuilt with a new id",
    rootCause:
      "Removing a coupon rebuilds the cart under a new id, but `activeCartId` still pointed at the old one. `find()` returned `undefined`, and the non-null assertion `!` hid that from the compiler.",
    fixSummary: "Added null guard before accessing cart.total in applyDiscount()",
    signals: ["Same TypeError on a property read", "Shared frame applyDiscount()", "Same service: checkout-service"],
    recalls: 7,
  },
  case_2: {
    projectId: "proj_3",
    projectName: "routing-gateway",
    file: "routing-gateway/router/gateway.go",
    before: `func (g *Gateway) Resolve(host string) string {
	table := g.tables[host]
	return table.primary.Upstream
}`,
    after: `func (g *Gateway) Resolve(host string) (string, error) {
	table := g.tables[host]
	if table == nil || table.primary == nil {
		// Tables load asynchronously after a cold start.
		return "", ErrRouteTableWarming
	}
	return table.primary.Upstream, nil
}`,
    trace: `panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x10 pc=0x6d4a2e]

goroutine 118 [running]:
routing-gateway/router.(*Gateway).Resolve(0xc0001c4000, {0xc00012a0f0, 0x11})
	/app/router/gateway.go:3 +0x2e
routing-gateway/router.(*Gateway).ServeHTTP(0xc0001c4000, {0x8a1f40, 0xc0002b61c0}, 0xc0002d4100)
	/app/router/gateway.go:47 +0x9c`,
    context: "Only in the first seconds after a deploy or pod restart, before route tables finish loading",
    rootCause:
      "Route tables load asynchronously after a cold start. Requests that arrive first look up a host whose `*RouteTable` is still `nil`, and reading `table.primary` panics the whole process.",
    fixSummary: "Resolve returns ErrRouteTableWarming, which ServeHTTP turns into a 503 with Retry-After",
    signals: ["Same nil pointer panic in Gateway.Resolve", "Cold-start timing in both sessions", "Same service: routing-gateway"],
    recalls: 12,
  },
  case_3: {
    exampleId: "py-ingest",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    rootCause:
      "Events from the legacy webhook producer carry the tenant in the `x-tenant-id` header instead of the payload, so `event[\"tenant_id\"]` raised `KeyError` and took the worker down mid-batch.",
    fixSummary: "Default tenant_id to event source header when payload omits it",
    signals: ["Same KeyError key: 'tenant_id'", "Shared frame route_event()", "Same producer: legacy webhook"],
    recalls: 9,
  },
  case_4: {
    projectId: "proj_4",
    projectName: "web-dashboard",
    file: "web-dashboard/src/components/ChartPanel.tsx",
    before: `export function ChartPanel({ metrics }: { metrics: Metric[] }) {
  const [series, setSeries] = useState<Series[]>([])
  const options = { smooth: true, windowDays: 30 }

  useEffect(() => {
    setSeries(toSeries(metrics, options))
  }, [metrics, options])

  return <LineChart series={series} />
}`,
    after: `const CHART_OPTIONS = { smooth: true, windowDays: 30 }

export function ChartPanel({ metrics }: { metrics: Metric[] }) {
  const series = useMemo(() => toSeries(metrics, CHART_OPTIONS), [metrics])

  return <LineChart series={series} />
}`,
    trace: `Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
    at ChartPanel (web-dashboard/src/components/ChartPanel.tsx:6:5)
    at DashboardGrid (web-dashboard/src/pages/Overview.tsx:88:9)`,
    context: "Only on dashboards with live metrics — the panel pins a CPU core and never settles",
    rootCause:
      "`options` was a new object on every render. The effect listed it as a dependency, so each render scheduled another `setSeries` and the component never settled.",
    fixSummary: "Memoized chart series transform to break the setState loop",
    signals: ["Same update-depth loop in ChartPanel", "Unstable object in a dependency array", "Same app: web-dashboard"],
    recalls: 4,
  },
}

const EXTENDED: (CaseSeed | ExampleCase)[] = [
  {
    id: "case_5",
    title: "Checkout crashes when no coupon is applied",
    language: "JavaScript",
    errorType: "TypeError",
    similarity: 91,
    sessionId: "sess_b09",
    resolvedAt: "2026-09-02",
    exampleId: "js-checkout",
    projectId: "proj_1",
    projectName: "checkout-service",
    rootCause:
      "`cart.coupon` is `undefined` whenever a shopper checks out without a coupon, so reading `.percentOff` threw before the total was computed.",
    fixSummary: "Default a missing coupon to a 0% discount in checkoutTotal()",
    signals: ["Same TypeError reading 'percentOff'", "Shared frame checkoutTotal()", "Same service: checkout-service"],
    recalls: 15,
  },
  {
    id: "case_6",
    title: "Index out of range on a host with no routes",
    language: "Go",
    errorType: "panic",
    similarity: 84,
    sessionId: "sess_b14",
    resolvedAt: "2026-08-21",
    exampleId: "go-router",
    projectId: "proj_3",
    projectName: "routing-gateway",
    rootCause:
      "Right after a cold start the route table is empty, so `t.byHost[host]` returns a nil slice and `routes[0]` panics the gateway.",
    fixSummary: "Return nil from Primary() for hosts without routes",
    signals: ["Same panic: index out of range [0]", "Shared frame (*RouteTable).Primary", "Cold-start timing in both"],
    recalls: 11,
  },
  {
    id: "case_7",
    title: "Health checks arrive without an Authorization header",
    language: "Java",
    errorType: "NullPointerException",
    similarity: 79,
    sessionId: "sess_b15",
    resolvedAt: "2026-08-14",
    exampleId: "java-auth",
    projectId: "proj_5",
    projectName: "auth-service",
    rootCause:
      "Load-balancer health checks hit the API with no `Authorization` header, so `header` was `null` and `substring()` threw — a 500 instead of a 401.",
    fixSummary: "Reject requests without a Bearer header before parsing the token",
    signals: ["Same NullPointerException in TokenValidator.verify", "Null request header in both", "Same service: auth-service"],
    recalls: 6,
  },
  {
    id: "case_8",
    title: "Free-sample line items have no price record",
    language: "TypeScript",
    errorType: "TypeError",
    similarity: 86,
    sessionId: "sess_b01",
    resolvedAt: "2026-09-19",
    projectId: "proj_1",
    projectName: "checkout-service",
    file: "checkout-service/src/pricing/line-total.ts",
    before: `export function lineTotal(item: LineItem): string {
  return Money.format(item.price.amount * item.qty, item.price.currency)
}`,
    after: `export function lineTotal(item: LineItem, order: Order): string {
  if (!item.price) {
    // Free samples are added to the cart without a price record.
    return Money.format(0, order.currency)
  }
  return Money.format(item.price.amount * item.qty, item.price.currency)
}`,
    trace: `TypeError: Cannot read properties of null (reading 'amount')
    at lineTotal (checkout-service/src/pricing/line-total.ts:2:34)
    at Array.map (<anonymous>)
    at renderReceipt (checkout-service/src/receipts/render.ts:19:29)`,
    context: "Orders that include a free sample from the promo shelf",
    rootCause:
      "Free-sample items are added to the cart without a price record, so `item.price` is `null` when the receipt totals each line.",
    fixSummary: "Price free-sample line items at zero in lineTotal()",
    signals: ["Same null read on a pricing object", "Receipt rendering path in both", "Same service: checkout-service"],
    recalls: 5,
  },
  {
    id: "case_9",
    title: "Tooltip reads a series hidden by the legend",
    language: "TypeScript",
    errorType: "TypeError",
    similarity: 67,
    sessionId: "sess_b05",
    resolvedAt: "2026-09-11",
    projectId: "proj_4",
    projectName: "web-dashboard",
    file: "web-dashboard/src/charts/SeriesTooltip.tsx",
    before: `export function SeriesTooltip({ activeKey, series }: TooltipProps) {
  const point = series.find((s) => s.key === activeKey)
  return (
    <div className="tooltip">
      {point.values.map((v) => (
        <TooltipRow key={v.label} label={v.label} value={v.value} />
      ))}
    </div>
  )
}`,
    after: `export function SeriesTooltip({ activeKey, series }: TooltipProps) {
  const point = series.find((s) => s.key === activeKey)
  if (!point) return null
  return (
    <div className="tooltip">
      {point.values.map((v) => (
        <TooltipRow key={v.label} label={v.label} value={v.value} />
      ))}
    </div>
  )
}`,
    trace: `TypeError: Cannot read properties of undefined (reading 'values')
    at SeriesTooltip (web-dashboard/src/charts/SeriesTooltip.tsx:5:14)
    at renderWithHooks (react-dom/cjs/react-dom.development.js:15486:18)`,
    context: "Hovering the chart right after hiding a series from the legend",
    rootCause:
      "Hiding a series from the legend removes it from `series` while the tooltip still holds its `activeKey`, so `find()` returns `undefined`.",
    fixSummary: "Tooltip skips series removed by the active filter",
    signals: ["Same TypeError on an unchecked find()", "Chart hover path in both", "Same app: web-dashboard"],
    recalls: 3,
  },
  {
    id: "case_10",
    title: "Send on a closed channel during graceful shutdown",
    language: "Go",
    errorType: "panic",
    similarity: 71,
    sessionId: "sess_b07",
    resolvedAt: "2026-09-08",
    projectId: "proj_3",
    projectName: "routing-gateway",
    file: "routing-gateway/upstream/pool.go",
    before: `func (p *Pool) Shutdown() {
	close(p.results)
	p.wg.Wait()
}`,
    after: `func (p *Pool) Shutdown() {
	close(p.quit)
	p.wg.Wait() // every worker has stopped sending
	close(p.results)
}`,
    trace: `panic: send on closed channel

goroutine 87 [running]:
routing-gateway/upstream.(*Pool).worker(0xc0000a8000, 0x3)
	/app/upstream/pool.go:58 +0x1a5
created by routing-gateway/upstream.(*Pool).Start in goroutine 1
	/app/upstream/pool.go:31 +0x6b`,
    context: "Only during rolling deploys, when SIGTERM lands mid-request",
    rootCause:
      "`Shutdown` closed `p.results` before waiting for the workers, so any worker finishing an in-flight request sent on a closed channel.",
    fixSummary: "Close the results channel only after every worker has exited",
    signals: ["Same panic: send on closed channel", "Shutdown path in both", "Same service: routing-gateway"],
    recalls: 2,
  },
  {
    id: "case_11",
    title: "Schema v2 events moved 'occurred_at' under meta",
    language: "Python",
    errorType: "KeyError",
    similarity: 74,
    sessionId: "sess_b08",
    resolvedAt: "2026-09-06",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    file: "ingest-pipeline/ingest/timestamps.py",
    before: `def event_timestamp(event: dict) -> datetime:
    return datetime.fromisoformat(event["occurred_at"])`,
    after: `def event_timestamp(event: dict) -> datetime:
    # v2 envelopes nest the timestamp under "meta".
    raw = event.get("occurred_at") or event.get("meta", {}).get("occurred_at")
    if raw is None:
        raise InvalidEvent("event has no occurred_at timestamp")
    return datetime.fromisoformat(raw)`,
    trace: `Traceback (most recent call last):
  File "ingest/worker.py", line 61, in consume
    ts = event_timestamp(message.body)
  File "ingest/timestamps.py", line 2, in event_timestamp
    return datetime.fromisoformat(event["occurred_at"])
KeyError: 'occurred_at'`,
    context: "Started when the billing team moved their producers to the v2 event schema",
    rootCause:
      "Producers on the v2 schema moved `occurred_at` into a nested `meta` envelope, but the worker still read it from the top level of the event.",
    fixSummary: "Read occurred_at from the v2 meta envelope with a v1 fallback",
    signals: ["Same KeyError on an event field", "Shared frame consume()", "Same service: ingest-pipeline"],
    recalls: 8,
  },
  {
    id: "case_12",
    title: "Refresh tokens outlive their deleted tenant",
    language: "Java",
    errorType: "NullPointerException",
    similarity: 63,
    sessionId: "sess_b03",
    resolvedAt: "2026-09-16",
    projectId: "proj_5",
    projectName: "auth-service",
    file: "auth-service/src/RefreshTokenService.java",
    before: `public TokenPair rotate(RefreshToken token) {
    Tenant tenant = tenants.findById(token.tenantId());
    String issuer = tenant.issuerUrl();
    return signer.issue(token.subject(), issuer);
}`,
    after: `public TokenPair rotate(RefreshToken token) {
    Tenant tenant = tenants.findById(token.tenantId());
    if (tenant == null) {
        throw new InvalidGrantException("refresh token belongs to a deleted tenant");
    }
    String issuer = tenant.issuerUrl();
    return signer.issue(token.subject(), issuer);
}`,
    trace: `java.lang.NullPointerException: Cannot invoke "com.acme.auth.Tenant.issuerUrl()" because "tenant" is null
	at com.acme.auth.RefreshTokenService.rotate(RefreshTokenService.java:3)
	at com.acme.auth.TokenController.refresh(TokenController.java:57)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)`,
    context: "Refresh requests from sessions that belong to a deleted tenant",
    rootCause:
      "Refresh tokens outlive their tenant: once a tenant is deleted, `findById` returns `null` and the rotation path dereferences it.",
    fixSummary: "Reject refresh tokens whose tenant no longer exists",
    signals: ["Same helpful-NPE message shape", "Token rotation path in both", "Same service: auth-service"],
    recalls: 2,
  },
  {
    id: "case_13",
    title: "Tombstone message with a null value crashes decode()",
    language: "Python",
    errorType: "AttributeError",
    similarity: 58,
    sessionId: "sess_b12",
    resolvedAt: "2026-08-27",
    projectId: "proj_2",
    projectName: "ingest-pipeline",
    file: "ingest-pipeline/ingest/codec.py",
    before: `def decode(message) -> dict:
    return json.loads(message.value.decode("utf-8"))`,
    after: `def decode(message) -> dict | None:
    # Compacted topics emit tombstones whose value is None.
    if message.value is None:
        return None
    return json.loads(message.value.decode("utf-8"))`,
    trace: `Traceback (most recent call last):
  File "ingest/consumer.py", line 41, in poll_forever
    payload = decode(message)
  File "ingest/codec.py", line 2, in decode
    return json.loads(message.value.decode("utf-8"))
AttributeError: 'NoneType' object has no attribute 'decode'`,
    context: "After log compaction was enabled on the events topic",
    rootCause:
      "Compacted topics emit tombstone messages whose `value` is `None`, and `decode()` called `.decode()` on it unconditionally.",
    fixSummary: "Skip tombstone messages with a null value in decode()",
    signals: ["Same None dereference in the consumer", "Shared frame poll_forever()", "Same service: ingest-pipeline"],
    recalls: 1,
  },
]

function complete(seed: CaseSeed | ExampleCase, base?: MemoryCase): MemoryRecord {
  const merged = { ...seed, ...base } as MemoryRecord & { exampleId?: string }
  if (merged.exampleId) {
    const ex = findExample(merged.exampleId)
    if (ex) {
      return {
        ...merged,
        file: ex.file,
        before: ex.original,
        after: ex.fixed,
        trace: ex.trace,
        context: ex.context ?? "",
      }
    }
  }
  return merged
}

export const memoryRecords: MemoryRecord[] = [
  ...memoryCases.map((c) => complete(CANONICAL[c.id], c)),
  ...EXTENDED.map((seed) => complete(seed)),
]

export function findMemoryCase(id: string | null | undefined) {
  return id ? memoryRecords.find((c) => c.id === id) : undefined
}

export function memoryForSession(sessionId: string) {
  return memoryRecords.find((c) => c.sessionId === sessionId)
}

export function memoryForProject(projectId: string) {
  return memoryRecords.filter((c) => c.projectId === projectId).sort((a, b) => b.similarity - a.similarity)
}

/** Error families, largest first -- the hubs of the memory graph. */
export const ERROR_FAMILIES: { type: string; count: number }[] = Object.entries(
  memoryRecords.reduce<Record<string, number>>((acc, c) => {
    acc[c.errorType] = (acc[c.errorType] ?? 0) + 1
    return acc
  }, {}),
)
  .map(([type, count]) => ({ type, count }))
  .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
