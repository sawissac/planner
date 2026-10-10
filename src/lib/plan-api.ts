/**
 * Shared plumbing for the third-party Plan API (`src/app/api/plan/**`).
 *
 * Auth: `Authorization: Bearer <token>`, where the token is either
 *   - a Plan API key (`pln_…`, copied from Settings → API keys). Only its
 *     SHA-256 hash is stored (`planner_api_tokens`); the server-only secret
 *     key resolves it to a user. Keys don't expire until revoked.
 *   - the user's Supabase access token (a JWT), checked with Supabase Auth.
 *
 * Either way handlers get an {@link ApiContext} whose `table()` scopes every
 * read, update and delete to that user and stamps inserts with their id.
 * Handlers never see a raw client: the API-key path bypasses RLS, so this
 * scoping is what keeps one user out of another's rows.
 *
 * Ids are the app's client-generated text ids; timestamps sent in are epoch
 * milliseconds.
 */
import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { API_KEY_PREFIX } from "@/lib/plan-api-url";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Tables the Plan API touches; all are keyed by `user_id`. */
export type PlanTable = "planner_todos" | "planner_thought_comments";

function scopedTable(client: SupabaseClient, userId: string, name: PlanTable) {
  return {
    // Untyped schema: parse the column list as "*" so rows come back as
    // plain records (callers cast to their row types) instead of tripping
    // supabase-js's select-string type parser on a runtime string.
    select: (columns: string) =>
      client
        .from(name)
        .select(columns as "*")
        .eq("user_id", userId),
    update: (values: Record<string, unknown>) =>
      client.from(name).update(values).eq("user_id", userId),
    delete: () => client.from(name).delete().eq("user_id", userId),
    insert: (values: Record<string, unknown>) =>
      client.from(name).insert({ ...values, user_id: userId }),
  };
}

export type ApiContext = {
  userId: string;
  /** Query `name` as the caller: filtered to, and inserting as, `userId`. */
  table: (name: PlanTable) => ReturnType<typeof scopedTable>;
};

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** SHA-256 hex of a Plan API key — the form `planner_api_tokens` stores. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function secretClient(): SupabaseClient {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new ApiError(
      503,
      "Plan API keys are not enabled on this server: set SUPABASE_SECRET_KEY.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, { auth: NO_SESSION });
}

async function authenticateApiKey(key: string): Promise<ApiContext> {
  const admin = secretClient();
  const { data, error } = await admin
    .from("planner_api_tokens")
    .select("user_id, id")
    .eq("token_hash", hashApiKey(key))
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new ApiError(401, "Invalid or revoked API key.");
  }
  const userId = data.user_id as string;
  await admin
    .from("planner_api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", data.id);
  return { userId, table: (name) => scopedTable(admin, userId, name) };
}

async function authenticateJwt(token: string): Promise<ApiContext> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: NO_SESSION },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError(401, "Invalid or expired access token.");
  }
  const userId = data.user.id;
  return { userId, table: (name) => scopedTable(supabase, userId, name) };
}

/** Resolve the bearer token (API key or session JWT) to the user it acts as. */
export async function authenticate(request: Request): Promise<ApiContext> {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) {
    throw new ApiError(401, "Missing bearer token: send `Authorization: Bearer <API key>`.");
  }
  const token = match[1];
  return token.startsWith(API_KEY_PREFIX) ? authenticateApiKey(token) : authenticateJwt(token);
}

