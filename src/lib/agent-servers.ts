"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Local agent bridges that "Run agent" sends a task to — today only
 * Claude Code (`execute-cli/claude`, a Bun server that runs `claude -p` in a
 * project folder and streams its events back). The bridge also picks and
 * opens folders on the user's machine when Planner itself is deployed
 * (`bridgePickFolder`, `bridgeOpenFolder`).
 *
 * The URL and token are set in Settings → API keys and kept in
 * `planner_agent_servers` (owner-only RLS, see
 * `supabase/migrations/20261010010000_agent_servers.sql`), so they need a
 * signed-in user.
 */

export type AgentProvider = "claude-code";

export type AgentServer = { provider: AgentProvider; url: string; token: string };

export const AGENT_PROVIDER_LABEL: Record<AgentProvider, string> = {
  "claude-code": "Claude Code",
};

export const DEFAULT_SERVER_URL: Record<AgentProvider, string> = {
  "claude-code": "http://127.0.0.1:4319",
};

const EXECUTE_ROUTE: Record<AgentProvider, string> = {
  "claude-code": "/api/claude-code/execute",
};

const supabase = createClient();

export async function getServer(provider: AgentProvider): Promise<AgentServer | null> {
  const { data, error } = await supabase
    .from("planner_agent_servers")
    .select("provider, url, token")
    .eq("provider", provider)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** Trim the URL to its base (no trailing slash) so routes append cleanly. */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Server URL must start with http:// or https://");
  }
  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

export async function saveServer(server: AgentServer): Promise<AgentServer> {
  const row = { ...server, url: normalizeUrl(server.url), token: server.token.trim() };
  const { error } = await supabase
    .from("planner_agent_servers")
    .upsert(row, { onConflict: "user_id,provider" });
  if (error) {
    throw new Error(error.message);
  }
  return row;
}

export async function removeServer(provider: AgentProvider): Promise<void> {
  const { error } = await supabase.from("planner_agent_servers").delete().eq("provider", provider);
  if (error) {
    throw new Error(error.message);
  }
}

function authHeaders(server: AgentServer): Record<string, string> {
  return server.token ? { Authorization: `Bearer ${server.token}` } : {};
}

async function errorOf(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  return typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
}

/** Throws with the reason when the server is unreachable or rejects the token. */
export async function checkServer(server: AgentServer): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${normalizeUrl(server.url)}/health`, { headers: authHeaders(server) });
  } catch {
    throw new Error("Can't reach the server. Is it running, and is this site in allowedOrigins?");
  }
  if (!res.ok) {
    throw new Error(await errorOf(res));
  }
}

async function postBridge(server: AgentServer, route: string, body: object): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${normalizeUrl(server.url)}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(server) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the Claude Code server. Is it running?");
  }
  if (!res.ok) {
    throw new Error(await errorOf(res));
  }
  return res;
}

/** The OS folder picker, shown by the bridge on the user's machine. `null` when cancelled. */
export async function bridgePickFolder(server: AgentServer): Promise<string | null> {
  const body = (await (await postBridge(server, "/api/local/pick-folder", {})).json()) as {
    path?: unknown;
  };
  return typeof body.path === "string" ? body.path : null;
}

/** Open `path` in the OS file manager on the user's machine, through the bridge. */
export async function bridgeOpenFolder(server: AgentServer, path: string): Promise<void> {
  await postBridge(server, "/api/local/open-folder", { path });
}

/**
 * Answer a paused tool call: the bridge lets the agent go on (`allow`) or
 * tells it the user denied it.
 */
export async function answerPermission(
  server: AgentServer,
  bridgeRunId: string,
  requestId: string,
  allow: boolean,
): Promise<void> {
  await postBridge(server, "/api/claude-code/permission", {
    runId: bridgeRunId,
    requestId,
    allow,
  });
}

/** One line of the execute stream: Claude's `stream-json` events plus the bridge's own. */
export type AgentEvent = { type: string; [key: string]: unknown };

/**
 * POST the run and call `onEvent` per streamed event until the agent exits.
 * Payload order is the prompt order: 1. the "Copy context" text,
 * 2. the extra context. `onOpen` fires once the bridge accepted the run,
 * before the first event. Abort `signal` to stop the agent.
 */
export async function executeAgent(args: {
  server: AgentServer;
  projectPath: string;
  context: string;
  extraContext: string;
  signal: AbortSignal;
  onOpen?: () => void;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const { server } = args;
  let res: Response;
  try {
    res = await fetch(`${normalizeUrl(server.url)}${EXECUTE_ROUTE[server.provider]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(server) },
      body: JSON.stringify({
        projectPath: args.projectPath,
        context: args.context,
        extraContext: args.extraContext,
      }),
      signal: args.signal,
    });
  } catch (e) {
    if (args.signal.aborted) {
      throw e;
    }
    throw new Error("Can't reach the server. Is it running?");
  }
  if (!res.ok || !res.body) {
    throw new Error(await errorOf(res));
  }
  args.onOpen?.();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        args.onEvent(JSON.parse(line) as AgentEvent);
      } catch {
        args.onEvent({ type: "raw", text: line });
      }
    }
  }
}
