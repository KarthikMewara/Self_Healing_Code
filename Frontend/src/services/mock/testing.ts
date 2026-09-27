// Testing preview data: suites for the simulated runner (their totals match
// the runs in src/services/mock-data.ts), framework-accurate log formatters,
// generator templates that mirror the curated fixes in src/lib/examples.ts,
// and the regression tests that guard past heals. No real runner exists yet.

import type { LanguageKey } from "@/lib/highlight"
import { regressionTests, testRuns } from "@/services/mock-data"
import type { TestRun } from "@/types/domain"

import { createRng, hashSeed } from "./prng"

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

export type Framework = "vitest" | "go" | "pytest" | "junit" | "playwright"

export interface SuiteTest {
  id: string
  name: string
  ms: number
  /** "fail" fails every run; "flaky" fails on odd-numbered runs of the suite. */
  behavior?: "fail" | "flaky"
  failure?: string[]
  /** Example the "Heal with AI" button loads into the AI Debugger. */
  exampleId?: string
  /** Added from the test generator this session. */
  generated?: boolean
}

export interface SuiteFile {
  path: string
  tests: SuiteTest[]
  /** More passing tests in this file, reported in aggregate. */
  extra: number
  extraMs: number
}

export interface TestSuite {
  id: string
  name: string
  project: string
  language: LanguageKey
  framework: Framework
  frameworkLabel: string
  command: string
  files: SuiteFile[]
  /** Reported wall time of a clean run (transform, setup, collection included). */
  durationMs: number
}

const t = (id: string, name: string, ms: number, extra?: Partial<SuiteTest>): SuiteTest => ({ id, name, ms, ...extra })

