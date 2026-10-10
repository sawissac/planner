import type { ThoughtComment, Todo, TodosState } from "@/stores/slices/todoSlice";

/**
 * Three-way merge of the task tree for cloud sync.
 *
 * A push replaces the server's rows with the local state (rows it lacks are
 * deleted), so anything a third party changed through the Plan API since the
 * last sync would be wiped. Before each push the app fetches the server state
 * and merges it in, using `base` — the state both sides last agreed on — to
 * tell who changed what:
 *
 * - changed on one side only → that side's version;
 * - changed on both → local wins;
 * - new on one side (absent from base) → kept;
 * - removed on one side (in base, gone there) → removed.
 *
 * Tasks and their comments merge item by item. Files and groups are only
 * edited in the app, so they stay local.
 */
export function mergeTodosState(
  base: TodosState,
  local: TodosState,
  remote: TodosState,
): TodosState {
  return {
    ...local,
    files: local.files.map((file) => {
      const baseFile = base.files.find((f) => f.id === file.id);
      const remoteFile = remote.files.find((f) => f.id === file.id);
      if (!baseFile || !remoteFile) {
        return file;
      }
      const todos = mergeList(baseFile.todos, file.todos, remoteFile.todos, mergeTodo);
      return todos === file.todos ? file : { ...file, todos };
    }),
  };
}

function mergeTodo(base: Todo, local: Todo, remote: Todo): Todo {
  const { comments: baseComments, ...baseFields } = base;
  const { comments: localComments, ...localFields } = local;
  const { comments: remoteComments, ...remoteFields } = remote;
  const fields = pick(baseFields, localFields, remoteFields);
  const comments = mergeList(
    baseComments ?? [],
    localComments ?? [],
    remoteComments ?? [],
    mergeComment,
  );
  if (fields === localFields && comments === localComments) {
    return local;
  }
  return { ...fields, comments };
}

function mergeComment(base: ThoughtComment, local: ThoughtComment, remote: ThoughtComment) {
  return pick(base, local, remote);
}

/** Remote only when it alone changed; otherwise the local object itself. */
function pick<T>(base: T, local: T, remote: T): T {
  return same(local, base) && !same(remote, local) ? remote : local;
}

/**
 * Merge two edits of one list by id. Keeps local order; items only the remote
 * added go in after the remote item they followed. Returns `local` itself
 * when nothing changes, so callers can skip a store update.
 */
function mergeList<T extends { id: string }>(
  base: T[],
  local: T[],
  remote: T[],
  mergeItem: (base: T, local: T, remote: T) => T,
): T[] {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const remoteById = new Map(remote.map((x) => [x.id, x]));
  const localIds = new Set(local.map((x) => x.id));

  const out: T[] = [];
  for (const item of local) {
    const b = baseById.get(item.id);
    const r = remoteById.get(item.id);
    if (r) {
      out.push(b ? mergeItem(b, item, r) : item);
    } else if (!b) {
      // Added locally and not pushed yet.
      out.push(item);
    }
    // Otherwise it was removed on the server: drop it.
  }

  remote.forEach((item, i) => {
    if (localIds.has(item.id) || baseById.has(item.id)) {
      return;
    }
    // Added on the server: place it after its remote predecessor, or at the
    // end when that predecessor is gone locally.
    const prevAt = i === 0 ? -1 : out.findIndex((x) => x.id === remote[i - 1].id);
    const at = i === 0 ? 0 : prevAt === -1 ? out.length : prevAt + 1;
    out.splice(at, 0, item);
  });

  const unchanged = out.length === local.length && out.every((x, i) => x === local[i]);
  return unchanged ? local : out;
}

/**
 * Value equality, independent of key order: server rows come back from
 * Postgres `jsonb`, which orders keys differently from the app's objects.
 */
export function same(a: unknown, b: unknown): boolean {
  return a === b || stableJson(a) === stableJson(b);
}

function stableJson(v: unknown): string {
  return JSON.stringify(v, (_key, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : value,
  );
}
