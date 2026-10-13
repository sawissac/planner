"use client";

import { nanoid } from "@reduxjs/toolkit";

import { bridgeOpenFolder, bridgePickFolder, getServer } from "@/lib/agent-servers";
import { createClient } from "@/lib/supabase/client";

/**
 * Saved project folders: the sidebar's Projects pane, and the folder the Run
 * agent dialog asks for before an agent starts.
 *
 * Rows live in `project_paths` (owner-only RLS, see
 * `supabase/migrations/20261010030000_restore_agent_servers_project_paths.sql`),
 * so they need a signed-in user. Choosing a folder and opening one in the OS
 * file manager go through the local-only routes under `src/app/api/local/`
 * while the app runs on the user's own computer; a deployed copy (whose
 * local routes refuse with 403) asks the Claude Code bridge on the user's
 * machine instead (`execute-cli/claude`).
 */

export type ProjectPath = { id: string; path: string; name: string };

const supabase = createClient();

const COLUMNS = "id, path, name";

/** Last segment of a path, for the default display name. */
export function folderName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function fail(error: { code?: string; message: string }): never {
  // 23505: unique (user_id, path).
  throw new Error(error.code === "23505" ? "That folder is already saved." : error.message);
}

/** Every saved path, oldest first. */
export async function listPaths(): Promise<ProjectPath[]> {
  const { data, error } = await supabase.from("project_paths").select(COLUMNS).order("created_at");
  if (error) {
    fail(error);
  }
  return data;
}

export async function addPath(path: string): Promise<ProjectPath> {
  const entry: ProjectPath = { id: nanoid(), path, name: folderName(path) };
  const { error } = await supabase.from("project_paths").insert(entry);
  if (error) {
    fail(error);
  }
  return entry;
}

export async function renamePath(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("project_paths").update({ name }).eq("id", id);
  if (error) {
    fail(error);
  }
}

export async function removePath(id: string): Promise<void> {
  const { error } = await supabase.from("project_paths").delete().eq("id", id);
  if (error) {
    fail(error);
  }
}

/** The app runs off localhost: its local routes would refuse (403). */
const deployed = () => !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

async function bridge() {
  const server = await getServer("claude-code");
  if (!server) {
    throw new Error(
      "Planner isn't running on this computer: start the Claude Code server (execute-cli/claude) and set it in Settings → API keys to pick folders.",
    );
  }
  return server;
}

async function postLocal(route: string, body?: object): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/local/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
  }
  return json;
}

/** Show the OS folder picker. `null` when the user cancels. */
export async function pickFolder(): Promise<string | null> {
  if (deployed()) {
    return bridgePickFolder(await bridge());
  }
  const { path } = await postLocal("pick-folder");
  return typeof path === "string" ? path : null;
}

/** Open a saved path in the OS file manager. */
export async function openPath(entry: ProjectPath): Promise<void> {
  if (deployed()) {
    await bridgeOpenFolder(await bridge(), entry.path);
    return;
  }
  await postLocal("open-folder", { id: entry.id });
}