export const SUITES: TestSuite[] = [
  {
    id: "checkout-full",
    name: "checkout-service / full suite",
    project: "checkout-service",
    language: "typescript",
    framework: "vitest",
    frameworkLabel: "Vitest 3.2",
    command: "pnpm vitest run --reporter=verbose",
    durationMs: 48_200,
    files: [
      {
        path: "src/cart.test.ts",
        extra: 14,
        extraMs: 41,
        tests: [
          t("co-1", "charges full price without a coupon", 4),
          t("co-2", "applies a 20% coupon to the subtotal", 3),
          t("co-3", "returns $0.00 for an empty cart", 2),
          t("co-4", "rounds totals to 2 decimals", 3),
        ],
      },
      {
        path: "src/discounts.test.ts",
        extra: 19,
        extraMs: 57,
        tests: [t("co-5", "stacks a loyalty discount after the coupon", 5), t("co-6", "never returns a negative total", 2)],
      },
      {
        path: "src/payments/stripe-intent.test.ts",
        extra: 22,
        extraMs: 9_800,
        tests: [
          t("co-7", "creates a PaymentIntent in the cart currency", 388),
          t("co-8", "retries once on an idempotency conflict", 1_112),
        ],
      },
      {
        path: "src/routes/checkout.test.ts",
        extra: 31,
        extraMs: 26_400,
        tests: [t("co-9", "POST /checkout responds 200", 1_480), t("co-10", "rejects a malformed cart with 422", 610)],
      },
      {
        path: "src/tax/region-tax.test.ts",
        extra: 23,
        extraMs: 88,
        tests: [t("co-11", "applies EU VAT by shipping country", 6)],
      },
      {
        path: "src/orders/history.test.ts",
        extra: 21,
        extraMs: 2_240,
        tests: [t("co-12", "paginates order history by cursor", 122)],
      },
    ],
  },
  {
    id: "routing-integration",
    name: "routing-gateway / integration",
    project: "routing-gateway",
    language: "go",
    framework: "go",
    frameworkLabel: "go test 1.23",
    command: "go test ./... -run Integration -count=1 -v",
    durationMs: 61_300,
    files: [
      {
        path: "router",
        extra: 9,
        extraMs: 4_100,
        tests: [
          t("rg-1", "TestRouteTable_Lookup", 12),
          t("rg-2", "TestRouteTable_ColdStart", 3, {
            behavior: "fail",
            exampleId: "go-router",
            failure: [
              "panic: runtime error: index out of range [0] with length 0 [recovered]",
              "    router/table.go:3 +0x1d",
              "    router/gateway.go:88 +0x2b4",
            ],
          }),
        ],
      },
      {
        path: "router/reload",
        extra: 11,
        extraMs: 9_800,
        tests: [
          t("rg-3", "TestReload_ConcurrentWrites", 2_040, {
            behavior: "flaky",
            failure: ["    reload_test.go:57: timed out after 2s waiting for 64 writers", "    (flaky: passed 7 of the last 10 runs)"],
          }),
          t("rg-4", "TestReload_Atomic", 180),
        ],
      },
      {
        path: "proxy",
        extra: 14,
        extraMs: 18_900,
        tests: [
          t("rg-5", "TestProxy_RetriesIdempotent", 640),
          t("rg-6", "TestProxy_UnknownHost", 2, {
            behavior: "fail",
            exampleId: "go-router",
            failure: [
              "panic: runtime error: index out of range [0] with length 0",
              "    router/table.go:3 +0x1d",
              "    proxy/upstream.go:41 +0x9c",
            ],
          }),
        ],
      },
      {
        path: "health",
        extra: 12,
        extraMs: 11_400,
        tests: [t("rg-7", "TestHealth_DrainsOnSIGTERM", 1_210)],
      },
      {
        path: "tls",
        extra: 25,
        extraMs: 6_700,
        tests: [t("rg-8", "TestSNI_FallbackCert", 95)],
      },
    ],
  },
  {
    id: "ingest-unit",
    name: "ingest-pipeline / unit",
    project: "ingest-pipeline",
    language: "python",
    framework: "pytest",
    frameworkLabel: "pytest 8.3",
    command: "pytest -v tests/",
    durationMs: 22_100,
    files: [
      {
        path: "tests/test_events.py",
        extra: 38,
        extraMs: 3_900,
        tests: [
          t("ip-1", "test_routes_events_with_tenant_id_in_the_payload", 11),
          t("ip-2", "test_falls_back_to_the_x_tenant_id_header", 9),
          t("ip-3", "test_dead_letters_events_with_no_tenant", 14),
        ],
      },
      {
        path: "tests/test_transform.py",
        extra: 51,
        extraMs: 4_700,
        tests: [t("ip-4", "test_normalizes_iso_timestamps", 6), t("ip-5", "test_drops_pii_fields", 8)],
      },
      {
        path: "tests/test_batching.py",
        extra: 44,
        extraMs: 6_200,
        tests: [t("ip-6", "test_flushes_every_500_events", 210), t("ip-7", "test_flushes_on_shutdown", 96)],
      },
      {
        path: "tests/test_webhooks.py",
        extra: 33,
        extraMs: 3_100,
        tests: [t("ip-8", "test_legacy_producer_payload_v1", 44)],
      },
      {
        path: "tests/test_dedupe.py",
        extra: 35,
        extraMs: 2_400,
        tests: [t("ip-9", "test_dedupes_on_event_id", 7)],
      },
    ],
  },
  {
    id: "auth-unit",
    name: "auth-service / unit",
    project: "auth-service",
    language: "java",
    framework: "junit",
    frameworkLabel: "JUnit 5.11 · Gradle",
    command: "./gradlew test",
    durationMs: 15_800,
    files: [
      {
        path: "TokenValidatorTest",
        extra: 11,
        extraMs: 1_900,
        tests: [
          t("au-1", "acceptsAValidBearerToken()", 42),
          t("au-2", "rejectsAnExpiredToken()", 18),
          t("au-3", "rejectsARequestWithoutAnAuthorizationHeader()", 6, {
            behavior: "fail",
            exampleId: "java-auth",
            failure: [
              'java.lang.NullPointerException: Cannot invoke "String.substring(int)" because "header" is null',
              "    at com.acme.auth.TokenValidator.verify(TokenValidator.java:88)",
              "    at com.acme.auth.TokenValidatorTest.rejectsARequestWithoutAnAuthorizationHeader(TokenValidatorTest.java:47)",
            ],
          }),
        ],
      },
      {
        path: "SessionIssuerTest",
        extra: 13,
        extraMs: 2_600,
        tests: [t("au-4", "issuesASessionBoundToTheTenant()", 31), t("au-5", "rotatesRefreshTokensOnUse()", 27)],
      },
      {
        path: "ResetControllerTest",
        extra: 9,
        extraMs: 3_100,
        tests: [t("au-6", "resetEmailIsSentOncePerHour()", 204)],
      },
      {
        path: "TenantResolverTest",
        extra: 19,
        extraMs: 1_700,
        tests: [t("au-7", "resolvesTenantFromTheHostHeader()", 12)],
      },
    ],
  },
  {
    id: "web-e2e",
    name: "web-dashboard / e2e",
    project: "web-dashboard",
    language: "typescript",
    framework: "playwright",
    frameworkLabel: "Playwright 1.48",
    command: "npx playwright test --project=chromium",
    durationMs: 41_200,
    files: [
      {
        path: "e2e/login.spec.ts",
        extra: 4,
        extraMs: 5_400,
        tests: [t("wd-1", "signs in with SSO", 2_310), t("wd-2", "shows an error for a revoked session", 1_180)],
      },
      {
        path: "e2e/charts.spec.ts",
        extra: 6,
        extraMs: 7_900,
        tests: [
          t("wd-3", "ChartPanel renders 30 days without a re-render loop", 3_120),
          t("wd-4", "switching tabs does not refetch fresh data", 2_890, {
            behavior: "flaky",
            failure: [
              "Error: expect(received).toBe(expected)",
              "  Expected: 1 request",
              "  Received: 2 requests",
              "    at e2e/charts.spec.ts:58:31",
            ],
          }),
        ],
      },
      {
        path: "e2e/export.spec.ts",
        extra: 5,
        extraMs: 4_300,
        tests: [t("wd-5", "exports the current range as CSV", 1_740)],
      },
      {
        path: "e2e/settings.spec.ts",
        extra: 7,
        extraMs: 3_900,
        tests: [t("wd-6", "saves notification preferences", 1_260)],
      },
      {
        path: "e2e/a11y.spec.ts",
        extra: 7,
        extraMs: 3_600,
        tests: [t("wd-7", "dashboard has no critical axe violations", 2_950)],
      },
    ],
  },
]

