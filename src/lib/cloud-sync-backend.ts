"use client";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/**
 * Supabase-backed replacement for the old Google Drive appdata backend.
 * Keeps the same shape (isSignedIn / onAuthChange / fetchRemote / pushRemote)
 * so `cloud-sync.ts`'s pull/push orchestration didn't need to change — only
 * the transport did.
 *
 * Storage is normalized (`planner_files` / `planner_groups` / `planner_todos`
 * / `planner_members` / `planner_settings`, RLS-scoped) rather than one JSONB
 * blob per user — see
 * `supabase/migrations/20260707000000_normalize_planner_schema.sql` in the
 * toolkits repo (this project shares that Supabase project; toolkits owns
 * the CLI-linked migrations). The fan-out across tables happens server-side
 * in the `upsert_planner_state` / `get_planner_state` RPCs, so this file
 * still does exactly one network call per push/pull — same as when it was a
 * single blob.
 */

let currentUser: User | null = null;
const listeners = new Set<(signedIn: boolean) => void>();

const supabase = createClient();

supabase.auth.getUser().then(({ data }) => {
  currentUser = data.user;
  listeners.forEach((fn) => fn(!!currentUser));
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  listeners.forEach((fn) => fn(!!currentUser));
});

export function onAuthChange(fn: (signedIn: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Synchronous check against the last-known auth state (updated by the listener above). */
export function isSignedIn(): boolean {
  return currentUser !== null;
}

/** Sign-in happens on the full-page `/login` form (Supabase email/password), not here. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export type RemotePayload = {
  version: 1;
  updatedAt: number;
  deviceId: string;
  todos: unknown;
  settings: unknown;
  users: unknown;
};

/** Minimal shapes this file cares about — mirrors `todoSlice`/`userSlice`. */
type RemoteGroup = { id: string; name: string };
type RemoteTodo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  doneAt: number | null;
  completedFrom: number;
  completedTo: number;
  priority: string | null;
  progress: string | null;
  assignees: string[];
  groupId: string | null;
  thought: string;
};
type RemoteFile = {
  id: string;
  name: string;
  icon?: string;
  groups: RemoteGroup[];
  todos: RemoteTodo[];
};
type RemoteTodosState = { files: RemoteFile[]; activeFileId: string | null };
type RemoteMember = { id: string; name: string; agenda: string };
type RemoteUsersState = { users: RemoteMember[] };

export async function fetchRemote(): Promise<RemotePayload | null> {
  if (!currentUser) {
    return null;
  }
  const { data, error } = await supabase.rpc("get_planner_state");
  if (error) {
    throw new Error(`Backup fetch failed: ${error.message}`);
  }
  return (data as RemotePayload | null) ?? null;
}

export async function pushRemote(payload: RemotePayload): Promise<void> {
  if (!currentUser) {
    throw new Error("Not signed in");
  }
  const todos = payload.todos as RemoteTodosState;
  const users = payload.users as RemoteUsersState;

  const files = todos.files.map((f, i) => ({
    ...f,
    position: i,
    groups: f.groups.map((g, gi) => ({ ...g, position: gi })),
    todos: f.todos.map((t, ti) => ({ ...t, position: ti })),
  }));
  const members = users.users.map((m, i) => ({ ...m, position: i }));

  const { error } = await supabase.rpc("upsert_planner_state", {
    p_files: files,
    p_active_file_id: todos.activeFileId,
    p_members: members,
    p_settings: payload.settings,
  });
  if (error) {
    throw new Error(`Backup push failed: ${error.message}`);
  }
}
