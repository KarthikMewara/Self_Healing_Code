// Security preview data. The first five findings are src/services/mock-data.ts
// securityFindings, extended with the detail a real scanner would report
// (rule, CWE, line, remediation, a code excerpt) plus a ready-made AI Debugger
// draft for "Fix this". No scanner is wired up yet.

import type { LanguageKey } from "@/lib/highlight"
import { securityFindings } from "@/services/mock-data"
import type { SecurityFinding, Severity } from "@/types/domain"

import { createRng, hashSeed } from "./prng"

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"]

export interface FindingDetail extends SecurityFinding {
  project: string
  language: LanguageKey
  line: number
  cwe: string
  cweName: string
  rule: string
  remediation: string[]
  /** Excerpt shown in the details panel; `errorLine` is 1-based within it. */
  excerpt: { file: string; code: string; errorLine: number }
  /** What "Fix this" loads into the AI Debugger. */
  draft: { source: string; trace: string; context: string }
  /** Found by the most recent re-scan. */
  isNew?: boolean
}

type Extra = Omit<FindingDetail, keyof SecurityFinding>

const EXTRA: Record<string, Extra> = {
  sec_1: {
    project: "routing-gateway",
    language: "go",
    line: 18,
    cwe: "CWE-798",
    cweName: "Use of hard-coded credentials",
    rule: "gosec G101",
    remediation: [
      "Remove the fallback pair and fail fast when ADMIN_USER or ADMIN_PASSWORD is unset.",
      "Rotate the admin password in every environment that ever ran this seed script.",
      "Load bootstrap credentials from your secret manager in production.",
    ],
    excerpt: {
      file: "routing-gateway/scripts/seed.go:18",
      errorLine: 5,
      code: `func seedAdmin(db *sql.DB) error {
	user := os.Getenv("ADMIN_USER")
	pass := os.Getenv("ADMIN_PASSWORD")
	if user == "" || pass == "" {
		user, pass = "admin", "admin" // fallback for local dev
	}
	return createUser(db, user, hash(pass), RoleAdmin)
}`,
    },
    draft: {
      source: `package main

import (
	"database/sql"
	"os"
)

func seedAdmin(db *sql.DB) error {
	user := os.Getenv("ADMIN_USER")
	pass := os.Getenv("ADMIN_PASSWORD")
	if user == "" || pass == "" {
		user, pass = "admin", "admin" // fallback for local dev
	}
	return createUser(db, user, hash(pass), RoleAdmin)
}`,
      trace: `[routing-gateway/scripts/seed.go:18] - G101 (CWE-798): Potential hardcoded credentials (Confidence: HIGH, Severity: HIGH)
    17: 	if user == "" || pass == "" {
  > 18: 		user, pass = "admin", "admin" // fallback for local dev
    19: 	}`,
      context:
        "Security finding sec_1 (critical). Remove the admin/admin fallback: return a clear error when ADMIN_USER or ADMIN_PASSWORD is missing instead of seeding default credentials.",
    },
  },
  sec_2: {
    project: "auth-service",
    language: "java",
    line: 14,
    cwe: "CWE-347",
    cweName: "Improper verification of cryptographic signature",
    rule: "Dependency advisory · io.jsonwebtoken:jjwt 0.9.1",
    remediation: [
      "Upgrade to the jjwt 0.12 artifacts (jjwt-api, jjwt-impl, jjwt-jackson).",
      "Parse with parseSignedClaims() so unsigned tokens are rejected outright.",
      "Pin the expected algorithm (RS256) instead of trusting the token header.",
    ],
    excerpt: {
      file: "auth-service/src/main/java/com/acme/auth/TokenParser.java:14",
      errorLine: 9,
      code: `public class TokenParser {
    private final byte[] signingKey;

    public TokenParser(byte[] signingKey) {
        this.signingKey = signingKey;
    }

    public Claims parse(String token) {
        return Jwts.parser().setSigningKey(signingKey).parseClaimsJwt(token).getBody();
    }
}`,
    },
    draft: {
      source: `import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

public class TokenParser {
    private final byte[] signingKey;

    public TokenParser(byte[] signingKey) {
        this.signingKey = signingKey;
    }

    public Claims parse(String token) {
        return Jwts.parser().setSigningKey(signingKey).parseClaimsJwt(token).getBody();
    }
}`,
      trace: `Dependency advisory: io.jsonwebtoken:jjwt 0.9.1 (auth-service/pom.xml)
  Signature validation can be bypassed with a crafted token.
  Vulnerable API used at com.acme.auth.TokenParser.parse(TokenParser.java:14)`,
      context:
        "Security finding sec_2 (high). Move to the jjwt 0.12 API and make sure unsigned or tampered tokens are rejected.",
    },
  },
  sec_3: {
    project: "checkout-service",
    language: "typescript",
    line: 7,
    cwe: "CWE-209",
    cweName: "Error message containing sensitive information",
    rule: "OWASP ASVS 7.4.1",
    remediation: [
      "Return a generic message plus a request id; keep err.stack in the server log only.",
      'Only include debug detail when NODE_ENV === "development".',
    ],
    excerpt: {
      file: "checkout-service/src/middleware/errors.ts:7",
      errorLine: 7,
      code: `import type { ErrorRequestHandler } from "express"

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error(err)
  res.status(err.status ?? 500).json({
    error: err.message,
    stack: err.stack,
  })
}`,
    },
    draft: {
      source: `import type { ErrorRequestHandler } from "express"

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error(err)
  res.status(err.status ?? 500).json({
    error: err.message,
    stack: err.stack,
  })
}`,
      trace: `Security scan: CWE-209 information exposure through an error message
    at errorHandler (checkout-service/src/middleware/errors.ts:7:5)
  Response to GET /checkout/boom contained "stack": "TypeError: Cannot read properties of undefined (reading 'total')\\n    at applyDiscount (src/cart.ts:41:18) ..."`,
      context:
        "Security finding sec_3 (medium). Keep stacks in server logs; clients should get { error: 'Internal error', requestId } outside development.",
    },
  },
  sec_4: {
    project: "auth-service",
    language: "java",
    line: 22,
    cwe: "CWE-307",
    cweName: "Improper restriction of excessive authentication attempts",
    rule: "OWASP ASVS 2.2.1",
    remediation: [
      "Throttle per IP and per account (e.g. 5 reset requests an hour) with a token bucket.",
      "Answer 202 with identical timing whether or not the email exists.",
      "Alert on bursts of reset requests across many different accounts.",
    ],
    excerpt: {
      file: "auth-service/src/ResetController.java:22",
      errorLine: 6,
      code: `@RestController
@RequestMapping("/api/password-reset")
public class ResetController {

    @PostMapping
    public ResponseEntity<Void> requestReset(@RequestBody ResetRequest body) {
        users.findByEmail(body.email()).ifPresent(mailer::sendResetLink);
        return ResponseEntity.accepted().build();
    }
}`,
    },
    draft: {
      source: `@RestController
@RequestMapping("/api/password-reset")
public class ResetController {

    @PostMapping
    public ResponseEntity<Void> requestReset(@RequestBody ResetRequest body) {
        users.findByEmail(body.email()).ifPresent(mailer::sendResetLink);
        return ResponseEntity.accepted().build();
    }
}`,
      trace: `Security scan: CWE-307 no rate limit on POST /api/password-reset
    at com.acme.auth.ResetController.requestReset(ResetController.java:22)
  Probe: 500 requests in 10s from one IP were all answered 202; no throttling observed.`,
      context:
        "Security finding sec_4 (medium). Add per-IP and per-account throttling and keep responses identical for known and unknown emails.",
    },
  },
  sec_5: {
    project: "web-dashboard",
    language: "typescript",
    line: 31,
    cwe: "CWE-1333",
    cweName: "Inefficient regular expression complexity",
    rule: "npm audit · low",
    remediation: [
      "Bump chart-kit so its color parser resolves to the patched release.",
      "Until a patched chart-kit ships, add an overrides entry in package.json.",
      "Only user-supplied colour strings can reach the slow regex, so exposure is low.",
    ],
    excerpt: {
      file: "web-dashboard/package.json:31",
      errorLine: 4,
      code: `{
  "name": "web-dashboard",
  "dependencies": {
    "chart-kit": "4.2.1",
    "date-fns": "^3.6.0"
  }
}`,
    },
    draft: {
      source: `{
  "name": "web-dashboard",
  "dependencies": {
    "chart-kit": "4.2.1",
    "date-fns": "^3.6.0"
  },
  "overrides": {}
}`,
      trace: `# npm audit report

color-string  <1.5.5
Severity: low
Regular Expression Denial of Service (ReDoS)
fix available via \`npm audit fix\`
node_modules/chart-kit/node_modules/color-string
  chart-kit  4.0.0 - 4.2.1
  Depends on vulnerable versions of color-string`,
      context: "Security finding sec_5 (low). Resolve the transitive dependency to a patched version without upgrading unrelated packages.",
    },
  },
}