export function findSuite(id: string) {
  return SUITES.find((s) => s.id === id) ?? SUITES[0]
}

export function suiteTestCount(suite: TestSuite, added: SuiteTest[] = []) {
  return suite.files.reduce((n, f) => n + f.tests.length + f.extra, 0) + added.length
}

/** Does this test fail on the given (1-based) run of its suite? */
export function testFails(test: SuiteTest, runNumber: number) {
  if (test.behavior === "fail") return true
  if (test.behavior === "flaky") return runNumber % 2 === 1
  return false
}

// ---------------------------------------------------------------------------
// Log formatting -- each framework prints the way the real tool does
// ---------------------------------------------------------------------------

export type LogTone = "cmd" | "muted" | "pass" | "fail" | "info" | "plain" | "warn"

export interface LogLine {
  text: string
  tone?: LogTone
}

export interface RunTotals {
  passed: number
  failed: number
  total: number
  files: number
  failedFiles: number
  durationMs: number
}

const secs = (ms: number, digits = 2) => `${(ms / 1000).toFixed(digits)}s`
const GO_MODULE = "github.com/acme-robotics/routing-gateway"

export function logPreamble(suite: TestSuite, total: number): LogLine[] {
  const cmd: LogLine = { text: `$ ${suite.command}`, tone: "cmd" }
  switch (suite.framework) {
    case "vitest":
      return [cmd, { text: "" }, { text: ` RUN  v3.2.4 /srv/${suite.project}`, tone: "info" }, { text: "" }]
    case "go":
      return [cmd]
    case "pytest":
      return [
        cmd,
        { text: "============================= test session starts ==============================", tone: "muted" },
        { text: "platform linux -- Python 3.12.4, pytest-8.3.2, pluggy-1.5.0", tone: "muted" },
        { text: `collected ${total} items`, tone: "plain" },
        { text: "" },
      ]
    case "junit":
      return [
        cmd,
        { text: "> Task :compileJava UP-TO-DATE", tone: "muted" },
        { text: "> Task :compileTestJava", tone: "muted" },
        { text: "> Task :test", tone: "plain" },
        { text: "" },
      ]
    case "playwright":
      return [cmd, { text: "" }, { text: `Running ${total} tests using 4 workers`, tone: "plain" }, { text: "" }]
  }
}

export function logTest(
  suite: TestSuite,
  file: SuiteFile,
  test: SuiteTest,
  passed: boolean,
  ordinal: number,
  progressPct: number,
): LogLine[] {
  const failure = passed ? [] : (test.failure ?? []).map<LogLine>((text) => ({ text, tone: "fail" }))
  switch (suite.framework) {
    case "vitest":
      return [
        {
          text: ` ${passed ? "✓" : "×"} ${file.path} > ${test.name} ${test.ms}ms`,
          tone: passed ? "pass" : "fail",
        },
        ...failure.map((l) => ({ ...l, text: `   → ${l.text}` })),
      ]
    case "go":
      return [
        { text: `=== RUN   ${test.name}`, tone: "muted" },
        { text: `--- ${passed ? "PASS" : "FAIL"}: ${test.name} (${secs(test.ms)})`, tone: passed ? "pass" : "fail" },
        ...failure,
      ]
    case "pytest":
      return [
        {
          text: `${file.path}::${test.name} ${passed ? "PASSED" : "FAILED"}  [${String(Math.round(progressPct)).padStart(3)}%]`,
          tone: passed ? "pass" : "fail",
        },
        ...failure,
      ]
    case "junit":
      return [
        { text: `${file.path} > ${test.name} ${passed ? "PASSED" : "FAILED"}`, tone: passed ? "pass" : "fail" },
        ...failure,
      ]
    case "playwright":
      return [
        {
          text: `  ${passed ? "✓" : "✘"}  ${String(ordinal).padStart(2)} [chromium] › ${file.path} › ${test.name} (${secs(test.ms, 1)})`,
          tone: passed ? "pass" : "fail",
        },
        ...failure.map((l) => ({ ...l, text: `      ${l.text}` })),
      ]
  }
}

export function logFileDone(suite: TestSuite, file: SuiteFile, passed: number, failed: number, ms: number): LogLine[] {
  const count = passed + failed
  switch (suite.framework) {
    case "vitest":
      return [
        failed
          ? { text: ` ❯ ${file.path} (${count} tests | ${failed} failed) ${ms}ms`, tone: "fail" }
          : { text: ` ✓ ${file.path} (${count} tests) ${ms}ms`, tone: "muted" },
      ]
    case "go":
      return [
        failed
          ? { text: `FAIL\t${GO_MODULE}/${file.path}\t${secs(ms, 3)}`, tone: "fail" }
          : { text: `ok  \t${GO_MODULE}/${file.path}\t${secs(ms, 3)}`, tone: "pass" },
      ]
    case "pytest":
      return file.extra ? [{ text: `${file.path} ${".".repeat(Math.min(file.extra, 40))}  (+${file.extra} passed)`, tone: "muted" }] : []
    case "junit":
      return file.extra ? [{ text: `${file.path} > ${file.extra} more tests PASSED`, tone: "muted" }] : []
    case "playwright":
      return file.extra ? [{ text: `  ✓  ${file.path} › ${file.extra} more passed`, tone: "muted" }] : []
  }
}

