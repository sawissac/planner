"use client"

import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type PromptState = {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  onConfirm?: (value: string) => void
}

function PromptForm({
  state,
  onClose,
}: {
  state: PromptState
  onClose: () => void
}) {
  const [value, setValue] = useState(state.defaultValue ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const v = value.trim()
    if (!v) return
    state.onConfirm?.(v)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{state.title}</DialogTitle>
        {state.description && (
          <DialogDescription>{state.description}</DialogDescription>
        )}
      </DialogHeader>
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={state.placeholder}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!value.trim()}>
          {state.confirmLabel ?? "OK"}
        </Button>
      </DialogFooter>
    </>
  )
}

export function PromptDialog({
  state,
  onOpenChange,
}: {
  state: PromptState
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        {state.open && (
          <PromptForm state={state} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
