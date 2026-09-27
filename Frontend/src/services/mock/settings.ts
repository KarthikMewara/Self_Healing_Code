// Sample data for Settings. There is no backend for profiles, 2FA or API keys
// yet, so everything here is local and every "save" in the UI is simulated.
// Nothing in this file is a real credential.

export interface ApiKey {
  id: string
  name: string
  /** The first characters of the key -- safe to display after creation. */
  prefix: string
  /** ISO date (yyyy-mm-dd). */
  createdAt: string
  /** Human-readable last use, or null when the key has never been used. */
  lastUsed: string | null
  /** Generated during this visit: unused, but not stale. */
  isNew?: boolean
}

/** Every generated key starts with this, so it can never be mistaken for a live one. */
export const API_KEY_PREFIX = "shad_test_"

export const initialApiKeys: ApiKey[] = [
  { id: "key_ci", name: "GitHub Actions CI", prefix: "shad_test_4f2a", createdAt: "2026-08-02", lastUsed: "2 hours ago" },
  { id: "key_local", name: "Local dev", prefix: "shad_test_9c1e", createdAt: "2026-06-14", lastUsed: "3 days ago" },
  { id: "key_staging", name: "Staging deploy hook", prefix: "shad_test_b72d", createdAt: "2026-05-30", lastUsed: null },
]

export const API_KEY_NAME_SUGGESTIONS = [
  "GitHub Actions CI",
  "Local dev",
  "Staging deploy hook",
  "Nightly regression run",
  "Pre-commit hook",
]

// No look-alike characters (0/O, 1/l/I) so a key read aloud is unambiguous.
const KEY_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomString(length: number, alphabet: string) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ""
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out
}

/** A random, clearly fake key: `shad_test_` + 32 characters. */
export function generateFakeApiKey() {
  return API_KEY_PREFIX + randomString(32, KEY_ALPHABET)
}

/**
 * The manual-entry secret shown during the (mock) 2FA setup. It's the well-known
 * example secret from authenticator documentation, not one tied to any account.
 */
export const TOTP_DEMO_SECRET = "JBSW Y3DP EHPK 3PXP"

/** One-time recovery codes in the familiar `xxxx-xxxx` shape. */
export function generateRecoveryCodes(count = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: count }, () => `${randomString(4, alphabet)}-${randomString(4, alphabet)}`)
}

export const accountMeta = {
  memberSince: "June 2026",
  passwordLastChanged: "3 months ago",
}
