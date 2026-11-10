"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Live progress of an agent working on a task, as its skill reports it
 * through the Plan API (`POST /api/plan/<todoId>/event`, `planner.sh event`).
 * The server writes it to `planner_agent_runs` (one row per task — the
 * latest run, owner-only RLS, see
 * `supabase/migrations/20261015010000_agent_runs.sql`); this side watches it
 * through Supabase Realtime and clears it.
 */

export type RunStatus = "running" | "waiting" | "done" | "failed";

/**
 * - `info`   — the run started.
 * - `step`   — what the agent is doing.
 * - `ask`    — what it needs from you.
 * - `result` — its one-line outcome.
 * - `error`  — why it stopped.
 */
export type StepKind = "info" | "step" | "ask" | "permission" | "result" | "error";

/** `permission` steps also carry the tool and the approval they belong to. */
export type RunStep = {
  kind: StepKind;
  text: string;
  at: number;
  tool?: string;
  requestId?: string;
};

/**
 * A tool call the agent is waiting on the user to Allow or Deny (Run agent
 * runs only — the bridge pauses it). Answered through the bridge
 * (`answerPermission`), so only on the computer running the agent.
 */
export type Approval = {
  tool: string;
  detail: string;
  /** The bridge's id for the run, needed to answer. */
  bridgeRunId: string;
  state: "pending" | "allowed" | "denied";
  at: number;
};

export type AgentRun = {
  runId: string;
  agent: string;
  status: RunStatus;
  commentId: string | null;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  result?: string;
  steps?: RunStep[];
  approvals?: Record<string, Approval>;
};

type RunRow = {
  run_id: string;
  agent: string;
  status: RunStatus;
  comment_id: string | null;
  cleared: boolean;
  steps: RunStep[];
  approvals: Record<string, Approval>;
  result: string | null;
  started_at: string;
  updated_at: string;
  ended_at: string | null;
};

const TABLE = "planner_agent_runs";
const COLUMNS =
  "run_id, agent, status, comment_id, cleared, steps, approvals, result, started_at, updated_at, ended_at";

const supabase = createClient();

/** Runs whose "finished" toast was already shown, so two panels don't both pop it. */
const noticed = new Set<string>();

/** Makes each watcher's channel topic unique, so two panels on one task don't share one. */
let channelSeq = 0;

function toRun(row: RunRow): AgentRun {
  return {
    runId: row.run_id,
    agent: row.agent,
    status: row.status,
    commentId: row.comment_id,
    startedAt: Date.parse(row.started_at),
    updatedAt: Date.parse(row.updated_at),
    ...(row.ended_at ? { endedAt: Date.parse(row.ended_at) } : {}),
    ...(row.result ? { result: row.result } : {}),
    steps: row.steps,
    approvals: row.approvals,
  };
}

/** Steps in the order they were written. */
export function sortedSteps(run: AgentRun): RunStep[] {
  return run.steps ?? [];
}

export function isActive(status: RunStatus): boolean {
  return status === "running" || status === "waiting";
}

async function fetchRun(fileId: string | null, todoId: string): Promise<AgentRun | null> {
  let query = supabase.from(TABLE).select(COLUMNS).eq("todo_id", todoId);
  if (fileId) {
    query = query.eq("file_id", fileId);
  }
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<RunRow>();
  if (error) {
    throw new Error(error.message);
  }
  return data && !data.cleared ? toRun(data) : null;
}

/**
 * Listen to the task's run record; `null` when there is none. Returns unsubscribe.
 * Every change refetches the row rather than reading the change payload,
 * which can leave out large unchanged values (TOASTed `steps`/`result`).
 */
export function watchAgentRun(
  fileId: string | null,
  todoId: string,
  onRun: (run: AgentRun | null) => void,
  onError: (error: Error) => void,
): () => void {
  let closed = false;
  let loading = false;
  let stale = false;
  const load = async () => {
    if (loading) {
      stale = true;
      return;
    }
    loading = true;
    try {
      do {
        stale = false;
        const run = await fetchRun(fileId, todoId);
        if (!closed) {
          onRun(run);
        }
      } while (stale && !closed);
    } catch (e) {
      if (!closed) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      loading = false;
    }
  };

  const channel = supabase
    .channel(`agent-run:${todoId}:${++channelSeq}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `todo_id=eq.${todoId}` },
      () => void load(),
    );
  // Hand the socket the session's token before joining: a channel that joins
  // with only the publishable key is refused (RLS) and never retries.
  supabase.realtime
    .setAuth()
    .then(() => {
      if (closed) {
        return;
      }
      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          // Catch anything written while connecting.
          void load();
        } else if (!closed && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          onError(err ?? new Error("Live agent progress is unavailable."));
        }
      });
    })
    .catch(onError);
  void load();

  return () => {
    closed = true;
    void supabase.removeChannel(channel);
  };
}

/** Hide the task's run record (the panel's Clear). */
export async function clearAgentRun(fileId: string | null, todoId: string): Promise<void> {
  const { error } = await supabase.rpc("planner_agent_run_clear", {
    p_file_id: fileId,
    p_todo_id: todoId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

/** True the first time it is called for `runId` in this tab. */
export function claimFinishedNotice(runId: string): boolean {
  if (noticed.has(runId)) {
    return false;
  }
  noticed.add(runId);
  return true;
}
