import type { NextRequest } from "next/server";

import {
  authenticate,
  check,
  findTodo,
  handle,
  readJsonObject,
  thoughtJson,
  TODO_KEY_COLUMNS,
  type TodoKey,
  todoPatchToUpdate,
  type TodoRow,
} from "@/lib/plan-api";

/**
 * Third-party Plan API — one task's thought.
 *
 * Auth: `Authorization: Bearer <Plan API key | Supabase access token>`
 * (`authenticate` in `@/lib/plan-api`). A key acts through the secret client,
 * bypassing RLS, so every query goes through `ApiContext.table()`, which
 * scopes it to the key's user. Add `?fileId=` when the task id exists in more
 * than one file (409 otherwise).
 *
 * - `GET`    → `{ "thought": "<markdown>" }`.
 * - `PATCH`  → update any of `title`, `thought`, `done`, `priority`,
 *              `progress`, `completedFrom`, `completedTo` (epoch ms),
 *              `groupId`. `done` and `progress: "Done"` keep each other in
 *              step, as in the app. Responds `{ "thought": … }`.
 * - `DELETE` → remove the task and its comments. 204.
 */

type Ctx = RouteContext<"/api/plan/[todoId]">;

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    return Response.json(thoughtJson(await findTodo(api, request, todoId)));
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    // The done/progress coupling needs the current values of both.
    const row = await findTodo<TodoKey & Pick<TodoRow, "done_at" | "progress">>(
      api,
      request,
      todoId,
      `${TODO_KEY_COLUMNS}, done_at, progress`,
    );
    const update = todoPatchToUpdate(await readJsonObject(request), row);
    const { data, error } = await api
      .table("planner_todos")
      .update(update)
      .eq("file_id", row.file_id)
      .eq("id", row.id)
      .select(TODO_KEY_COLUMNS)
      .single();
    check(error);
    return Response.json(thoughtJson(data as unknown as TodoKey));
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const { error } = await api
      .table("planner_todos")
      .delete()
      .eq("file_id", row.file_id)
      .eq("id", row.id);
    check(error);
    return new Response(null, { status: 204 });
  });
}
