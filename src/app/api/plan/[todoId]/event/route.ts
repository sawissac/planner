import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { rtdb, SERVER_TIME } from "@/firebase/server";
import { ApiError, authenticate, findTodo, handle, readJsonObject } from "@/lib/plan-api";

/**
 * Third-party Plan API — live progress of an agent working on a task.
 *
 * The agent's skill reports what it is doing (`planner.sh event …`); each
 * event lands in the Firebase Realtime Database at
 * `agentRuns/<uid>/<fileId>/<todoId>`, which the task's comment thread
 * watches live (`AgentRunPanel`). One record per task: `start` replaces it.
 *
 * Auth: as every Plan API route (`authenticate` in `@/lib/plan-api`).
 *
 * - `POST` `{ "type", "text"?, "agent"?, "commentId"? }`:
 *   - `start` — a new run (`text`: what it is about to do).
 *   - `step`  — what it is doing now.
 *   - `ask`   — it needs something from the user (status `waiting`).
 *   - `done`  — finished (`text`: one-line outcome); the app pops a dialog.
 *   - `fail`  — gave up or is blocked (`text`: why).
 *   A `step`/`ask`/`done`/`fail` with no running record starts one first.
 * - Flags, for Planner's own Run agent dialog, which launches the agent:
 *   - `"launch": true` on its `start` marks the run as launched; the agent's
 *     own `start` then joins that run instead of replacing it, so the
 *     "Starting…" line stays.
 *   - `"ifActive": true` makes the event a no-op unless a run is active —
 *     the dialog's closing `done`/`fail` after the agent already finished.
 * - Approvals, relayed by the tab that launched the run (the bridge pauses
 *   a tool call that needs permission until the user answers):
 *   - `permission` `{ requestId, bridgeRunId, tool, text }` — the agent wants
 *     to run `tool` (`text`: its command / file); status `waiting`. Kept
 *     under `approvals/<requestId>` with `state: "pending"`.
 *   - `permission-result` `{ requestId, allow }` — answered (or timed out):
 *     the approval's `state` becomes `allowed` / `denied`; status `running`.
 *   Responds `{ "status": "<run status>" }` (`"none"` for a skipped event).
 */

type Ctx = RouteContext<"/api/plan/[todoId]/event">;

const KIND = {
  start: "info",
  step: "step",
  ask: "ask",
  done: "result",
  fail: "error",
  permission: "permission",
  "permission-result": "info",
} as const;

type EventType = keyof typeof KIND;

const STATUS: Record<EventType, string> = {
  start: "running",
  step: "running",
  ask: "waiting",
  done: "done",
  fail: "failed",
  permission: "waiting",
  "permission-result": "running",
};

const MAX_TEXT = 4000;
const MAX_RESULT = 20_000;

function readString(body: Record<string, unknown>, key: string, max: number): string {
  const v = body[key];
  if (v === undefined || v === null) {
    return "";
  }
  if (typeof v !== "string") {
    throw new ApiError(400, `\`${key}\` must be a string.`);
  }
  return v.trim().slice(0, max);
}

async function write(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    throw new ApiError(502, e instanceof Error ? e.message : String(e));
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const body = await readJsonObject(request);

    const type = body.type as EventType;
    if (!(typeof type === "string" && type in KIND)) {
      throw new ApiError(
        400,
        "`type` must be one of start, step, ask, done, fail, permission, permission-result.",
      );
    }
    const text = readString(body, "text", type === "done" ? MAX_RESULT : MAX_TEXT);
    if ((type === "step" || type === "ask") && !text) {
      throw new ApiError(400, "`text` is required.");
    }
    const agent = readString(body, "agent", 40) || "Agent";
    const commentId = readString(body, "commentId", 200) || null;
    const launch = body.launch === true;
    const ifActive = body.ifActive === true;
    const approval = type === "permission" || type === "permission-result";
    const requestId = readString(body, "requestId", 100);
    if (approval && !/^[\w-]+$/.test(requestId)) {
      throw new ApiError(400, "`requestId` is required for approvals.");
    }
    const tool = readString(body, "tool", 100) || "tool";
    const allow = body.allow === true;

    const path = ["agentRuns", api.userId, row.file_id, row.id];
    const start = () =>
      rtdb("PUT", path, {
        runId: randomUUID(),
        agent,
        status: "running",
        commentId,
        launched: launch,
        startedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      });

    let skipped = false;
    await write(async () => {
      const current = launch
        ? null
        : ((await rtdb("GET", path)) as { status?: string; launched?: boolean } | null);
      const active = current?.status === "running" || current?.status === "waiting";
      if (ifActive && !active) {
        skipped = true;
        return;
      }
      if (type === "start" && active && current?.launched) {
        // The launched agent reporting in: keep the run, mark it joined.
        await rtdb("PATCH", path, { launched: false });
      } else if (type === "start" || !active) {
        await start();
      }
      if (type === "permission") {
        await rtdb("PUT", [...path, "approvals", requestId], {
          tool,
          detail: text,
          bridgeRunId: readString(body, "bridgeRunId", 100),
          state: "pending",
          at: SERVER_TIME,
        });
      }
      let stepText = text || (type === "start" ? "Started" : type === "done" ? "Done" : "");
      if (type === "permission-result") {
        const asked = (await rtdb("GET", [...path, "approvals", requestId])) as {
          tool?: string;
          detail?: string;
        } | null;
        await rtdb("PATCH", [...path, "approvals", requestId], {
          state: allow ? "allowed" : "denied",
        });
        stepText = `${allow ? "Allowed" : "Denied"}: ${asked?.tool ?? tool}${
          asked?.detail ? ` · ${asked.detail}` : ""
        }${!allow && text ? ` (${text})` : ""}`.slice(0, MAX_TEXT);
      }
      await rtdb("POST", [...path, "steps"], {
        kind: KIND[type],
        text: stepText,
        ...(type === "permission" ? { tool, requestId } : {}),
        at: SERVER_TIME,
      });
      const ended = type === "done" || type === "fail";
      await rtdb("PATCH", path, {
        status: STATUS[type],
        updatedAt: SERVER_TIME,
        ...(ended ? { endedAt: SERVER_TIME } : {}),
        ...(type === "done" && text ? { result: text } : {}),
      });
    });

    return Response.json({ status: skipped ? "none" : STATUS[type] });
  });
}