export function logSummary(suite: TestSuite, r: RunTotals): LogLine[] {
  const ok = r.failed === 0
  switch (suite.framework) {
    case "vitest":
      return [
        { text: "" },
        {
          text: ` Test Files  ${r.failedFiles ? `${r.failedFiles} failed | ` : ""}${r.files - r.failedFiles} passed (${r.files})`,
          tone: ok ? "pass" : "fail",
        },
        {
          text: `      Tests  ${r.failed ? `${r.failed} failed | ` : ""}${r.passed} passed (${r.total})`,
          tone: ok ? "pass" : "fail",
        },
        { text: `   Duration  ${secs(r.durationMs)} (transform 1.12s, setup 0.41s, collect 3.20s)`, tone: "muted" },
      ]
    case "go":
      return [
        { text: ok ? "PASS" : "FAIL", tone: ok ? "pass" : "fail" },
        { text: `── ${r.passed} passed · ${r.failed} failed · ${r.total} total in ${secs(r.durationMs)}`, tone: "info" },
      ]
    case "pytest": {
      const parts = [r.failed ? `${r.failed} failed` : null, `${r.passed} passed`].filter(Boolean).join(", ")
      return [
        { text: "" },
        { text: `============================= ${parts} in ${secs(r.durationMs)} =============================`, tone: ok ? "pass" : "fail" },
      ]
    }
    case "junit":
      return [
        { text: "" },
        { text: `${r.total} tests completed, ${r.failed} failed`, tone: ok ? "pass" : "fail" },
        { text: `BUILD ${ok ? "SUCCESSFUL" : "FAILED"} in ${Math.round(r.durationMs / 1000)}s`, tone: ok ? "pass" : "fail" },
      ]
    case "playwright":
      return [
        { text: "" },
        ...(r.failed ? [{ text: `  ${r.failed} failed`, tone: "fail" as const }] : []),
        { text: `  ${r.passed} passed (${secs(r.durationMs, 1)})`, tone: "pass" },
      ]
  }
}

// ---------------------------------------------------------------------------
// Run history
// ---------------------------------------------------------------------------

export interface RunRecord extends TestRun {
  suiteId: string
  trigger: string
  /** Epoch ms for runs started in this browser session (shown as relative time). */
  at?: number
}

const SUITE_BY_NAME = new Map(SUITES.map((s) => [s.name, s.id]))

const TRIGGERS: Record<string, string> = {
  run_1: "Heal verification · sess_a1",
  run_2: "CI · push to main (a41f9c2)",
  run_3: "Heal verification · sess_a3",
  run_4: "Heal verification · sess_a4",
}

export const RUN_HISTORY_SEED: RunRecord[] = [
  ...testRuns.map((run) => ({
    ...run,
    suiteId: SUITE_BY_NAME.get(run.name) ?? SUITES[0].id,
    trigger: TRIGGERS[run.id] ?? "CI",
  })),
  {
    id: "run_5",
    suiteId: "web-e2e",
    name: "web-dashboard / e2e",
    status: "passed",
    passCount: 36,
    failCount: 0,
    durationMs: 41_200,
    ranAt: "2026-09-22 14:58",
    trigger: "Heal verification · sess_a5",
  },
  {
    id: "run_6",
    suiteId: "checkout-full",
    name: "checkout-service / full suite",
    status: "passed",
    passCount: 142,
    failCount: 0,
    durationMs: 47_650,
    ranAt: "2026-09-22 02:00",
    trigger: "Nightly schedule",
  },
]

// ---------------------------------------------------------------------------
// Test generator
// ---------------------------------------------------------------------------

export type TestType = "unit" | "integration" | "regression"

export const TEST_TYPES: { value: TestType; label: string; hint: string }[] = [
  { value: "unit", label: "Unit", hint: "Pure function behaviour and edge cases" },
  { value: "integration", label: "Integration", hint: "HTTP, workers and real collaborators" },
  { value: "regression", label: "Regression", hint: "Replays the bugs this code has already had" },
]

interface GenCase {
  code: string
  /** Coverage points this case adds (projected). */
  gain: number
  /** Extra imports this case needs (language-specific). */
  needs?: string[]
}

export interface GeneratorTarget {
  id: string
  project: string
  symbol: string
  language: LanguageKey
  framework: string
  suiteId: string
  file: string
  baseCoverage: number
  cases: Record<TestType, GenCase[]>
}

