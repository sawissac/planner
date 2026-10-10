import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";

import {
  authenticate,
  check,
  COMMENT_COLUMNS,
  commentJson,
  type CommentRow,
  findTodo,
  handle,
  isSettledComment,
  listComments,
  nextCommentPosition,
  readCommentBody,
  readJsonObject,
  touchTodo,
} from "@/lib/plan-api";

/**
 * Third-party Plan API — a thought's comment thread.
 *
 * - `GET`  → `{ "thought": …, "comments": [{ "id": …, "comment": … }] }`,
 *            oldest first. `?open=1` leaves out settled comments (see
 *            `isSettledComment`) and adds `"settled": <count left out>`.
 * - `POST` → `{ "body": "<markdown>" }` appends a comment with a generated
 *            id. 201 `{ "id": …, "thought": …, "comment": … }`.
 *
 * Auth and `?fileId=` as in `/api/plan/[todoId]`.
 */

type Ctx = RouteContext<"/api/plan/[todoId]/comment">;

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const comments = await listComments(api, row);
    const openOnly = new URL(request.url).searchParams.get("open") === "1";
    const shown = openOnly ? comments.filter((c) => !isSettledComment(c.body)) : comments;
    return Response.json({
      thought: row.thought,
      comments: shown.map((c) => ({ id: c.id, comment: c.body })),
      ...(openOnly && { settled: comments.length - shown.length }),
    });
  });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const body = readCommentBody(await readJsonObject(request));
    const now = new Date().toISOString();
    const { data, error } = await api
      .table("planner_thought_comments")
      .insert({
        file_id: row.file_id,
        todo_id: row.id,
        id: nanoid(),
        body,
        position: await nextCommentPosition(api, row),
        created_at: now,
        updated_at: now,
      })
      .select(COMMENT_COLUMNS)
      .single();
    check(error);
    await touchTodo(api, row);
    const comment = data as CommentRow;
    // The id is new to the caller, so this one response carries it.
    return Response.json({ id: comment.id, ...commentJson(row, comment) }, { status: 201 });
  });
}
