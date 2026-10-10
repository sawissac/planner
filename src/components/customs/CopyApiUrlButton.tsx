"use client";

import { AlertCircle, Check, Link2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import { useSignedIn } from "@/hooks/useSignedIn";
import { copyTextAfter } from "@/lib/clipboard";
import { syncNow } from "@/lib/cloud-sync";
import { cn } from "@/lib/cn";
import { saveDrafts } from "@/lib/drafts";
import { planContext } from "@/lib/plan-api-url";
import * as ui from "@/lib/ui-styles";
import { useAppSelector } from "@/stores/hooks";
import type { AppStore } from "@/stores/store";

type Phase = "idle" | "syncing" | "copied" | "failed";

/**
 * "Copy context": copies the third-party Plan API link of a task's thought,
 * or of one comment when `commentId` is given — a clean link like Figma's
 * "Copy link to selection", under a one-line ask (`planContext`).
 *
 * The Plan API reads the cloud copy, so the button first saves the task's
 * open drafts (thought, comment edits, a written new comment — `saveDrafts`),
 * then syncs, and copies only once that succeeded — an agent opening the
 * link right away sees what is on screen.
 * Hidden while signed out: there is no cloud copy to read.
 *
 * The link carries no secret: the agent's `planner.sh` reads the key from the
 * file `planner.sh login` wrote, so it is safe to paste into a chat with an
 * AI agent. The key itself is copied once from Settings → API keys.
 *
 * @param todoId - Task whose thought (or comment) the URL points at.
 * @param commentId - Comment id; omit for the task/thought URL.
 * @param showLabel - Render "Copy context" next to the icon instead of icon-only.
 */
export function CopyApiUrlButton({
  todoId,
  commentId,
  showLabel = false,
  className,
}: {
  todoId: string;
  commentId?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const store = useStore() as AppStore;
  const signed = useSignedIn();
  const fileId = useAppSelector((s) => s.todos.activeFileId);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "copied" && phase !== "failed") {
      return;
    }
    const t = window.setTimeout(() => setPhase("idle"), phase === "failed" ? 3000 : 1500);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!signed) {
    return null;
  }

  const label = commentId ? "Copy comment context" : "Copy thought context";
  const testId = commentId
    ? `thought-comment-${commentId}-api-url-button`
    : `todo-${todoId}-thought-api-url-button`;
  const text =
    phase === "syncing"
      ? "Syncing…"
      : phase === "copied"
        ? "Copied"
        : phase === "failed"
          ? "Sync failed"
          : "Copy context";

  return (
    <button
      type="button"
      aria-label={label}
      title={phase === "failed" ? "Sync failed — nothing copied. Try again." : label}
      data-testid={testId}
      disabled={phase === "syncing"}
      onClick={async (e) => {
        e.stopPropagation();
        setPhase("syncing");
        // Synchronous, so the clipboard write below still runs in the click.
        saveDrafts(todoId);
        const synced = syncNow(store).then((ok) => {
          if (!ok) {
            throw new Error("sync failed");
          }
        });
        try {
          await copyTextAfter(synced, planContext(todoId, fileId, commentId));
          setPhase("copied");
        } catch {
          setPhase("failed");
        }
      }}
      className={cn(
        showLabel
          ? "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-app-dim transition-colors hover:bg-app-hover hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:pointer-events-none"
          : cn(ui.iconBtn, "size-6"),
        "[&_svg]:size-3.5",
        phase === "copied" && "text-app-accent",
        phase === "failed" && "text-app-error",
        className,
      )}
    >
      {phase === "syncing" ? (
        <Loader2 className="animate-spin" />
      ) : phase === "copied" ? (
        <Check />
      ) : phase === "failed" ? (
        <AlertCircle />
      ) : (
        <Link2 />
      )}
      {showLabel && <span>{text}</span>}
    </button>
  );
}
