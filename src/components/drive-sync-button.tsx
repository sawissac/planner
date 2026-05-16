"use client"

import { useEffect, useState } from "react"
import { useStore } from "react-redux"
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { isSignedIn, onAuthChange, signIn, signOut } from "@/lib/drive"
import { onStatus, pullOnce, pushNow, type SyncStatus } from "@/lib/drive-sync"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { setDriveAutoSync } from "@/lib/settingsSlice"
import type { AppStore } from "@/lib/store"

export function DriveSyncButton() {
  const store = useStore() as AppStore
  const dispatch = useAppDispatch()
  const autoSync = useAppSelector((s) => s.settings.driveAutoSync)
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
      <Button variant="outline" size="sm" onClick={handleSignIn} disabled={busy} className="w-full">
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
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={busy}
          title={status.kind === "error" ? status.message : label}
          className="flex-1"
        >
          {icon}
          {label}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={busy} className="flex-1">
          Sign out
        </Button>
      </div>
      <label className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground cursor-pointer select-none">
        <span>Auto-save to Drive</span>
        <Switch
          checked={autoSync}
          onCheckedChange={(v) => dispatch(setDriveAutoSync(v))}
          aria-label="Toggle Drive auto-save"
        />
      </label>
    </div>
  )
}
