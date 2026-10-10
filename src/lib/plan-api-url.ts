/** Prefix that marks a bearer token as a Plan API key rather than a session JWT. */
export const API_KEY_PREFIX = "pln_";

/**
 * Absolute URL of a task (or one of its comments) in the third-party Plan API
 * (`src/app/api/plan/**`) — what "Copy context" copies, as a bare link the
 * way Figma's "Copy link to selection" does: the agent's skill parses the
 * ids and base URL from it and authenticates on its own, so the link holds no
 * secret and no shell syntax. `fileId` is always included: task ids are only
 * unique per file, and the API rejects an ambiguous id without it.
 */
export function planApiUrl(todoId: string, fileId: string | null, commentId?: string): string {
  const path = `/api/plan/${encodeURIComponent(todoId)}${
    commentId ? `/comment/${encodeURIComponent(commentId)}` : ""
  }`;
  const url = new URL(path, window.location.origin);
  if (fileId) {
    url.searchParams.set("fileId", fileId);
  }
  return url.toString();
}

/**
 * What "Copy context" puts on the clipboard: a one-line ask for the agent
 * above the link, so a paste alone is a complete prompt — "Do this plan" for
 * a thought, "Solve this comment" for a comment (the routes the
 * `planner-for-claude-code` skill takes for each link).
 */
export function planContext(todoId: string, fileId: string | null, commentId?: string): string {
  const ask = commentId ? "Solve this comment" : "Do this plan";
  return `${ask}\n${planApiUrl(todoId, fileId, commentId)}`;
}