export const GENERATOR_TARGETS: GeneratorTarget[] = [
  {
    id: "checkout-total",
    project: "checkout-service",
    symbol: "checkoutTotal()",
    language: "typescript",
    framework: "Vitest",
    suiteId: "checkout-full",
    file: "checkout-service/src/cart.generated.test.ts",
    baseCoverage: 58,
    cases: {
      unit: [
        {
          gain: 9,
          code: `  it("charges full price without a coupon", () => {
    const cart = makeCart({ items: [{ price: 40, qty: 2 }] })
    expect(checkoutTotal(cart)).toBe("$80.00")
  })`,
        },
        {
          gain: 8,
          code: `  it("applies a 20% coupon to the subtotal", () => {
    const cart = makeCart({ items: [{ price: 50, qty: 2 }], coupon: { percentOff: 20 } })
    expect(checkoutTotal(cart)).toBe("$80.00")
  })`,
        },
        {
          gain: 4,
          code: `  it("returns $0.00 for an empty cart", () => {
    expect(checkoutTotal(makeCart({ items: [] }))).toBe("$0.00")
  })`,
        },
        {
          gain: 4,
          code: `  it("rounds totals to 2 decimals", () => {
    const cart = makeCart({ items: [{ price: 19.99, qty: 3 }], coupon: { percentOff: 15 } })
    expect(checkoutTotal(cart)).toBe("$50.97")
  })`,
        },
      ],
      integration: [
        {
          gain: 6,
          needs: ["supertest"],
          code: `  it("POST /checkout responds 200 without a coupon code", async () => {
    const res = await request(app).post("/checkout").send({ cartId: "cart_no_coupon" })
    expect(res.status).toBe(200)
    expect(res.body.total).toMatch(/^\\$\\d+\\.\\d{2}$/)
  })`,
        },
        {
          gain: 4,
          needs: ["supertest"],
          code: `  it("POST /checkout rejects a malformed cart", async () => {
    const res = await request(app).post("/checkout").send({ cartId: 42 })
    expect(res.status).toBe(422)
  })`,
        },
      ],
      regression: [
        {
          gain: 3,
          code: `  it("does not throw when the coupon is removed mid-checkout (sess_a1)", () => {
    const cart = makeCart({ items: [{ price: 12, qty: 3 }], coupon: { percentOff: 10 } })
    delete cart.coupon
    expect(() => checkoutTotal(cart)).not.toThrow()
    expect(checkoutTotal(cart)).toBe("$36.00")
  })`,
        },
        {
          gain: 2,
          code: `  it("treats a 0% coupon like no coupon", () => {
    const cart = makeCart({ items: [{ price: 25, qty: 2 }], coupon: { percentOff: 0 } })
    expect(checkoutTotal(cart)).toBe("$50.00")
  })`,
        },
      ],
    },
  },
  {
    id: "route-event",
    project: "ingest-pipeline",
    symbol: "route_event()",
    language: "python",
    framework: "pytest",
    suiteId: "ingest-unit",
    file: "ingest-pipeline/tests/test_route_event_generated.py",
    baseCoverage: 64,
    cases: {
      unit: [
        {
          gain: 7,
          code: `def test_routes_events_with_tenant_id_in_the_payload(registry):
    route_event(make_event(tenant_id="t_42"), registry)
    assert registry.dispatched_to == ["t_42"]`,
        },
        {
          gain: 8,
          code: `def test_falls_back_to_the_x_tenant_id_header(registry):
    event = make_event(headers={"x-tenant-id": "t_legacy"})
    route_event(event, registry)
    assert registry.dispatched_to == ["t_legacy"]`,
        },
        {
          gain: 6,
          code: `def test_dead_letters_events_with_no_tenant(registry):
    route_event(make_event(), registry)
    assert registry.dead_letters[0].reason == "missing tenant_id"`,
        },
        {
          gain: 3,
          code: `@pytest.mark.parametrize("tenant_id", ["", None])
def test_blank_tenant_id_uses_the_header(registry, tenant_id):
    event = make_event(tenant_id=tenant_id, headers={"x-tenant-id": "t_42"})
    route_event(event, registry)
    assert registry.dispatched_to == ["t_42"]`,
        },
      ],
      integration: [
        {
          gain: 6,
          code: `def test_worker_keeps_consuming_after_an_untenanted_event(worker, registry):
    worker.consume_batch([make_event(), make_event(tenant_id="t_42")])
    assert registry.dispatched_to == ["t_42"]
    assert len(registry.dead_letters) == 1`,
        },
        {
          gain: 3,
          code: `def test_legacy_webhook_is_accepted_end_to_end(client):
    response = client.post(
        "/webhooks/legacy",
        json={"event": "order.created"},
        headers={"x-tenant-id": "t_legacy"},
    )
    assert response.status_code == 202`,
        },
      ],
      regression: [
        {
          gain: 3,
          code: `def test_regression_keyerror_tenant_id():
    """sess_a3: KeyError: 'tenant_id' missing from event payload."""
    registry = FakeRegistry(tenants={"t_3"})
    route_event(make_event(headers={"x-tenant-id": "t_3"}), registry)
    assert registry.dispatched_to == ["t_3"]`,
        },
        {
          gain: 2,
          code: `def test_regression_handler_receives_the_original_event(registry):
    event = make_event(headers={"x-tenant-id": "t_42"})
    route_event(event, registry)
    assert registry.last_event is event`,
        },
      ],
    },
  },
  {
    id: "route-primary",
    project: "routing-gateway",
    symbol: "(*RouteTable).Primary",
    language: "go",
    framework: "go test",
    suiteId: "routing-integration",
    file: "routing-gateway/router/table_primary_test.go",
    baseCoverage: 51,
    cases: {
      unit: [
        { gain: 10, code: `\t\t{"first route wins", "api.acme.dev", "10.0.1.12:8443"},` },
        { gain: 9, code: `\t\t{"unknown host", "ghost.acme.dev", ""},` },
        { gain: 4, code: `\t\t{"another host", "admin.acme.dev", "10.0.2.4:9000"},` },
        { gain: 3, code: `\t\t{"empty host", "", ""},` },
      ],
      integration: [
        {
          gain: 8,
          needs: ["net/http"],
          code: `func TestGateway_ColdStartReturns404(t *testing.T) {
\tgw := newTestGateway(t, WithEmptyRouteTable())
\tdefer gw.Close()

\tres := gw.Get("http://ghost.acme.dev/healthz")
\tif res.StatusCode != http.StatusNotFound {
\t\tt.Fatalf("status = %d, want 404", res.StatusCode)
\t}
}`,
        },
        {
          gain: 4,
          needs: ["sync"],
          code: `func TestPrimary_ConcurrentReads(t *testing.T) {
\ttable := NewRouteTable()
\ttable.Add("api.acme.dev", &Route{Upstream: "10.0.1.12:8443"})

\tvar wg sync.WaitGroup
\tfor i := 0; i < 64; i++ {
\t\twg.Add(1)
\t\tgo func() {
\t\t\tdefer wg.Done()
\t\t\t_ = table.Primary("api.acme.dev")
\t\t}()
\t}
\twg.Wait()
}`,
        },
      ],
      regression: [
        {
          gain: 5,
          code: `// Regression for sess_a2: panic on a host with no routes during cold start.
func TestPrimary_EmptyTableDoesNotPanic(t *testing.T) {
\tdefer func() {
\t\tif r := recover(); r != nil {
\t\t\tt.Fatalf("Primary panicked: %v", r)
\t\t}
\t}()
\tif got := NewRouteTable().Primary("api.acme.dev"); got != nil {
\t\tt.Fatalf("got %v, want nil", got)
\t}
}`,
        },
        {
          gain: 3,
          code: `func TestPrimary_RemovedHostReturnsNil(t *testing.T) {
\ttable := NewRouteTable()
\ttable.Add("api.acme.dev", &Route{Upstream: "10.0.1.12:8443"})
\ttable.RemoveHost("api.acme.dev")

\tif got := table.Primary("api.acme.dev"); got != nil {
\t\tt.Fatalf("got %v, want nil", got)
\t}
}`,
        },
      ],
    },
  },
  {
    id: "token-verify",
    project: "auth-service",
    symbol: "TokenValidator.verify()",
    language: "java",
    framework: "JUnit 5",
    suiteId: "auth-unit",
    file: "auth-service/src/test/java/com/acme/auth/TokenValidatorGeneratedTest.java",
    baseCoverage: 62,
    cases: {
      unit: [
        {
          gain: 8,
          code: `        @Test
        void acceptsAValidBearerToken() {
            assertThat(validator.verify("Bearer " + TestTokens.valid())).isTrue();
        }`,
        },
        {
          gain: 6,
          code: `        @Test
        void rejectsAnExpiredToken() {
            assertThat(validator.verify("Bearer " + TestTokens.expired())).isFalse();
        }`,
        },
        {
          gain: 5,
          code: `        @Test
        void rejectsABasicAuthHeader() {
            assertThat(validator.verify("Basic YWRtaW46YWRtaW4=")).isFalse();
        }`,
        },
        {
          gain: 3,
          code: `        @Test
        void rejectsAMalformedToken() {
            assertThat(validator.verify("Bearer not-a-jwt")).isFalse();
        }`,
        },
      ],
      integration: [
        {
          gain: 7,
          needs: ["mockmvc"],
          code: `        @Test
        void healthCheckWithoutAHeaderGets401() throws Exception {
            mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        }`,
        },
        {
          gain: 4,
          needs: ["mockmvc"],
          code: `        @Test
        void validTokenReachesTheController() throws Exception {
            mvc.perform(get("/api/orders").header("Authorization", "Bearer " + TestTokens.valid()))
                .andExpect(status().isOk());
        }`,
        },
      ],
      regression: [
        {
          gain: 4,
          code: `        @Test
        void missingAuthorizationHeaderReturnsFalse() { // sess_a4
            assertThat(validator.verify(null)).isFalse();
        }`,
        },
        {
          gain: 2,
          code: `        @Test
        void emptyBearerTokenReturnsFalse() {
            assertThat(validator.verify("Bearer ")).isFalse();
        }`,
        },
      ],
    },
  },
]