const MORE: FindingDetail[] = [
  {
    id: "sec_6",
    title: "Session cookie missing SameSite and Secure flags",
    severity: "medium",
    file: "web-dashboard/src/server/session.ts",
    description: "The session cookie can be sent on cross-site requests and over plain HTTP.",
    detectedAt: "2026-09-19",
    project: "web-dashboard",
    language: "typescript",
    line: 7,
    cwe: "CWE-1275",
    cweName: "Sensitive cookie with improper SameSite attribute",
    rule: "OWASP ASVS 3.4.3",
    remediation: [
      'Set sameSite: "lax" and secure: true on the session cookie.',
      'Enable app.set("trust proxy", 1) so Secure cookies work behind the load balancer.',
    ],
    excerpt: {
      file: "web-dashboard/src/server/session.ts:7",
      errorLine: 7,
      code: `import session from "express-session"

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
  },
})`,
    },
    draft: {
      source: `import session from "express-session"

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
  },
})`,
      trace: `Security scan: CWE-1275 session cookie "connect.sid" is missing SameSite and Secure
    at sessionMiddleware (web-dashboard/src/server/session.ts:7:3)
  Set-Cookie: connect.sid=s%3A…; Path=/; HttpOnly; Max-Age=28800`,
      context: "Security finding sec_6 (medium). Harden the cookie flags without breaking local development over http://localhost.",
    },
  },
  {
    id: "sec_7",
    title: "pprof debug handlers exposed on the public mux",
    severity: "low",
    file: "routing-gateway/cmd/gateway/main.go",
    description: "Importing net/http/pprof registers profiling endpoints on DefaultServeMux, which also serves traffic.",
    detectedAt: "2026-09-17",
    project: "routing-gateway",
    language: "go",
    line: 5,
    cwe: "CWE-489",
    cweName: "Active debug code",
    rule: "gosec G108",
    remediation: [
      "Serve pprof on a separate listener bound to 127.0.0.1:6060.",
      "Route public traffic through a dedicated http.NewServeMux().",
    ],
    excerpt: {
      file: "routing-gateway/cmd/gateway/main.go:5",
      errorLine: 3,
      code: `import (
	"net/http"
	_ "net/http/pprof"
)

func main() {
	mux := http.DefaultServeMux
	mux.Handle("/", gateway.New(cfg))
	log.Fatal(http.ListenAndServe(":8080", mux))
}`,
    },
    draft: {
      source: `package main

import (
	"log"
	"net/http"
	_ "net/http/pprof"
)

func main() {
	mux := http.DefaultServeMux
	mux.Handle("/", gateway.New(cfg))
	log.Fatal(http.ListenAndServe(":8080", mux))
}`,
      trace: `[routing-gateway/cmd/gateway/main.go:5] - G108 (CWE-489): Profiling endpoint is automatically exposed on /debug/pprof (Confidence: HIGH, Severity: HIGH)
  > 5: 	_ "net/http/pprof"`,
      context: "Security finding sec_7 (low). Keep pprof available for on-call, but only on a localhost-only listener.",
    },
  },
  {
    id: "sec_8",
    title: "yaml.load without SafeLoader in the fixture loader",
    severity: "low",
    file: "ingest-pipeline/ingest/fixtures.py",
    description: "yaml.Loader can construct arbitrary Python objects from a crafted file.",
    detectedAt: "2026-09-09",
    project: "ingest-pipeline",
    language: "python",
    line: 6,
    cwe: "CWE-502",
    cweName: "Deserialization of untrusted data",
    rule: "bandit B506",
    remediation: [
      "Use yaml.safe_load(): fixtures only need plain mappings and lists.",
      "Exposure is low: the loader only reads files from tests/fixtures in the repo.",
    ],
    excerpt: {
      file: "ingest-pipeline/ingest/fixtures.py:6",
      errorLine: 6,
      code: `import yaml


def load_fixture(path):
    with open(path) as fh:
        return yaml.load(fh, Loader=yaml.Loader)`,
    },
    draft: {
      source: `import yaml


def load_fixture(path):
    with open(path) as fh:
        return yaml.load(fh, Loader=yaml.Loader)`,
      trace: `>> Issue: [B506:yaml_load] Use of unsafe yaml load. Allows instantiation of arbitrary objects. Consider yaml.safe_load().
   Severity: Medium   Confidence: High
   CWE: CWE-20 (https://cwe.mitre.org/data/definitions/20.html)
   Location: ingest/fixtures.py:6:15`,
      context: "Security finding sec_8 (low). Switch to safe loading without changing the fixture format.",
    },
  },
]

