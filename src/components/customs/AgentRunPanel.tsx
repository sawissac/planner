"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCircleQuestion,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { MessageResponse } from "@/components/ai-elements/message";
import { useAgentRun } from "@/hooks/useAgentRun";
import { useSignedIn } from "@/hooks/useSignedIn";
import { onOwnedRunsChange, ownsAgentRun, stopAgentRun } from "@/lib/agent-launch";
import {
  type AgentRun,
  type Approval,
  clearAgentRun,
  isActive,
  type RunStatus,
  type RunStep,
  sortedSteps,
} from "@/lib/agent-runs";
import { answerPermission, getServer } from "@/lib/agent-servers";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";
import { useAppSelector } from "@/stores/hooks";

const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Working…",
  waiting: "Needs you",
  done: "Done",
  failed: "Failed",
};

function StatusIcon({ status }: { status: RunStatus }) {
  switch (status) {
    case "running":
      return <Loader2 className="size-3.5 animate-spin text-app-accent" />;
    case "waiting":
      return <MessageCircleQuestion className="size-3.5 text-app-warn" />;
    case "done":
      return <CheckCircle2 className="size-3.5 text-app-accent" />;
    case "failed":
      return <AlertCircle className="size-3.5 text-app-error" />;
  }
}

function fmtTime(ts: number | undefined): string {
  return ts ? new Date(ts).toLocaleTimeString(undefined, { timeStyle: "short" }) : "";
}

function StepRow({ step }: { step: RunStep }) {
  switch (step.kind) {
    case "info":
      return <p className={ui.meta}>{step.text}</p>;
    case "step":
      return (
        <div className="flex min-w-0 items-start gap-1.5 text-xs text-app-text">
          <ChevronRight className="mt-0.5 size-3 shrink-0 text-app-dim" />
          <MessageResponse className="min-w-0 text-xs">{step.text}</MessageResponse>
        </div>
      );
    case "ask":
      return (
        <div className="flex items-start gap-1.5 rounded-md bg-app-warn/10 p-2 text-xs text-app-warn">
          <MessageCircleQuestion className="mt-px size-3.5 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">Needs you</span>
            <MessageResponse className="text-xs text-app-text">{step.text}</MessageResponse>
          </div>
        </div>
      );
    case "permission":
      return (
        <div
          className="flex min-w-0 items-start gap-1.5 text-xs text-app-warn"
          title={`Asked to run ${step.tool ?? "a tool"}`}
        >
          <ShieldAlert className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 font-mono break-all whitespace-pre-wrap">
            <span className="sr-only">Asked to run </span>
            <span className="font-semibold">{step.tool ?? "Tool"}</span>
            {step.text && <span className="text-app-dim"> · {step.text}</span>}
          </span>
        </div>
      );
    case "result":
      return (
        <div className="flex items-start gap-1.5 rounded-md border border-app-border-accent bg-app-accent-faint p-2 text-xs">
          <CheckCircle2 className="mt-px size-3.5 shrink-0 text-app-accent" />
          <MessageResponse className="min-w-0 text-xs text-app-text">{step.text}</MessageResponse>
        </div>
      );
    case "error":
      return (
        <p className="flex items-start gap-1.5 rounded-md bg-app-error/10 p-2 text-xs whitespace-pre-wrap text-app-error">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {step.text}
        </p>
      );
  }
}

/**
 * A tool call the agent is paused on (Run agent runs): what it wants to run
 * and Allow / Deny. The answer goes straight to the Claude Code bridge on
 * this computer (`answerPermission`); the run's own tab then records it, and
 * the prompt goes away once the record says it was answered.
 */