export interface GeneratedTests {
  target: GeneratorTarget
  code: string
  count: number
  byType: Record<TestType, number>
  projectedCoverage: number
  /** Test names, for adding them to the runner's suite. */
  names: string[]
}

const TYPE_TITLE: Record<TestType, string> = { unit: "unit", integration: "integration", regression: "regression" }

/**
 * Picks cases until the projected coverage meets the target (at least one per
 * selected type, then the highest-value cases first) and renders a complete,
 * idiomatic test file for the target's language.
 */
export function generateTests(target: GeneratorTarget, types: TestType[], coverageTarget: number): GeneratedTests {
  const order: TestType[] = ["unit", "integration", "regression"]
  const selected = order.filter((type) => types.includes(type))
  const picked = new Map<TestType, GenCase[]>(selected.map((type) => [type, target.cases[type].slice(0, 1)]))
  let coverage = target.baseCoverage + selected.reduce((n, type) => n + (target.cases[type][0]?.gain ?? 0), 0)

  const rest = selected
    .flatMap((type) => target.cases[type].slice(1).map((c) => ({ type, c })))
    .sort((a, b) => b.c.gain - a.c.gain)
  for (const { type, c } of rest) {
    if (coverage >= coverageTarget) break
    picked.get(type)?.push(c)
    coverage += c.gain
  }
  // Keep each section in authoring order.
  for (const type of selected) {
    const list = picked.get(type) ?? []
    picked.set(type, target.cases[type].filter((c) => list.includes(c)))
  }

  const needs = new Set(selected.flatMap((type) => (picked.get(type) ?? []).flatMap((c) => c.needs ?? [])))
  const code = renderFile(target, selected, picked, needs)
  const byType = { unit: 0, integration: 0, regression: 0 } as Record<TestType, number>
  for (const type of selected) byType[type] = picked.get(type)?.length ?? 0
  const count = byType.unit + byType.integration + byType.regression

  return {
    target,
    code,
    count,
    byType,
    projectedCoverage: Math.min(98, coverage),
    names: extractNames(target.language, selected, picked),
  }
}

