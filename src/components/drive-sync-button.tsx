"use client"

import { useEffect, useState } from "react"
import { useStore } from "react-redux"
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isSignedIn, onAuthChange, signIn, signOut } from "@/lib/drive"
import { onStatus, pullOnce, pushNow, type SyncStatus } from "@/lib/drive-sync"
import type { AppStore } from "@/lib/store"

export function DriveSyncButton() {
  const store = useStore() as AppStore
  const [signed, setSigned] = useState(false)
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSigned(isSignedIn())
    const offAuth = onAuthChange(setSigned)
    const offStatus = onStatus(setStatus)
    return () => {
      offAuth()
      offStatus()
    }
  }, [])

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signIn()
      await pullOnce(store)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  const handleSync = async () => {
    setBusy(true)
    try {
      await pullOnce(store)
      await pushNow(store)
    } finally {
      setBusy(false)
    }
  }

  if (!signed) {
    return (
      <Button variant="outline" size="sm" onClick={handleSignIn} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <CloudOff />}
        Connect Drive
      </Button>
    )
  }

  const icon =
    status.kind === "pulling" || status.kind === "pushing" || busy ? (
      <Loader2 className="animate-spin" />
    ) : status.kind === "error" ? (
      <AlertCircle />
    ) : (
      <Cloud />
    )

  const label =
    status.kind === "pulling"
      ? "Pulling…"
      : status.kind === "pushing"
        ? "Pushing…"
        : status.kind === "error"
          ? "Sync error"
          : "Synced"

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={busy}
        title={status.kind === "error" ? status.message : label}
      >
        {icon}
        {label}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={busy}>
        Sign out
      </Button>
    </div>
  )
}
