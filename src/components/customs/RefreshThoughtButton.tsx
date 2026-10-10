"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import { useSignedIn } from "@/hooks/useSignedIn";
import { refreshNow } from "@/lib/cloud-sync";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";
import type { AppStore } from "@/stores/store";

type Phase = "idle" | "refreshing" | "failed";

/**
 * "Refresh": pulls the cloud copy so a thought and its comments show what the
 * Plan API (an agent, another device) wrote since the last sync. Only pulls —
 * nothing on screen is saved or pushed. Unsaved thought edits are kept; an
 * untouched thought editor takes the new text (`useAdoptSavedThought`).
 * Hidden while signed out: there is no cloud copy to read.
 *
 * @param showLabel - Render "Refresh" next to the icon instead of icon-only.
 * @param data-testid - Test id of the button.
 */
export function RefreshThoughtButton({
  showLabel = false,
  className,
  "data-testid": testId,
}: {
  showLabel?: boolean;
  className?: string;
  "data-testid"?: string;
}) {
  const store = useStore() as AppStore;
  const signed = useSignedIn();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "failed") {
      return;
    }
    const t = window.setTimeout(() => setPhase("idle"), 3000);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!signed) {
    return null;
  }

  const label = "Refresh thought and comments";

  return (
    <button
      type="button"
      aria-label={label}
      title={phase === "failed" ? "Refresh failed. Try again." : label}
      data-testid={testId}
      disabled={phase === "refreshing"}
      onClick={async (e) => {
        e.stopPropagation();
        setPhase("refreshing");
        setPhase((await refreshNow(store)) ? "idle" : "failed");
      }}
      className={cn(
        showLabel
          ? "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-app-dim transition-colors hover:bg-app-hover hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:pointer-events-none"
          : cn(ui.iconBtn, "size-6"),
        "[&_svg]:size-3.5",
        phase === "failed" && "text-app-error",
        className,
      )}
    >
      {phase === "failed" ? (
        <AlertCircle />
      ) : (
        <RotateCw className={cn(phase === "refreshing" && "animate-spin")} />
      )}
      {showLabel && (
        <span>
          {phase === "refreshing" ? "Refreshing…" : phase === "failed" ? "Failed" : "Refresh"}
        </span>
      )}
    </button>
  );
}
