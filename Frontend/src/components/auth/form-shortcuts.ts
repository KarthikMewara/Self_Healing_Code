import type { KeyboardEvent } from "react"

/** onKeyDown for a <form>: Ctrl/⌘ + S submits it (instead of saving the web page). */
export function submitOnModS(e: KeyboardEvent<HTMLFormElement>) {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
    e.preventDefault()
    e.currentTarget.requestSubmit()
  }
}
