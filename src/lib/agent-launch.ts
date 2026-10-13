"use client";

import { AGENT_PROVIDER_LABEL, type AgentServer, executeAgent } from "@/lib/agent-servers";
import { createClient } from "@/lib/supabase/client";

/**
 * Runs started from the Run agent dialog. The tab that starts a run holds the
 * bridge's stream (`executeAgent`) — closing it stops the agent — while what
 * the agent does shows live in {@link AgentRunPanel} from the skill's own
 * `planner.sh event` reports, the same as for a pasted Copy context link.
 *
 * This side only frames the run through the Plan API's event route
 * (`/api/plan/<todoId>/event`, as the signed-in user):
 *   - `start` with `launch` the moment the bridge accepts it, so the panel
 *     shows the run before the agent's first report (the agent's `start`
 *     joins it);
 *   - approvals: the bridge pauses a tool call that needs permission and
 *     says so in the stream; this relays it (`permission`) and its answer
 *     (`permission-result`), and the panel's Allow / Deny answer the bridge
 *     directly (`answerPermission`);
 *   - when the stream ends, `done`/`fail` with `ifActive`, so a run the agent
 *     left open (crash, stop, a skipped report) doesn't stay "working".
 */

/** Aborts for the runs this tab owns, by `fileId/todoId`. */
const owned = new Map<string, AbortController>();
const listeners = new Set<() => void>();

const keyOf = (fileId: string | null, todoId: string) => `${fileId ?? ""}/${todoId}`;
const notify = () => listeners.forEach((fn) => fn());

const supabase = createClient();

async function postEvent(
  todoId: string,
  fileId: string | null,
  body: Record<string, unknown>,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return;
  }
  const query = fileId ? `?fileId=${encodeURIComponent(fileId)}` : "";
  const res = await fetch(`/api/plan/${encodeURIComponent(todoId)}/event${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn("[agent-launch] event not recorded", res.status, await res.text());
  }
}

/** Last segment of a path, for messages. */
const folderOf = (path: string) =>
  path
    .split(/[\\/]+/)
    .filter(Boolean)
    .pop() ?? path;

/**
 * Start the agent on the task. Resolves once the bridge accepted the run (the
 * dialog can close then); rejects when it could not start. The run then
 * streams on in the background until it ends or {@link stopAgentRun}.
 */
export function launchAgentRun(args: {
  server: AgentServer;
  fileId: string | null;
  todoId: string;
  commentId?: string;
  projectPath: string;
  context: string;
  extraContext: string;
}): Promise<void> {
  const key = keyOf(args.fileId, args.todoId);
  if (owned.has(key)) {
    return Promise.reject(new Error("This task already has a run in progress. Stop it first."));
  }
  const agent = AGENT_PROVIDER_LABEL[args.server.provider];
  const event = (body: Record<string, unknown>) =>
    postEvent(args.todoId, args.fileId, {
      agent,
      ...(args.commentId ? { commentId: args.commentId } : {}),
      ...body,
    }).catch((e: unknown) => console.warn("[agent-launch] event failed", e));

  const controller = new AbortController();
  owned.set(key, controller);
  notify();

  return new Promise<void>((resolve, reject) => {
    let opened = false;
    let bridgeRunId = "";
    let exitCode: number | null = null;
    let error = "";

    void executeAgent({
      server: args.server,
      projectPath: args.projectPath,
      context: args.context,
      extraContext: args.extraContext,
      signal: controller.signal,
      onOpen: () => {
        opened = true;
        void event({
          type: "start",
          launch: true,
          text: `Starting ${agent} in ${folderOf(args.projectPath)}`,
        });
        resolve();
      },
      onEvent: (e) => {
        // Approvals: the bridge paused a tool call; relay it so every tab shows it.
        if (e.type === "planner" && e.event === "start" && typeof e.runId === "string") {
          bridgeRunId = e.runId;
        }
        if (e.type === "planner" && e.event === "permission_request") {
          void event({
            type: "permission",
            requestId: e.requestId,
            bridgeRunId,
            tool: e.tool,
            text: e.detail,
          });
        }
        if (e.type === "planner" && e.event === "permission_resolved") {
          void event({
            type: "permission-result",
            requestId: e.requestId,
            allow: e.allow === true,
            text: typeof e.message === "string" ? e.message : "",
          });
        }
        if (e.type === "planner" && e.event === "exit") {
          exitCode = typeof e.code === "number" ? e.code : null;
          if (exitCode !== 0 && typeof e.stderr === "string") {
            error ||= e.stderr.slice(-500);
          }
        }
        if (e.type === "result" && e.is_error) {
          error =
            typeof e.result === "string" && e.result ? e.result : "The agent reported an error.";
        }
      },
    })
      .catch((e: unknown) => {
        if (!opened) {
          reject(e instanceof Error ? e : new Error(String(e)));
          return;
        }
        if (!controller.signal.aborted) {
          error ||= e instanceof Error ? e.message : String(e);
        }
      })
      .finally(() => {
        owned.delete(key);
        notify();
        if (!opened) {
          return;
        }
        if (controller.signal.aborted) {
          void event({ type: "fail", ifActive: true, text: "Stopped from Planner." });
        } else if (error || (exitCode !== null && exitCode !== 0)) {
          void event({
            type: "fail",
            ifActive: true,
            text: error || `${agent} exited with code ${String(exitCode)}.`,
          });
        } else {
          void event({ type: "done", ifActive: true, text: `${agent} finished.` });
        }
      });
  });
}

/** Stop a run this tab started. */
export function stopAgentRun(fileId: string | null, todoId: string): void {
  owned.get(keyOf(fileId, todoId))?.abort();
}

/** Whether this tab holds the run's stream (and so can stop it). */
export function ownsAgentRun(fileId: string | null, todoId: string): boolean {
  return owned.has(keyOf(fileId, todoId));
}

/** Called when this tab starts or loses a run. Returns unsubscribe. */
export function onOwnedRunsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