function ApprovalPrompt({ requestId, approval }: { requestId: string; approval: Approval }) {
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (allow: boolean) => {
    setBusy(allow ? "allow" : "deny");
    setError(null);
    try {
      const server = await getServer("claude-code");
      if (!server) {
        throw new Error("No Claude Code server in Settings → API keys.");
      }
      await answerPermission(server, approval.bridgeRunId, requestId, allow);
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : String(e)} Answer from the computer running the agent.`,
      );
      setBusy(null);
    }
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-app-warn bg-app-warn/10 p-2.5"
      role="alertdialog"
      aria-label={`Allow ${approval.tool}?`}
      data-testid={`agent-run-approval-${requestId}`}
    >
      <div className="flex min-w-0 items-start gap-1.5 text-xs">
        <ShieldAlert className="mt-px size-3.5 shrink-0 text-app-warn" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold text-app-text">
            Allow {approval.tool}? The agent is waiting for you.
          </span>
          {approval.detail && (
            <code className="rounded bg-app-bg px-1.5 py-1 font-mono text-[11px] break-all whitespace-pre-wrap text-app-text">
              {approval.detail}
            </code>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void answer(false)}
          disabled={busy !== null}
          className={cn(ui.ghostBtn, "h-7 text-app-error")}
          data-testid={`agent-run-approval-${requestId}-deny`}
        >
          {busy === "deny" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ShieldX className="size-3" />
          )}
          Deny
        </button>
        <button
          type="button"
          onClick={() => void answer(true)}
          disabled={busy !== null}
          className={cn(ui.solidBtn, "h-7")}
          data-testid={`agent-run-approval-${requestId}-allow`}
        >
          {busy === "allow" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ShieldCheck className="size-3" />
          )}
          Allow
        </button>
      </div>
      {error && (
        <p className="text-xs text-app-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** How long a "done" toast stays up, counted only while the tab is visible and the toast isn't hovered or focused. */
const TOAST_MS = 8000;

/**
 * Toast, bottom right, that pops once when a watched run ends — its own
 * floating card, not a dialog: no scrim, no focus grab, a status-colored
 * edge, the agent and task, its outcome, and Close. A finished run fades
 * after {@link TOAST_MS} (the bar along the bottom counts down, paused on
 * hover, focus or a hidden tab); a failed one stays until closed.
 */
function AgentRunFinishedToast({
  run,
  taskTitle,
  onClose,
}: {
  run: AgentRun | null;
  taskTitle?: string;
  onClose: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<Animation | null>(null);
  const failed = run?.status === "failed";
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!run || failed || !barRef.current) {
      return;
    }
    const timer = barRef.current.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: TOAST_MS,
      fill: "forwards",
    });
    timer.onfinish = () => closeRef.current();
    timerRef.current = timer;
    const onVisibility = () => (document.hidden ? timer.pause() : timer.play());
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      timer.cancel();
      timerRef.current = null;
    };
  }, [run, failed]);

  if (!run) {
    return null;
  }

  const lastError = failed ? sortedSteps(run).findLast((s) => s.kind === "error") : null;
  const outcome = run.result ?? lastError?.text;
  const hold = () => timerRef.current?.pause();
  const resume = () => {
    if (!document.hidden) {
      timerRef.current?.play();
    }
  };

  return createPortal(
    <div
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      className={cn(
        "fixed right-4 bottom-4 z-200 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-app-border-mid bg-app-panel text-app-text",
        "motion-safe:animate-[compacto-fade-up_0.18s_ease]",
        failed
          ? "shadow-[inset_3px_0_0_var(--app-error),0_12px_32px_-8px_rgba(0,0,0,0.35)]"
          : "shadow-[inset_3px_0_0_var(--app-accent),0_12px_32px_-8px_rgba(0,0,0,0.35)]",
      )}
      data-testid="agent-run-finished-toast"
      data-status={run.status}
      onMouseEnter={hold}
      onMouseLeave={resume}
      onFocus={hold}
      onBlur={resume}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          onClose();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-3 py-3 pr-2 pl-4">
        <span
          className={cn(
            "tint-current mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border [&_svg]:size-4",
            failed ? "text-app-error" : "text-app-accent",
          )}
        >
          {failed ? <AlertCircle /> : <CheckCircle2 />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-app-bright">
                {failed ? `${run.agent} stopped` : `${run.agent} finished`}
              </span>
              <span className={cn(ui.meta, "truncate")}>
                {taskTitle ? `${taskTitle} · ` : ""}
                {fmtTime(run.endedAt ?? run.updatedAt)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-6 shrink-0 rounded-md px-2 text-xs font-medium text-app-dim transition-colors hover:bg-app-hover hover:text-app-text focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none"
              data-testid="agent-run-finished-close"
            >
              Close
            </button>
          </div>
          {outcome ? (
            <div className="max-h-32 overflow-y-auto pr-2">
              <MessageResponse className="text-xs text-app-text">{outcome}</MessageResponse>
            </div>
          ) : (
            <p className={ui.help}>See the steps under Comments.</p>
          )}
        </div>
      </div>
      {!failed && (
        <div
          ref={barRef}
          aria-hidden
          className="h-0.5 origin-left bg-app-accent/60"
          data-testid="agent-run-finished-toast-timer"
        />
      )}
    </div>,
    document.body,
  );
}

/**
 * Live progress of the task's latest agent run, at the top of its comment
 * thread: what the agent is doing, what it needs from you, and its outcome —
 * as its skill reports them (`planner.sh event`), streamed from the Firebase
 * Realtime Database (`@/lib/agent-runs`), so every open tab or device sees
 * them. A run started from this tab's Run agent dialog can be stopped here.
 * When a run ends while shown here, a toast pops bottom right with its
 * outcome and a Close button. Clear drops a finished run. Hidden while signed out or
 * when the task has no run.
 *
 * @param todoId - Task whose run is shown (in the active file).
 * @param title - The task's title, named in the finished toast.
 */
export function AgentRunPanel({ todoId, title }: { todoId: string; title?: string }) {
  const signed = useSignedIn();
  const fileId = useAppSelector((s) => s.todos.activeFileId);
  const { run, error, finished, dismissFinished } = useAgentRun(fileId, todoId, signed);
  const listRef = useRef<HTMLOListElement>(null);
  const steps = run ? sortedSteps(run) : [];
  // This tab started the run from the Run agent dialog: it can stop it.
  const owns = useSyncExternalStore(
    onOwnedRunsChange,
    () => ownsAgentRun(fileId, todoId),
    () => false,
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [steps.length]);

  const toast = (
    <AgentRunFinishedToast run={finished} taskTitle={title} onClose={dismissFinished} />
  );

  if (error) {
    return (
      <>
        <p
          className="rounded-md bg-app-error/10 p-2 text-xs text-app-error"
          role="alert"
          data-testid="agent-run-panel-error"
        >
          Live agent progress unavailable: {error}
        </p>
        {toast}
      </>
    );
  }
  if (!run) {
    return toast;
  }

  const active = isActive(run.status);
  // Tool calls the agent is paused on; a finished run has none left to answer.
  const pending = active
    ? Object.entries(run.approvals ?? {})
        .filter(([, a]) => a.state === "pending")
        .sort(([, a], [, b]) => a.at - b.at)
    : [];

  return (
    <>
      <div
        className={cn(
          "flex flex-col rounded-md border bg-app-bg",
          run.status === "waiting"
            ? "border-app-warn"
            : active
              ? "border-app-border-accent"
              : "border-app-border",
        )}
        data-testid="agent-run-panel"
        data-status={run.status}
      >
        <div className="flex items-center gap-2 border-b border-app-border px-3 py-1.5">
          <Bot className="size-3.5 shrink-0 text-app-dim" />
          <span className="truncate text-xs font-semibold text-app-text">{run.agent}</span>
          <StatusIcon status={run.status} />
          <span className={cn(ui.meta, "mr-auto truncate")}>
            {STATUS_LABEL[run.status]}
            {run.commentId && " · on a comment"}
            {" · "}
            {fmtTime(run.endedAt ?? run.updatedAt)}
          </span>
          {active && owns && (
            <button
              type="button"
              onClick={() => stopAgentRun(fileId, todoId)}
              className={cn(ui.ghostBtn, "h-6 text-app-error")}
              data-testid="agent-run-panel-stop"
            >
              <Square className="size-3" />
              Stop
            </button>
          )}
          {!active && (
            <button
              type="button"
              aria-label="Clear agent run"
              title="Clear"
              onClick={() => void clearAgentRun(fileId, todoId).catch(() => {})}
              className={cn(ui.iconBtn, "size-6 [&_svg]:size-3.5")}
              data-testid="agent-run-panel-clear"
            >
              <X />
            </button>
          )}
        </div>
        <ol
          ref={listRef}
          className="flex max-h-72 flex-col gap-1.5 overflow-y-auto px-3 py-2"
          aria-live="polite"
          data-testid="agent-run-panel-steps"
        >
          {steps.map((step, i) => (
            <li key={i}>
              <StepRow step={step} />
            </li>
          ))}
          {run.status === "running" && (
            <li className={cn(ui.meta, "flex items-center gap-1.5")}>
              <Loader2 className="size-3 animate-spin" />
              Working…
            </li>
          )}
        </ol>
        {pending.length > 0 && (
          <div
            className="flex flex-col gap-2 border-t border-app-border px-3 py-2"
            data-testid="agent-run-panel-approvals"
          >
            {pending.map(([id, approval]) => (
              <ApprovalPrompt key={id} requestId={id} approval={approval} />
            ))}
          </div>
        )}
      </div>
      {toast}
    </>
  );
}
