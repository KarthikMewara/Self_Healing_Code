import type { LanguageKey } from "@/lib/highlight"

// Realistic broken snippets used by the landing-page simulator, the debugger's
// "Load example" menu, and the simulated backend (which returns the curated fix
// below when it recognises one of these inputs). Traces are shaped exactly like
// each runtime prints them, so the trace parser and editor markers work on them.

export interface CodeExample {
  id: string
  language: LanguageKey
  title: string
  file: string
  original: string
  fixed: string
  trace: string
  context?: string
  /** 1-based line in `original` where it fails. */
  errorLine: number
  /** Substring on the error line the simulator circles as the root cause. */
  bugToken: string
  rootCause: string
  explanation: string
  tests: string[]
  telemetry: { retrieval: string; analysis: string; generation: string; testing: string }
}

export const EXAMPLES: CodeExample[] = [
  {
    id: "js-checkout",
    language: "javascript",
    title: "Checkout without a coupon",
    file: "checkout-service/cart.js",
    original: `import { formatPrice } from "./format.js"

export function checkoutTotal(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const rate = cart.coupon.percentOff / 100
  const total = subtotal - subtotal * rate
  return formatPrice(total)
}`,
    fixed: `import { formatPrice } from "./format.js"

export function checkoutTotal(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const rate = (cart.coupon?.percentOff ?? 0) / 100
  const total = subtotal - subtotal * rate
  return formatPrice(total)
}`,
    trace: `TypeError: Cannot read properties of undefined (reading 'percentOff')
    at checkoutTotal (checkout-service/cart.js:5:28)
    at handleCheckout (checkout-service/routes.js:41:18)
    at Layer.handle (node_modules/express/lib/router/layer.js:95:5)`,
    context: "Only happens when the customer checks out without a coupon code",
    errorLine: 5,
    bugToken: "cart.coupon.percentOff",
    rootCause: "cart.coupon is undefined when no coupon is applied",
    explanation: `### Root cause

\`cart.coupon\` is \`undefined\` whenever a customer checks out **without** a coupon, so reading \`.percentOff\` throws before the total is ever computed.

### What changed

Line 5 now reads the coupon with optional chaining and falls back to \`0\` — no coupon simply means a 0% discount.

\`\`\`js
const rate = (cart.coupon?.percentOff ?? 0) / 100
\`\`\`

### Why this is safe

Carts that *do* carry a coupon take exactly the same path as before. Only the missing-coupon case changes, and it now returns the undiscounted total instead of crashing the request.`,
    tests: [
      "applies a 20% coupon to the subtotal",
      "charges full price without a coupon",
      "returns $0.00 for an empty cart",
      "rounds totals to 2 decimals",
      "POST /checkout responds 200",
      "rejects a malformed cart",
    ],
    telemetry: {
      retrieval: "Searching your company's knowledge base for similar TypeError cases in checkout-service…",
      analysis: "Parsing the trace — failure at cart.js:5. Building the AST for checkoutTotal()…",
      generation: "Generating a minimal patch for the unguarded read of cart.coupon…",
      testing: "Running 6 tests against the patched module…",
    },
  },
  {
    id: "py-ingest",
    language: "python",
    title: "Webhook missing tenant_id",
    file: "ingest-pipeline/events.py",
    original: `def route_event(event, registry):
    tenant = event["tenant_id"]
    handler = registry.lookup(tenant)
    return handler.dispatch(event)`,
    fixed: `def route_event(event, registry):
    tenant = event.get("tenant_id") or event.get("headers", {}).get("x-tenant-id")
    if tenant is None:
        return registry.dead_letter(event, reason="missing tenant_id")
    handler = registry.lookup(tenant)
    return handler.dispatch(event)`,
    trace: `Traceback (most recent call last):
  File "ingest/worker.py", line 58, in consume
    route_event(message.body, registry)
  File "ingest/events.py", line 2, in route_event
    tenant = event["tenant_id"]
KeyError: 'tenant_id'`,
    context: "Started after the legacy webhook producer was re-enabled",
    errorLine: 2,
    bugToken: 'event["tenant_id"]',
    rootCause: "legacy producers send the tenant in a header, not the payload",
    explanation: `### Root cause

Events from the legacy webhook producer carry the tenant in the \`x-tenant-id\` **header** instead of the payload, so \`event["tenant_id"]\` raises \`KeyError\` and the worker crashes mid-batch.

### What changed

- The tenant is read from the payload first, then from the \`x-tenant-id\` header.
- Events with no tenant at all go to the dead-letter queue instead of taking the worker down.

### Why this is safe

Well-formed events resolve exactly as before. The only new path is for events that previously crashed the consumer — they're now parked for inspection rather than lost.`,
    tests: [
      "routes events with tenant_id in the payload",
      "falls back to the x-tenant-id header",
      "dead-letters events with no tenant",
      "does not drop the rest of the batch",
      "handler receives the original event",
    ],
    telemetry: {
      retrieval: "Retrieving 3 similar KeyError cases from ingest-pipeline's history…",
      analysis: "Walking the traceback — the failing frame is events.py line 2 in route_event()…",
      generation: "Writing a fallback lookup plus a dead-letter path for events without a tenant…",
      testing: "Running 5 tests, including a replay of the failing webhook payload…",
    },
  },
  {
    id: "go-router",
    language: "go",
    title: "Route lookup on an unknown host",
    file: "routing-gateway/router/table.go",
    original: `func (t *RouteTable) Primary(host string) *Route {
	routes := t.byHost[host]
	return routes[0]
}`,
    fixed: `func (t *RouteTable) Primary(host string) *Route {
	routes := t.byHost[host]
	if len(routes) == 0 {
		return nil
	}
	return routes[0]
}`,
    trace: `panic: runtime error: index out of range [0] with length 0

goroutine 42 [running]:
routing-gateway/router.(*RouteTable).Primary(...)
	/app/router/table.go:3 +0x1d
routing-gateway/router.(*Gateway).ServeHTTP(0xc000148000, {0x7f2a0c, 0xc0001a2000}, 0xc0001b6000)
	/app/router/gateway.go:88 +0x2b4`,
    context: "Panics right after a cold start, before the route table has warmed up",
    errorLine: 3,
    bugToken: "routes[0]",
    rootCause: "the host has no routes yet during a cold start",
    explanation: `### Root cause

Right after a cold start the route table is empty, so \`t.byHost[host]\` returns a **nil slice** and indexing \`routes[0]\` panics — taking the whole gateway process with it.

### What changed

\`Primary\` now returns \`nil\` when a host has no routes. \`ServeHTTP\` already treats a nil route as a 404, so the caller needed no change.

### Why this is safe

Hosts with routes behave identically. An unknown or not-yet-warmed host now gets a clean 404 instead of a process-wide panic.`,
    tests: [
      "returns the first route for a known host",
      "returns nil for an unknown host",
      "survives a cold start with an empty table",
      "ServeHTTP answers 404 for unrouted hosts",
    ],
    telemetry: {
      retrieval: "Matching this panic against 2 previous cold-start incidents in routing-gateway…",
      analysis: "Following goroutine 42 — index out of range in (*RouteTable).Primary at table.go:3…",
      generation: "Adding an empty-slice guard that returns nil instead of panicking…",
      testing: "Running 4 tests, including an empty-table cold-start scenario…",
    },
  },
  {
    id: "ts-invoices",
    language: "typescript",
    title: "Invoices for a deleted customer",
    file: "billing-web/src/api/invoices.ts",
    original: `export async function loadInvoices(customerId: string): Promise<Invoice[]> {
  const res = await fetch(\`/api/customers/\${customerId}/invoices\`)
  const body = await res.json()
  return body.data.map(toInvoice)
}`,
    fixed: `export async function loadInvoices(customerId: string): Promise<Invoice[]> {
  const res = await fetch(\`/api/customers/\${customerId}/invoices\`)
  if (!res.ok) {
    throw new Error(\`Failed to load invoices (\${res.status})\`)
  }
  const body = await res.json()
  return (body.data ?? []).map(toInvoice)
}`,
    trace: `TypeError: Cannot read properties of undefined (reading 'map')
    at loadInvoices (billing-web/src/api/invoices.ts:4:20)
    at async InvoiceTable (billing-web/src/components/InvoiceTable.tsx:18:22)`,
    context: "Crashes the invoices page for customers that were deleted",
    errorLine: 4,
    bugToken: "body.data.map",
    rootCause: "the API returns an error body with no data on 404",
    explanation: `### Root cause

For deleted customers the API answers **404** with \`{ "error": "not_found" }\`. The code never checks \`res.ok\`, so it reads \`body.data\` from the error body — \`undefined\` — and \`.map\` throws.

### What changed

1. Non-2xx responses now throw a descriptive error the page's error boundary can show.
2. A missing \`data\` field is treated as an empty list.

### Why this is safe

Successful responses map exactly as before; failures now surface as a clear message instead of a white screen.`,
    tests: [
      "maps invoices from a 200 response",
      "throws a readable error on 404",
      "treats a missing data field as empty",
      "InvoiceTable renders the error state",
      "keeps invoice order stable",
    ],
    telemetry: {
      retrieval: "Looking up how billing-web handled similar fetch failures before…",
      analysis: "Tracing invoices.ts:4 — body.data is undefined when the response isn't OK…",
      generation: "Adding a res.ok check and an empty-list fallback…",
      testing: "Running 5 tests across the API helper and InvoiceTable…",
    },
  },
  {
    id: "java-auth",
    language: "java",
    title: "Request without an Authorization header",
    file: "auth-service/TokenValidator.java",
    original: `public class TokenValidator {
    public boolean verify(String header) {
        String token = header.substring("Bearer ".length());
        return signer.isValid(token);
    }
}`,
    fixed: `public class TokenValidator {
    public boolean verify(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            return false;
        }
        String token = header.substring("Bearer ".length());
        return signer.isValid(token);
    }
}`,
    trace: `Exception in thread "http-nio-8080-exec-3" java.lang.NullPointerException: Cannot invoke "String.substring(int)" because "header" is null
	at com.acme.auth.TokenValidator.verify(TokenValidator.java:3)
	at com.acme.auth.AuthFilter.doFilter(AuthFilter.java:41)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:178)`,
    errorLine: 3,
    bugToken: "header.substring",
    rootCause: "health checks arrive with no Authorization header",
    explanation: `### Root cause

Load-balancer health checks hit the API **without** an \`Authorization\` header, so \`header\` is \`null\` and \`substring\` throws — returning a 500 instead of a 401.

### What changed

\`verify\` now rejects a missing or non-Bearer header up front and returns \`false\`, which \`AuthFilter\` already maps to **401 Unauthorized**.

### Why this is safe

Valid Bearer tokens are verified exactly as before. The change only affects requests that were previously crashing.`,
    tests: [
      "accepts a valid Bearer token",
      "rejects a missing header with 401",
      "rejects a Basic auth header",
      "rejects a malformed token",
    ],
    telemetry: {
      retrieval: "Searching auth-service history for NullPointerExceptions in request filters…",
      analysis: "The helpful NPE message names the culprit: \"header\" is null at TokenValidator.java:3…",
      generation: "Guarding against a missing or non-Bearer header before parsing…",
      testing: "Running 4 tests against TokenValidator and AuthFilter…",
    },
  },
  {
    id: "cs-report",
    language: "csharp",
    title: "Daily digest on a zero-order day",
    file: "Shop/Reports/OrderStats.cs",
    original: `public decimal AverageOrderValue(IReadOnlyList<Order> orders)
{
    var total = orders.Sum(o => o.Amount);
    return total / orders.Count;
}`,
    fixed: `public decimal AverageOrderValue(IReadOnlyList<Order> orders)
{
    if (orders.Count == 0)
    {
        return 0m;
    }
    var total = orders.Sum(o => o.Amount);
    return total / orders.Count;
}`,
    trace: `System.DivideByZeroException: Attempted to divide by zero.
   at Shop.Reports.OrderStats.AverageOrderValue(IReadOnlyList\`1 orders) in /src/Reports/OrderStats.cs:line 4
   at Shop.Reports.DailyDigest.Build() in /src/Reports/DailyDigest.cs:line 27`,
    errorLine: 4,
    bugToken: "total / orders.Count",
    rootCause: "no orders were placed, so Count is 0",
    explanation: `### Root cause

On a day with **no orders** \`orders.Count\` is \`0\`, and \`decimal\` division by zero throws \`DivideByZeroException\`, which aborts the whole daily digest.

### What changed

An empty order list now reports an average of \`0m\` before any division happens.

### Why this is safe

Days with orders compute the same average as before; the digest simply shows 0 for quiet days instead of failing to send.`,
    tests: [
      "averages a normal day of orders",
      "returns 0 for a day with no orders",
      "DailyDigest builds on a quiet day",
    ],
    telemetry: {
      retrieval: "Finding previous DivideByZeroException fixes across the Reports module…",
      analysis: "OrderStats.cs line 4 divides by orders.Count, which is 0 on quiet days…",
      generation: "Returning 0m for an empty order list before dividing…",
      testing: "Running 3 tests including a zero-order day…",
    },
  },
  {
    id: "rb-cart",
    language: "ruby",
    title: "Tax for a cart with no region",
    file: "storefront/app/models/cart.rb",
    original: `class Cart
  def total_with_tax
    subtotal = line_items.sum(&:price)
    subtotal + (subtotal * region.tax_rate)
  end
end`,
    fixed: `class Cart
  def total_with_tax
    subtotal = line_items.sum(&:price)
    rate = region&.tax_rate || 0
    subtotal + (subtotal * rate)
  end
end`,
    trace: `app/models/cart.rb:4:in 'total_with_tax': undefined method 'tax_rate' for nil (NoMethodError)
	from app/controllers/checkouts_controller.rb:12:in 'create'
	from actionpack/lib/action_controller/metal/basic_implicit_render.rb:6:in 'send_action'`,
    errorLine: 4,
    bugToken: "region.tax_rate",
    rootCause: "carts created before address entry have no region",
    explanation: `### Root cause

A cart created **before** the shopper enters an address has no \`region\` yet, so \`region.tax_rate\` calls a method on \`nil\`.

### What changed

The tax rate is read with the safe-navigation operator and defaults to \`0\` until a region exists.

### Why this is safe

Once an address is entered the region's real tax rate applies exactly as before — the fallback only covers the pre-address window.`,
    tests: [
      "adds regional tax when a region is set",
      "charges no tax before an address is entered",
      "POST /checkouts succeeds for early carts",
    ],
    telemetry: {
      retrieval: "Retrieving similar NoMethodError-on-nil cases from storefront…",
      analysis: "cart.rb line 4 calls tax_rate on a nil region…",
      generation: "Using safe navigation with a zero-rate fallback…",
      testing: "Running 3 tests across Cart and CheckoutsController…",
    },
  },
  {
    id: "php-receipt",
    language: "php",
    title: "Receipt email for a guest checkout",
    file: "shop/app/receipts.php",
    original: `<?php
function receiptEmail(Order $order): string {
    $customer = $order->customer();
    return $customer->email();
}`,
    fixed: `<?php
function receiptEmail(Order $order): ?string {
    $customer = $order->customer();
    if ($customer === null) {
        return $order->guestEmail;
    }
    return $customer->email();
}`,
    trace: `PHP Fatal error:  Uncaught Error: Call to a member function email() on null in /var/www/app/receipts.php:4
Stack trace:
#0 /var/www/app/checkout.php(58): receiptEmail(Object(Order))
#1 {main}
  thrown in /var/www/app/receipts.php on line 4`,
    errorLine: 4,
    bugToken: "$customer->email()",
    rootCause: "guest checkouts have no customer record",
    explanation: `### Root cause

**Guest** checkouts don't create a customer record, so \`$order->customer()\` returns \`null\` and calling \`->email()\` on it is fatal.

### What changed

Guest orders now fall back to the email captured at checkout (\`$order->guestEmail\`), and the return type is nullable to reflect reality.

### Why this is safe

Registered customers still use their account email. Guests now receive their receipt instead of triggering a fatal error.`,
    tests: [
      "uses the account email for registered customers",
      "falls back to the guest email",
      "checkout completes for guests",
    ],
    telemetry: {
      retrieval: "Searching shop's history for 'member function on null' errors…",
      analysis: "receipts.php line 4 calls email() on a null customer…",
      generation: "Adding a guest fallback before dereferencing the customer…",
      testing: "Running 3 tests for registered and guest checkouts…",
    },
  },
]

export const LANDING_EXAMPLES = ["js-checkout", "py-ingest", "go-router", "ts-invoices"].map(
  (id) => EXAMPLES.find((e) => e.id === id)!,
)

export function findExample(id: string) {
  return EXAMPLES.find((e) => e.id === id)
}

/** Recognise one of the curated examples from submitted source. */
export function matchExample(source: string): CodeExample | undefined {
  const normalized = source.replace(/\s+/g, " ").trim()
  return EXAMPLES.find((e) => e.original.replace(/\s+/g, " ").trim() === normalized)
}
