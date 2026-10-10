import type { NextRequest } from "next/server";

import {
  ApiError,
  authenticate,
  check,
  COMMENT_COLUMNS,
  commentJson,
  type CommentRow,
  findComment,
  findTodo,
  handle,
  nextCommentPosition,
  readCommentBody,
  readJsonObject,
  touchTodo,
} from "@/lib/plan-api";

/**
 * Third-party Plan API — one comment on a task's thought.
 *
 * Every success with a body responds `{ "thought": …, "comment": … }`.
 *
 * - `GET`    → the comment.
 * - `PUT`    → `{ "body": "<markdown>" }` creates the comment with this id
 *              (201, appended to the thread) or replaces its body (200).
 * - `PATCH`  → `{ "body": "<markdown>" }` edits an existing comment.
 * - `DELETE` → removes it. 204.
 *
 * Auth and `?fileId=` as in `/api/plan/[todoId]`.
 */

type Ctx = RouteContext<"/api/plan/[todoId]/comment/[commentId]">;

export async function GET(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId, commentId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const comment = await findComment(api, row, commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found.");
    }
    return Response.json(commentJson(row, comment));
  });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId, commentId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const body = readCommentBody(await readJsonObject(request));
    const existing = await findComment(api, row, commentId);
    const now = new Date().toISOString();
    if (existing) {
      const { data, error } = await api
        .table("planner_thought_comments")
        .update({ body, updated_at: now })
        .eq("file_id", row.file_id)
        .eq("todo_id", row.id)
        .eq("id", commentId)
        .select(COMMENT_COLUMNS)
        .single();
      check(error);
      await touchTodo(api, row);
      return Response.json(commentJson(row, data as CommentRow));
    }
    const { data, error } = await api
      .table("planner_thought_comments")
      .insert({
        file_id: row.file_id,
        todo_id: row.id,
        id: commentId,
        body,
        position: await nextCommentPosition(api, row),
        created_at: now,
        updated_at: now,
      })
      .select(COMMENT_COLUMNS)
      .single();
    check(error);
    await touchTodo(api, row);
    return Response.json(commentJson(row, data as CommentRow), { status: 201 });
  });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId, commentId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const body = readCommentBody(await readJsonObject(request));
    const { data, error } = await api
      .table("planner_thought_comments")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("file_id", row.file_id)
      .eq("todo_id", row.id)
      .eq("id", commentId)
      .select(COMMENT_COLUMNS)
      .maybeSingle();
    check(error);
    if (!data) {
      throw new ApiError(404, "Comment not found.");
    }
    await touchTodo(api, row);
    return Response.json(commentJson(row, data));
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { todoId, commentId } = await ctx.params;
    const api = await authenticate(request);
    const row = await findTodo(api, request, todoId);
    const { data, error } = await api
      .table("planner_thought_comments")
      .delete()
      .eq("file_id", row.file_id)
      .eq("todo_id", row.id)
      .eq("id", commentId)
      .select("id");
    check(error);
    if (!data || data.length === 0) {
      throw new ApiError(404, "Comment not found.");
    }
    await touchTodo(api, row);
    return new Response(null, { status: 204 });
  });
}