/** Run a handler, turning thrown `ApiError`s (and anything else) into JSON errors. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    console.error("[plan-api]", e);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

/** Throw a mapped `ApiError` for a failed Supabase call. */
export function check(error: { code?: string; message: string } | null): void {
  if (!error) {
    return;
  }
  // 23503: foreign key (e.g. an unknown groupId); 22P02/22007/22008: bad value.
  if (error.code === "23503" || error.code?.startsWith("22")) {
    throw new ApiError(400, error.message);
  }
  throw new Error(error.message);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

/** Validate a comment's Markdown `body`. */
export function readCommentBody(body: Record<string, unknown>): string {
  const unknown = Object.keys(body).filter((k) => k !== "body");
  if (unknown.length > 0) {
    throw new ApiError(400, `Unknown field(s): ${unknown.join(", ")}.`);
  }
  if (typeof body.body !== "string" || !body.body.trim()) {
    throw new ApiError(400, "`body` must be a non-empty string.");
  }
  return body.body;
}

const iso = (n: number): string => new Date(n).toISOString();

export type TodoRow = {
  user_id: string;
  file_id: string;
  id: string;
  group_id: string | null;
  title: string;
  done: boolean;
  created_at: string;
  done_at: string | null;
  completed_from: string | null;
  completed_to: string | null;
  priority: string | null;
  progress: string | null;
  thought: string;
  updated_at: string;
};

/** The columns every endpoint needs: the task's key and its thought. */
export type TodoKey = Pick<TodoRow, "file_id" | "id" | "thought">;
export const TODO_KEY_COLUMNS = "file_id, id, thought";

export type CommentRow = { id: string; body: string };
export const COMMENT_COLUMNS = "id, body";

/**
 * Response bodies are deliberately minimal: the thought, plus the comment
 * when one is addressed. `id` is added where the caller can't know it yet
 * (a comment created by POST).
 */
export const thoughtJson = (todo: TodoKey) => ({ thought: todo.thought });
export const commentJson = (todo: TodoKey, comment: CommentRow) => ({
  thought: todo.thought,
  comment: comment.body,
});

/**
 * Find the caller's task, reading only `columns`. Task ids are only unique
 * per file, so a task copied into another file shares its id; `?fileId=`
 * picks one when that happens.
 */
export async function findTodo<T extends TodoKey = TodoKey>(
  { table }: ApiContext,
  request: Request,
  todoId: string,
  columns: string = TODO_KEY_COLUMNS,
): Promise<T> {
  const fileId = new URL(request.url).searchParams.get("fileId");
  let query = table("planner_todos").select(columns).eq("id", todoId);
  if (fileId) {
    query = query.eq("file_id", fileId);
  }
  const { data, error } = await query.limit(2);
  check(error);
  const rows = (data ?? []) as unknown as T[];
  if (rows.length === 0) {
    throw new ApiError(404, "Task not found.");
  }
  if (rows.length > 1) {
    throw new ApiError(
      409,
      "Task id exists in more than one file; add `?fileId=<file id>` to choose.",
    );
  }
  return rows[0];
}

export async function listComments({ table }: ApiContext, row: TodoKey): Promise<CommentRow[]> {
  const { data, error } = await table("planner_thought_comments")
    .select(COMMENT_COLUMNS)
    .eq("file_id", row.file_id)
    .eq("todo_id", row.id)
    .order("position");
  check(error);
  return data ?? [];
}

export async function findComment(
  { table }: ApiContext,
  row: TodoKey,
  commentId: string,
): Promise<CommentRow | null> {
  const { data, error } = await table("planner_thought_comments")
    .select(COMMENT_COLUMNS)
    .eq("file_id", row.file_id)
    .eq("todo_id", row.id)
    .eq("id", commentId)
    .maybeSingle();
  check(error);
  return data ?? null;
}

const SECTION_HEADING = /^\*\*([^*]+)\*\*$/;
/** Headings an agent writes for itself; they never ask for work. */
const NOTE_HEADINGS = new Set(["done", "resolved message"]);

/**
 * Whether a comment needs nothing more: a completion note (`**Done** …`), or
 * one whose request sections (a line that is only `**Bug**`, `**Fix**`, …) are
 * all `(Resolved)`. A comment with no sections is a plain note that may amend
 * the plan, so it is never settled; nor is a `(Partly resolved)` one.
 * `planner.sh open` reads sections the same way.
 */
export function isSettledComment(body: string): boolean {
  if (/^\s*\*\*Done\*\*/i.test(body)) {
    return true;
  }
  let resolved = 0;
  for (const line of body.split("\n")) {
    const heading = SECTION_HEADING.exec(line.trim())?.[1].trim().toLowerCase();
    if (!heading || NOTE_HEADINGS.has(heading)) {
      continue;
    }
    if (!heading.endsWith("(resolved)")) {
      return false;
    }
    resolved++;
  }
  return resolved > 0;
}

/** Position for a comment appended to the end of the thread. */
export async function nextCommentPosition({ table }: ApiContext, row: TodoKey): Promise<number> {
  const { data, error } = await table("planner_thought_comments")
    .select("position")
    .eq("file_id", row.file_id)
    .eq("todo_id", row.id)
    .order("position", { ascending: false })
    .limit(1);
  check(error);
  return data && data.length > 0 ? (data[0].position as number) + 1 : 0;
}

/**
 * Bump the task's `updated_at` after a comment change. The app's sync
 * compares that timestamp to decide whether the server has news, and a
 * deleted comment leaves no row of its own to carry one.
 */
export async function touchTodo({ table }: ApiContext, row: TodoKey): Promise<void> {
  const { error } = await table("planner_todos")
    .update({ updated_at: new Date().toISOString() })
    .eq("file_id", row.file_id)
    .eq("id", row.id);
  check(error);
}

const PATCH_FIELDS = new Set([
  "title",
  "thought",
  "done",
  "priority",
  "progress",
  "completedFrom",
  "completedTo",
  "groupId",
]);

const PROGRESS_DONE = "Done";
const PROGRESS_NOT_STARTED = "Not Started";

/**
 * Validate a PATCH body and turn it into a column update, applying the same
 * done/progress coupling as the `updateTodo` reducer so the app and the API
 * never disagree about what "done" means.
 */
export function todoPatchToUpdate(
  body: Record<string, unknown>,
  current: Pick<TodoRow, "done_at" | "progress">,
): Record<string, unknown> {
  const unknown = Object.keys(body).filter((k) => !PATCH_FIELDS.has(k));
  if (unknown.length > 0) {
    throw new ApiError(400, `Unknown field(s): ${unknown.join(", ")}.`);
  }
  if (Object.keys(body).length === 0) {
    throw new ApiError(400, "Nothing to update.");
  }
  const update: Record<string, unknown> = {};
  const nullableString = (k: string) => {
    const v = body[k];
    if (v !== null && typeof v !== "string") {
      throw new ApiError(400, `\`${k}\` must be a string or null.`);
    }
    return v;
  };
  const timestamp = (k: string) => {
    const v = body[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new ApiError(400, `\`${k}\` must be epoch milliseconds.`);
    }
    return iso(v);
  };

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new ApiError(400, "`title` must be a non-empty string.");
    }
    update.title = body.title.trim();
  }
  if ("thought" in body) {
    if (typeof body.thought !== "string") {
      throw new ApiError(400, "`thought` must be a string.");
    }
    update.thought = body.thought;
  }
  if ("groupId" in body) {
    update.group_id = nullableString("groupId");
  }
  if ("priority" in body) {
    update.priority = nullableString("priority");
  }
  if ("completedFrom" in body) {
    update.completed_from = timestamp("completedFrom");
  }
  if ("completedTo" in body) {
    update.completed_to = timestamp("completedTo");
  }

  const now = new Date().toISOString();
  let progress = current.progress;
  let doneAt = current.done_at;
  if ("done" in body) {
    if (typeof body.done !== "boolean") {
      throw new ApiError(400, "`done` must be a boolean.");
    }
    update.done = body.done;
    if (body.done) {
      doneAt = doneAt ?? now;
      progress = PROGRESS_DONE;
    } else {
      doneAt = null;
      if (progress === PROGRESS_DONE) {
        progress = PROGRESS_NOT_STARTED;
      }
    }
    update.done_at = doneAt;
    update.progress = progress;
  }
  if ("progress" in body) {
    const next = nullableString("progress");
    update.progress = next;
    if (next === PROGRESS_DONE) {
      update.done = true;
      update.done_at = doneAt ?? now;
    } else if (next !== null) {
      update.done = false;
      update.done_at = null;
    }
  }
  return update;
}
