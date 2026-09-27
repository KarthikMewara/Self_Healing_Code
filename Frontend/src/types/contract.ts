// Mirrors the backend team's API contract exactly (POST /api/v1/heal, POST /api/v1/chat).
// These types are the integration boundary -- src/services/heal-api.ts is the only
// file that should need to change when the real backend comes online.

export type HealStep = "retrieval" | "analysis" | "generation" | "testing"

export interface HealRequest {
  language: string
  source_code: string
  error_trace: string
  user_context?: string
}

export interface HealStatusEvent {
  step: HealStep
  message: string
}

export interface HealCompletePayload {
  session_id: string
  original_code: string
  fixed_code: string
  explanation: string
}

export interface HealErrorEvent {
  message: string
}

export interface ChatRequest {
  session_id: string
  message: string
}

export interface ChatResponse {
  reply_markdown: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "go",
  "java",
  "csharp",
  "ruby",
  "php",
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export interface LiveHistoryItem {
  session_id: string
  original_code: string
  fixed_code: string
  explanation: string
}

export interface TrainingStatsResponse {
  status: string
  total_embedded_fixes: number
  analytics: {
    language_distribution: {
      python: number
      javascript: number
      [key: string]: number
    }
    error_categories: {
      syntax_failures: number
      logic_optimizations: number
      [key: string]: number
    }
  }
}

export interface SearchHistoricalFixesResponse {
  status: string
  matches: string[]
  metadata: Record<string, any>[]
}

export interface CompanyTenant {
  id: string
  name: string
  domain: string
  cluster: string
  model: string
  vectorCount: number
  badgeColor: string
  description: string
}

export interface UserSession {
  email: string
  name: string
  department: string
  role: string
  company: CompanyTenant
  token?: string
  connectedAt: string
}

export interface TrainingRecord {
  id: string
  companyId: string
  title: string
  language: string
  category: string
  buggyCode: string
  errorMessage: string
  patchCode: string
  status: 'indexed' | 'training' | 'queued'
  timestamp: string
  astNodes: number
  vectorId: string
}

export interface TrainingRun {
  id: string
  version: string
  companyId: string
  recordCount: number
  accuracyScore: number
  duration: string
  status: 'active' | 'evaluating' | 'completed'
  timestamp: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  picture?: string
  provider: 'google' | 'github' | 'email'
  company_tenant?: string
  created_at?: string
  last_login?: string
  login_count?: number
}

export interface AuthLoginLog {
  id: number
  user_id: string
  email: string
  name: string
  provider: string
  timestamp: string
}

export interface AuthStatsResponse {
  status: string
  total_users: number
  total_logins: number
  recent_logs: AuthLoginLog[]
  users: AuthUser[]
}
