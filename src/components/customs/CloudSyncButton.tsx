"use client";

import { AlertCircle, Cloud, CloudOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { onStatus, pullOnce, pushNow, type SyncStatus } from "@/lib/cloud-sync";
import { isSignedIn, onAuthChange, signOut } from "@/lib/cloud-sync-backend";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setCloudAutoSync } from "@/stores/slices/settingsSlice";
import type { AppStore } from "@/stores/store";

type DisconnectedSub =
  | { kind: "offline" }
  | { kind: "unsigned" }
  | { kind: "error"; message?: string };

export function CloudSyncButton() {
  const store = useStore() as AppStore;
  const dispatch = useAppDispatch();
  const autoSync = useAppSelector((s) => s.settings.cloudAutoSync);
  const [signed, setSigned] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setSigned(isSignedIn());
    const offAuth = onAuthChange(setSigned);
    const offStatus = onStatus(setStatus);
    return () => {
      offAuth();
      offStatus();
    };
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      await pullOnce(store);
      await pushNow(store);
    } finally {
      setBusy(false);
    }
  };

  const sub: DisconnectedSub | null = !online
    ? { kind: "offline" }
    : !signed
      ? { kind: "unsigned" }
      : status.kind === "error"
        ? { kind: "error", message: status.message }
        : null;

  if (sub) {
    const icon = busy ? (
      <Loader2 className="animate-spin" />
    ) : sub.kind === "error" ? (
      <AlertCircle />
    ) : (
      <CloudOff />
    );

    const label =
      sub.kind === "offline"
        ? "Offline"
        : sub.kind === "unsigned"
          ? "Connect account"
          : "Sync failed — Retry";

    const title =
      sub.kind === "offline"
        ? "No internet connection"
        : sub.kind === "error"
          ? sub.message
          : undefined;

    if (sub.kind === "unsigned") {
      return (
        <Button
          render={<Link href="/login" aria-label="Sign in to sync" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {icon}
          {label}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={sub.kind === "offline" ? undefined : handleSync}
        disabled={busy || sub.kind === "offline"}
        title={title}
        aria-label={sub.kind === "offline" ? "Sync offline" : "Retry cloud sync"}
        className="w-full"
      >
        {icon}
        {label}
      </Button>
    );
  }

  const icon =
    status.kind === "pulling" || status.kind === "pushing" || busy ? (
      <Loader2 className="animate-spin" />
    ) : (
      <Cloud />
    );

  const label =
    status.kind === "pulling" ? "Pulling…" : status.kind === "pushing" ? "Pushing…" : "Synced";

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={busy}
          title={label}
          className="flex-1"
        >
          {icon}
          {label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={busy}
          className="flex-1"
        >
          Sign out
        </Button>
      </div>
      <label className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground cursor-pointer select-none">
        <span>Auto-save to cloud</span>
        <Switch
          checked={autoSync}
          onCheckedChange={(v) => dispatch(setCloudAutoSync(v))}
          aria-label="Toggle cloud auto-save"
        />
      </label>
    </div>
  );
}
