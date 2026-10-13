/**
 * Planner approval tool — a minimal MCP server (stdio, JSON-RPC 2.0, one
 * message per line) that the bridge hands to each headless run:
 *
 *   claude -p … --mcp-config '{"mcpServers":{"planner":…}}' \
 *              --permission-prompt-tool mcp__planner__approve
 *
 * When a tool call needs permission, Claude Code calls `approve` with
 * `{ tool_name, input }` instead of failing. This forwards the request to the
 * bridge (`POST /internal/permission`), which asks the user in Planner and
 * holds the request until they answer Allow or Deny there. The answer goes
 * back to Claude Code as the text `{"behavior":"allow","updatedInput":…}` or
 * `{"behavior":"deny","message":…}`.
 *
 * Env (set by the bridge): PLANNER_BRIDGE_URL, PLANNER_BRIDGE_TOKEN,
 * PLANNER_RUN_ID.
 */

type Message = { jsonrpc: "2.0"; id?: number | string; method?: string; params?: unknown };

const BRIDGE = process.env.PLANNER_BRIDGE_URL ?? "";
const TOKEN = process.env.PLANNER_BRIDGE_TOKEN ?? "";
const RUN_ID = process.env.PLANNER_RUN_ID ?? "";

const TOOL = {
  name: "approve",
  description:
    "Asks the user in Planner to allow or deny a tool call that needs permission, and waits for the answer.",
  inputSchema: {
    type: "object",
    properties: {
      tool_name: { type: "string", description: "The tool that wants to run." },
      input: { type: "object", description: "The tool call's input." },
      tool_use_id: { type: "string" },
    },
    required: ["tool_name", "input"],
  },
};

function write(message: object) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

type Decision =
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string };

async function ask(params: { tool_name?: unknown; input?: unknown }): Promise<Decision> {
  const input = (params.input ?? {}) as Record<string, unknown>;
  try {
    const res = await fetch(`${BRIDGE}/internal/permission`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ runId: RUN_ID, tool: String(params.tool_name ?? "tool"), input }),
    });
    const body = (await res.json()) as { allow?: boolean; message?: string };
    return body.allow
      ? { behavior: "allow", updatedInput: input }
      : { behavior: "deny", message: body.message || "The user denied this in Planner." };
  } catch (e) {
    return {
      behavior: "deny",
      message: `Couldn't ask the user for approval (${e instanceof Error ? e.message : String(e)}).`,
    };
  }
}

async function handle(msg: Message) {
  const { id, method } = msg;
  const reply = (result: unknown) => id !== undefined && write({ jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize": {
      const asked = (msg.params as { protocolVersion?: string } | undefined)?.protocolVersion;
      reply({
        protocolVersion: asked ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "planner", version: "1.0.0" },
      });
      return;
    }
    case "ping":
      reply({});
      return;
    case "tools/list":
      reply({ tools: [TOOL] });
      return;
    case "tools/call": {
      const p = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      if (p.name !== TOOL.name) {
        write({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool ${p.name}` } });
        return;
      }
      const decision = await ask(p.arguments ?? {});
      reply({ content: [{ type: "text", text: JSON.stringify(decision) }] });
      return;
    }
    default:
      // Notifications (no id) need no answer.
      if (id !== undefined) {
        write({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method ${method}` } });
      }
  }
}

let buffer = "";
const decoder = new TextDecoder();
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    try {
      void handle(JSON.parse(line) as Message);
    } catch {
      // Not JSON: ignore, as MCP clients only send JSON-RPC.
    }
  }
}
