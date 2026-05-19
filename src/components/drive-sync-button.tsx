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

type DisconnectedSub =
  | { kind: "offline" }
  | { kind: "unsigned" }
  | { kind: "error"; message?: string }

export function DriveSyncButton() {
  const store = useStore() as AppStore
  const dispatch = useAppDispatch()
  const autoSync = useAppSelector((s) => s.settings.driveAutoSync)
  const [signed, setSigned] = useState(false)
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" })
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setSigned(isSignedIn())
    const offAuth = onAuthChange(setSigned)
    const offStatus = onStatus(setStatus)
    return () => {
      offAuth()
      offStatus()
    }
  }, [])

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
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

  const sub: DisconnectedSub | null = !online
    ? { kind: "offline" }
    : !signed
      ? { kind: "unsigned" }
      : status.kind === "error"
        ? { kind: "error", message: status.message }
        : null

  const disconnected = sub !== null

  if (disconnected && sub) {
    const icon = busy ? (
      <Loader2 className="animate-spin" />
    ) : sub.kind === "error" ? (
      <AlertCircle />
    ) : (
      <CloudOff />
    )

    const label =
      sub.kind === "offline"
        ? "Offline"
        : sub.kind === "unsigned"
          ? "Connect Drive"
          : "Sync failed — Retry"

    const onClick =
      sub.kind === "offline"
        ? undefined
        : sub.kind === "unsigned"
          ? handleSignIn
          : handleSync

    const title =
      sub.kind === "offline"
        ? "No internet connection"
        : sub.kind === "error"
          ? sub.message
          : undefined

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={busy || sub.kind === "offline"}
        title={title}
        className="w-full"
      >
        {icon}
        {label}
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
