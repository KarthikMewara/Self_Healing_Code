// Per-browser conveniences for the mock sign-in: the email saved by
// "Remember me" and the last method used (shown as a "Last used" hint).
// Storage can be unavailable (private mode, blocked site data), so every
// access is guarded and the forms work fine without it.

import type { AuthUser } from "@/types/contract"

export type SignInMethod = "email" | "github" | "google"

const REMEMBERED_EMAIL_KEY = "shad:remembered-email"
const LAST_METHOD_KEY = "shad:last-sign-in"
const AUTH_USER_KEY = "self_healing:active-user"

export function getActiveUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
    window.dispatchEvent(new Event("auth-changed"))
  } catch {
    // Non-fatal.
  }
}

export function clearActiveUser() {
  setActiveUser(null)
}

export function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""
  } catch {
    return ""
  }
}

export function writeRememberedEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  } catch {
    // Non-fatal: the email just won't be prefilled next time.
  }
}

export function readLastSignInMethod(): SignInMethod | null {
  try {
    const value = localStorage.getItem(LAST_METHOD_KEY)
    return value === "email" || value === "github" || value === "google" ? value : null
  } catch {
    return null
  }
}

export function writeLastSignInMethod(method: SignInMethod) {
  try {
    localStorage.setItem(LAST_METHOD_KEY, method)
  } catch {
    // Non-fatal.
  }
}

/** Touch-first devices shouldn't get the on-screen keyboard thrown at them on load. */
export function prefersAutoFocus() {
  return typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches
}