export const FINDINGS: FindingDetail[] = [
  ...securityFindings.map((f) => ({ ...f, ...EXTRA[f.id] })),
  ...MORE,
]

/** Surfaced by the first re-scan of the session. */
export const RESCAN_FINDING: FindingDetail = {
  id: "sec_9",
  title: "Permissive CORS policy on /internal/metrics",
  severity: "medium",
  file: "routing-gateway/internal/metrics/handler.go",
  description: "Any origin may read the metrics endpoint with credentials, exposing internal hostnames and traffic volumes.",
  detectedAt: "2026-09-24",
  project: "routing-gateway",
  language: "go",
  line: 12,
  cwe: "CWE-942",
  cweName: "Permissive cross-domain policy",
  rule: "OWASP ASVS 14.5.3",
  isNew: true,
  remediation: [
    "Drop the wildcard origin; allow only the internal dashboard origin.",
    "Never combine Access-Control-Allow-Origin: * with Allow-Credentials: true.",
  ],
  excerpt: {
    file: "routing-gateway/internal/metrics/handler.go:12",
    errorLine: 2,
    code: `func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	h.writeMetrics(w)
}`,
  },
  draft: {
    source: `package metrics

import "net/http"

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	h.writeMetrics(w)
}`,
    trace: `Security scan: CWE-942 permissive CORS policy on GET /internal/metrics
    at (*Handler).ServeHTTP (routing-gateway/internal/metrics/handler.go:12)
  Access-Control-Allow-Origin: *   Access-Control-Allow-Credentials: true`,
    context: "Security finding sec_9 (medium). Restrict CORS to the internal dashboard origin.",
  },
}

