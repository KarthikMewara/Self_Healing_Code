import { Check, Copy } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  // Fallback for non-secure contexts.
  const area = document.createElement("textarea")
  area.value = value
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand("copy")
  area.remove()
  if (!ok) throw new Error("Copy failed")
}

interface CopyButtonProps {
  value: string
  label?: string
  copiedLabel?: string
  /** Toast on success (omit for none). */
  toastMessage?: string
  size?: "sm" | "default" | "icon-sm"
  variant?: "outline" | "ghost" | "secondary" | "default"
  className?: string
  onCopied?: () => void
  autoFocus?: boolean
  "aria-label"?: string
}

/** Copies `value`; the icon flips to a check and the label to "Copied" for a moment. */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  toastMessage,
  size = "sm",
  variant = "outline",
  className,
  onCopied,
  autoFocus,
  "aria-label": ariaLabel,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const iconOnly = size === "icon-sm"

  const copy = async () => {
    try {
      await writeClipboard(value)
      setCopied(true)
      onCopied?.()
      if (toastMessage) toast.success(toastMessage)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Couldn't copy automatically", { description: "Select the text and copy it manually." })
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        autoFocus={autoFocus}
        onClick={copy}
        aria-label={ariaLabel ?? (iconOnly ? label : undefined)}
        className={cn(copied && "text-success hover:text-success", className)}
      >
        <span className="relative inline-flex size-3.5 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? "check" : "copy"}
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {copied ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : <Copy aria-hidden className="size-3.5" />}
            </motion.span>
          </AnimatePresence>
        </span>
        {!iconOnly && <span>{copied ? copiedLabel : label}</span>}
      </Button>
      {/* Outside the button: a button's children are presentational to assistive tech. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  )
}
