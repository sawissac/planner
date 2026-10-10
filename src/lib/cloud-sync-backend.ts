"use client";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { TodosState } from "@/stores/slices/todoSlice";
import type { UsersState } from "@/stores/slices/userSlice";

/**
 * Supabase-backed replacement for the old Google Drive appdata backend.
 * Keeps the same shape (isSignedIn / onAuthChange / fetchRemote / pushRemote)
 * so `cloud-sync.ts`'s pull/push orchestration didn't need to change — only
 * the transport did.
 *
 * Storage is fully normalized (files, groups, todos, assignees, members,
 * settings and their lists each get an RLS-scoped table) — see
 * `supabase/migrations/20261006000000_planner_schema.sql`. The fan-out across
 * tables happens server-side in the `upsert_planner_state` /
 * `get_planner_state` RPCs, so this file still does exactly one network call
 * per push/pull. Array order is the stored order, so no position fields are
 * sent.
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
  const todos = payload.todos as TodosState;
  const users = payload.users as UsersState;

  const { error } = await supabase.rpc("upsert_planner_state", {
    p_files: todos.files,
    p_active_file_id: todos.activeFileId,
    p_members: users.users,
    p_settings: payload.settings,
  });
  if (error) {
    throw new Error(`Backup push failed: ${error.message}`);
  }
}