// ---------------------------------------------------------------------------
// Trend: open findings per week, by severity (the last week is "now")
// ---------------------------------------------------------------------------

export interface TrendPoint {
  week: string
  critical: number
  high: number
  medium: number
  low: number
}

export const FINDINGS_TREND: TrendPoint[] = [
  { week: "Jul 6", critical: 3, high: 4, medium: 7, low: 6 },
  { week: "Jul 13", critical: 3, high: 4, medium: 6, low: 6 },
  { week: "Jul 20", critical: 2, high: 4, medium: 6, low: 5 },
  { week: "Jul 27", critical: 2, high: 3, medium: 6, low: 5 },
  { week: "Aug 3", critical: 2, high: 3, medium: 5, low: 5 },
  { week: "Aug 10", critical: 1, high: 3, medium: 5, low: 4 },
  { week: "Aug 17", critical: 1, high: 2, medium: 5, low: 4 },
  { week: "Aug 24", critical: 1, high: 2, medium: 4, low: 4 },
  { week: "Aug 31", critical: 0, high: 2, medium: 4, low: 3 },
  { week: "Sep 7", critical: 0, high: 1, medium: 4, low: 3 },
  { week: "Sep 14", critical: 0, high: 1, medium: 3, low: 3 },
  { week: "Sep 21", critical: 1, high: 1, medium: 3, low: 3 },
]

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export const SCAN_STEPS = [
  { project: "checkout-service", detail: "1,284 files · 312 npm packages" },
  { project: "ingest-pipeline", detail: "642 files · 88 PyPI packages" },
  { project: "routing-gateway", detail: "418 files · 57 Go modules" },
  { project: "web-dashboard", detail: "2,106 files · 941 npm packages" },
  { project: "auth-service", detail: "733 files · 146 Maven artifacts" },
]

export const LAST_SCAN = "Sep 24, 06:00"

/** Stable radar position for a finding: angle in degrees, radius as 0..1 of the scope. */
export function blipPosition(id: string) {
  const rand = createRng(hashSeed(id))
  return { angle: rand() * 360, radius: 0.28 + rand() * 0.6 }
}
