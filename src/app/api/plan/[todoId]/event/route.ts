import type { NextRequest } from "next/server";

import { ApiError, authenticate, check, findTodo, handle, readJsonObject } from "@/lib/plan-api";

/**
 * Third-party Plan API — live progress of an agent working on a task.
 *
 * The agent's skill reports what it is doing (`planner.sh event …`); each
 * event is applied to the task's row in `planner_agent_runs` by the
 * `planner_agent_run_event` RPC (one atomic write; the rules below live
 * there), and the task's comment thread watches that row live through
 * Supabase Realtime (`AgentRunPanel`). One record per task: `start` replaces it.
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

const TYPES = ["start", "step", "ask", "done", "fail", "permission", "permission-result"] as const;

type EventType = (typeof TYPES)[number];

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

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const body = await readJsonObject(request);

    const type = body.type as EventType;
    if (!TYPES.includes(type)) {
      throw new ApiError(400, `\`type\` must be one of ${TYPES.join(", ")}.`);
    }
    const text = readString(body, "text", type === "done" ? MAX_RESULT : MAX_TEXT);
    if ((type === "step" || type === "ask") && !text) {
      throw new ApiError(400, "`text` is required.");
    }
    const approval = type === "permission" || type === "permission-result";
    const requestId = readString(body, "requestId", 100);
    if (approval && !/^[\w-]+$/.test(requestId)) {
      throw new ApiError(400, "`requestId` is required for approvals.");
    }

    const { data, error } = await api.rpc("planner_agent_run_event", {
      p_file_id: row.file_id,
      p_todo_id: row.id,
      p_type: type,
      p_text: text,
      p_agent: readString(body, "agent", 40) || "Agent",
      p_comment_id: readString(body, "commentId", 200) || null,
      p_launch: body.launch === true,
      p_if_active: body.ifActive === true,
      p_request_id: requestId,
      p_bridge_run_id: readString(body, "bridgeRunId", 100),
      p_tool: readString(body, "tool", 100) || "tool",
      p_allow: body.allow === true,
    });
    check(error);

    return Response.json({ status: data as string });
  });
}
