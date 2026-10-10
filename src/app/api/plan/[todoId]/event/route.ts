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
 *   Responds `{ "status": "<run status>" }`.
 */

type Ctx = RouteContext<"/api/plan/[todoId]/event">;

const KIND = {
  start: "info",
  step: "step",
  ask: "ask",
  done: "result",
  fail: "error",
} as const;

type EventType = keyof typeof KIND;

const STATUS: Record<EventType, string> = {
  start: "running",
  step: "running",
  ask: "waiting",
  done: "done",
  fail: "failed",
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
      throw new ApiError(400, "`type` must be one of start, step, ask, done, fail.");
    }
    const text = readString(body, "text", type === "done" ? MAX_RESULT : MAX_TEXT);
    if ((type === "step" || type === "ask") && !text) {
      throw new ApiError(400, "`text` is required.");
    }
    const agent = readString(body, "agent", 40) || "Agent";
    const commentId = readString(body, "commentId", 200) || null;

    const path = ["agentRuns", api.userId, row.file_id, row.id];
    const start = () =>
      rtdb("PUT", path, {
        runId: randomUUID(),
        agent,
        status: "running",
        commentId,
        startedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      });

    await write(async () => {
      if (type === "start") {
        await start();
      } else {
        const status = await rtdb("GET", [...path, "status"]);
        if (status !== "running" && status !== "waiting") {
          await start();
        }
      }
      await rtdb("POST", [...path, "steps"], {
        kind: KIND[type],
        text: text || (type === "start" ? "Started" : type === "done" ? "Done" : ""),
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

    return Response.json({ status: STATUS[type] });
  });
}