function extractNames(language: LanguageKey, selected: TestType[], picked: Map<TestType, GenCase[]>) {
  const names: string[] = []
  for (const type of selected) {
    for (const c of picked.get(type) ?? []) {
      const match =
        language === "typescript"
          ? c.code.match(/it\("([^"]+)"/)
          : language === "python"
            ? c.code.match(/def (test_\w+)/)
            : language === "java"
              ? c.code.match(/void (\w+)\(/)
              : c.code.match(/func (Test\w+)/) ?? c.code.match(/\{"([^"]+)"/)
      if (match) names.push(language === "java" ? `${match[1]}()` : language === "go" && type === "unit" ? `TestPrimary/${match[1].replace(/ /g, "_")}` : match[1])
    }
  }
  return names
}

function renderFile(target: GeneratorTarget, selected: TestType[], picked: Map<TestType, GenCase[]>, needs: Set<string>) {
  const cases = (type: TestType) => (picked.get(type) ?? []).map((c) => c.code)

  switch (target.language) {
    case "python": {
      const blocks = selected.map((type) => `# ── ${TYPE_TITLE[type]} ${"─".repeat(60 - TYPE_TITLE[type].length)}\n\n\n${cases(type).join("\n\n\n")}`)
      return [
        `"""Generated tests for ${target.symbol} -- review before merging."""`,
        "import pytest",
        "",
        "from ingest.events import route_event",
        "from ingest.testing import FakeRegistry, make_event",
        "",
        "",
        "@pytest.fixture",
        "def registry():",
        '    return FakeRegistry(tenants={"t_42", "t_legacy"})',
        "",
        "",
        blocks.join("\n\n\n"),
        "",
      ].join("\n")
    }
    case "go": {
      const imports = ["testing", ...[...needs].sort()].sort()
      const sections: string[] = []
      if (selected.includes("unit")) {
        sections.push(`func TestPrimary(t *testing.T) {
\ttable := NewRouteTable()
\ttable.Add("api.acme.dev", &Route{Upstream: "10.0.1.12:8443"})
\ttable.Add("api.acme.dev", &Route{Upstream: "10.0.1.13:8443"})
\ttable.Add("admin.acme.dev", &Route{Upstream: "10.0.2.4:9000"})

\ttests := []struct {
\t\tname string
\t\thost string
\t\twant string // "" means no route
\t}{
${cases("unit").join("\n")}
\t}
\tfor _, tt := range tests {
\t\tt.Run(tt.name, func(t *testing.T) {
\t\t\tgot := table.Primary(tt.host)
\t\t\tif tt.want == "" {
\t\t\t\tif got != nil {
\t\t\t\t\tt.Fatalf("Primary(%q) = %v, want nil", tt.host, got)
\t\t\t\t}
\t\t\t\treturn
\t\t\t}
\t\t\tif got == nil || got.Upstream != tt.want {
\t\t\t\tt.Fatalf("Primary(%q) = %v, want %s", tt.host, got, tt.want)
\t\t\t}
\t\t})
\t}
}`)
      }
      if (selected.includes("integration")) sections.push(...cases("integration"))
      if (selected.includes("regression")) sections.push(...cases("regression"))
      return [
        "// Code generated by Self-Healing AI Debugger. Review before merging.",
        "",
        "package router",
        "",
        imports.length > 1 ? `import (\n${imports.map((i) => `\t"${i}"`).join("\n")}\n)` : `import "testing"`,
        "",
        sections.join("\n\n"),
        "",
      ].join("\n")
    }
    case "java": {
      const mockMvc = needs.has("mockmvc")
      const nested = selected.map((type) => {
        const name = type[0].toUpperCase() + type.slice(1)
        return `    @Nested\n    class ${name} {\n\n${cases(type).join("\n\n")}\n    }`
      })
      return [
        "package com.acme.auth;",
        "",
        "import static org.assertj.core.api.Assertions.assertThat;",
        ...(mockMvc
          ? [
              "import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;",
              "import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;",
            ]
          : []),
        "",
        "import org.junit.jupiter.api.Nested;",
        "import org.junit.jupiter.api.Test;",
        ...(mockMvc
          ? [
              "import org.springframework.beans.factory.annotation.Autowired;",
              "import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;",
              "import org.springframework.boot.test.context.SpringBootTest;",
              "import org.springframework.test.web.servlet.MockMvc;",
            ]
          : []),
        "",
        "/** Generated tests for TokenValidator.verify() -- review before merging. */",
        ...(mockMvc ? ["@SpringBootTest", "@AutoConfigureMockMvc"] : []),
        "class TokenValidatorGeneratedTest {",
        "",
        "    private final TokenValidator validator = new TokenValidator(TestSigners.rs256());",
        ...(mockMvc ? ["", "    @Autowired", "    private MockMvc mvc;"] : []),
        "",
        nested.join("\n\n"),
        "}",
        "",
      ].join("\n")
    }
    default: {
      const supertest = needs.has("supertest")
      const blocks = selected.map(
        (type) => `describe("${target.symbol} · ${TYPE_TITLE[type]}", () => {\n${cases(type).join("\n\n")}\n})`,
      )
      return [
        "// Generated by Self-Healing AI Debugger -- review before merging.",
        ...(supertest ? ['import request from "supertest"'] : []),
        'import { describe, expect, it } from "vitest"',
        "",
        ...(supertest ? ['import { app } from "./app"'] : []),
        'import { checkoutTotal } from "./cart"',
        'import { makeCart } from "./test/factories"',
        "",
        blocks.join("\n\n"),
        "",
      ].join("\n")
    }
  }
}

// ---------------------------------------------------------------------------
// Regression tests
// ---------------------------------------------------------------------------

export type RegressionStatus = "passed" | "failed"

export interface RegressionCase {
  id: string
  name: string
  project: string
  language: LanguageKey
  /** The heal this test guards. */
  guards: string
  lastStatus: RegressionStatus
  lastRun: string
  /** Last 10 results, oldest first (the last one is `lastStatus`). */
  history: RegressionStatus[]
  /** Chance a simulated re-run fails: 0 = stable, 1 = still broken. */
  failRate: number
  durationMs: number
  exampleId?: string
}

const META: Record<string, Pick<RegressionCase, "language" | "guards" | "failRate" | "durationMs" | "exampleId">> = {
  reg_1: { language: "typescript", guards: "sess_a1 · null guard in applyDiscount()", failRate: 0, durationMs: 420 },
  reg_2: {
    language: "go",
    guards: "sess_a2 · heal still in progress",
    failRate: 1,
    durationMs: 1_180,
    exampleId: "go-router",
  },
  reg_3: { language: "python", guards: "sess_a3 · tenant_id header fallback", failRate: 0, durationMs: 610 },
  reg_4: { language: "typescript", guards: "sess_a5 · memoized chart series", failRate: 0, durationMs: 2_950 },
}

const HISTORY: Record<string, string> = {
  reg_1: "PPPPPPPPPP",
  reg_2: "PPPPPPPFFF",
  reg_3: "PPPPPFPPPP",
  reg_4: "PPPPPPPPPP",
  reg_5: "PPPPPPPPPF",
  reg_6: "PPPPPPPPPP",
  reg_7: "PPPPPPPPPP",
  reg_8: "PPFPPPFPPP",
}

const toHistory = (code: string): RegressionStatus[] => [...code].map((c) => (c === "F" ? "failed" : "passed"))

export const REGRESSION_CASES: RegressionCase[] = [
  ...regressionTests.map((r) => ({ ...r, ...META[r.id], history: toHistory(HISTORY[r.id]) })),
  {
    id: "reg_5",
    name: "verify() returns false without an Authorization header",
    project: "auth-service",
    language: "java",
    guards: "sess_a4 · heal needs review",
    lastStatus: "failed",
    lastRun: "2026-09-23 11:35",
    history: toHistory(HISTORY.reg_5),
    failRate: 1,
    durationMs: 380,
    exampleId: "java-auth",
  },
  {
    id: "reg_6",
    name: "route_event() dead-letters events with no tenant",
    project: "ingest-pipeline",
    language: "python",
    guards: "sess_a3 · dead-letter path",
    lastStatus: "passed",
    lastRun: "2026-09-23 17:09",
    history: toHistory(HISTORY.reg_6),
    failRate: 0,
    durationMs: 540,
  },
  {
    id: "reg_7",
    name: "checkout total never goes negative",
    project: "checkout-service",
    language: "typescript",
    guards: "Aug 29 · coupon stacking fix",
    lastStatus: "passed",
    lastRun: "2026-09-24 09:14",
    history: toHistory(HISTORY.reg_7),
    failRate: 0,
    durationMs: 360,
  },
  {
    id: "reg_8",
    name: "route table reload keeps serving under concurrent writes",
    project: "routing-gateway",
    language: "go",
    guards: "Sep 18 · atomic table swap",
    lastStatus: "passed",
    lastRun: "2026-09-24 08:50",
    history: toHistory(HISTORY.reg_8),
    failRate: 0.3,
    durationMs: 2_040,
  },
]

/** Deterministic outcome of the n-th simulated re-run of a regression test. */
export function regressionOutcome(test: RegressionCase, attempt: number): RegressionStatus {
  if (test.failRate >= 1) return "failed"
  if (test.failRate <= 0) return "passed"
  return createRng(hashSeed(`${test.id}:${attempt}`))() < test.failRate ? "failed" : "passed"
}
