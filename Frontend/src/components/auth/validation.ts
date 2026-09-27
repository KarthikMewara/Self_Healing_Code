// Client-side rules for the auth and security forms. Auth isn't built on the
// backend yet, so these checks are the whole story for now. Messages stay
// short, specific and tell the user what to do next.

// A label-per-dot domain with a 2+ character TLD: name@company.com, a@b.co.
const EMAIL_PATTERN = /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/

export function validateEmail(value: string, emptyMessage = "Enter your email address.") {
  const email = value.trim()
  if (!email) return emptyMessage
  if (!EMAIL_PATTERN.test(email)) return "That email doesn't look right. Try name@company.com."
  return null
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
])

/** True for well-known consumer mail providers (a hint, never a hard block). */
export function isPersonalEmail(value: string) {
  const domain = value.trim().toLowerCase().split("@")[1]
  return Boolean(domain && PERSONAL_DOMAINS.has(domain))
}

export function validateName(value: string) {
  const name = value.trim()
  if (!name) return "Enter your full name."
  if (name.length < 2) return "That name looks a little short."
  return null
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export type PasswordRuleId = "length" | "number" | "upper" | "symbol"

export interface PasswordRule {
  id: PasswordRuleId
  /** Checklist label. */
  label: string
  /** Used inside a sentence: "Your password needs a number". */
  phrase: string
  test: (value: string) => boolean
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: "8+ characters", phrase: "at least 8 characters", test: (v) => v.length >= 8 },
  { id: "number", label: "A number", phrase: "a number", test: (v) => /\d/.test(v) },
  { id: "upper", label: "An uppercase letter", phrase: "an uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "symbol", label: "A symbol", phrase: "a symbol", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
]

// Fragments that make an otherwise rule-abiding password easy to guess.
const COMMON_FRAGMENTS = ["password", "passw0rd", "123456", "qwerty", "letmein", "welcome", "iloveyou", "admin", "abc123", "111111"]

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export const STRENGTH_LABELS: Record<StrengthScore, string> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
}

export interface PasswordAssessment {
  met: Record<PasswordRuleId, boolean>
  missing: PasswordRule[]
  /** 0 = empty, 1-4 = Weak..Strong. */
  score: StrengthScore
  label: string
  /** Contains a very common word or sequence. */
  common: boolean
}

export function assessPassword(value: string): PasswordAssessment {
  const met = {} as Record<PasswordRuleId, boolean>
  for (const rule of PASSWORD_RULES) met[rule.id] = rule.test(value)
  const missing = PASSWORD_RULES.filter((rule) => !met[rule.id])
  const lower = value.toLowerCase()
  const common = value.length > 0 && COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment))

  let score = value ? Math.max(1, PASSWORD_RULES.length - missing.length) : 0
  if (value && !met.length) score = Math.min(score, 1)
  if (common) score = Math.min(score, 2)

  const safe = score as StrengthScore
  return { met, missing, score: safe, label: STRENGTH_LABELS[safe], common }
}

/** "a, b and c" */
export function joinWithAnd(parts: string[]) {
  if (parts.length <= 1) return parts.join("")
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

/** Validation for a brand-new password (register, change password). */
export function validateNewPassword(value: string, emptyMessage = "Create a password.") {
  if (!value) return emptyMessage
  const { missing } = assessPassword(value)
  if (missing.length) return `Your password needs ${joinWithAnd(missing.map((rule) => rule.phrase))}.`
  return null
}

export function validateConfirmation(password: string, confirmation: string) {
  if (!confirmation) return "Confirm your password."
  if (confirmation !== password) return "Passwords don't match."
  return null
}

/** "Jordan Avery" -> "JA", "cher" -> "C". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ""
  const first = words[0][0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : ""
  return (first + last).toUpperCase()
}
