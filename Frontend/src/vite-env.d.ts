/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the healing backend. Unset → the built-in simulation runs. */
  readonly VITE_HEAL_API_URL?: string
  /** Optional Bearer token for local testing until real auth issues one. */
  readonly VITE_HEAL_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
