"use client";

import { onValue, ref, remove } from "firebase/database";

import { db, firebaseUser } from "@/firebase/client";

/**
 * Live progress of an agent working on a task, as its skill reports it
 * through the Plan API (`POST /api/plan/<todoId>/event`, `planner.sh event`).
 * The server writes it to the Firebase Realtime Database; this side only
 * watches and clears it.
 *
 * One record per task — the latest run — at
 * `agentRuns/<supabase uid>/<fileId>/<todoId>`:
 *
 *   { runId, agent, status, commentId, startedAt, updatedAt, endedAt?,
 *     result?, steps: { <pushId>: { kind, text, at } } }
 */

export type RunStatus = "running" | "waiting" | "done" | "failed";

/**
 * - `info`   — the run started.
 * - `step`   — what the agent is doing.
 * - `ask`    — what it needs from you.
 * - `result` — its one-line outcome.
 * - `error`  — why it stopped.
 */
export type StepKind = "info" | "step" | "ask" | "result" | "error";

export type RunStep = { kind: StepKind; text: string; at: number };

export type AgentRun = {
  runId: string;
  agent: string;
  status: RunStatus;
  commentId: string | null;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  result?: string;
  steps?: Record<string, RunStep>;
};

/** Runs whose "finished" toast was already shown, so two panels don't both pop it. */
const noticed = new Set<string>();

const runRef = (uid: string, fileId: string | null, todoId: string) =>
  ref(db(), `agentRuns/${uid}/${fileId ?? "_"}/${todoId}`);

/** Steps in the order they were written (push ids sort that way). */
export function sortedSteps(run: AgentRun): RunStep[] {
  return Object.entries(run.steps ?? {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, s]) => s);
}

export function isActive(status: RunStatus): boolean {
  return status === "running" || status === "waiting";
}

/** Listen to the task's run record; `null` when there is none. Returns unsubscribe. */
export function watchAgentRun(
  fileId: string | null,
  todoId: string,
  onRun: (run: AgentRun | null) => void,
  onError: (error: Error) => void,
): () => void {
  let off: (() => void) | null = null;
  let closed = false;
  firebaseUser()
    .then((uid) => {
      if (!closed) {
        off = onValue(
          runRef(uid, fileId, todoId),
          (snap) => onRun(snap.val() as AgentRun | null),
          onError,
        );
      }
    })
    .catch(onError);
  return () => {
    closed = true;
    off?.();
  };
}

/** Drop the task's run record (the panel's Clear). */
export async function clearAgentRun(fileId: string | null, todoId: string): Promise<void> {
  const uid = await firebaseUser();
  await remove(runRef(uid, fileId, todoId));
}

/** True the first time it is called for `runId` in this tab. */
export function claimFinishedNotice(runId: string): boolean {
  if (noticed.has(runId)) {
    return false;
  }
  noticed.add(runId);
  return true;
}
