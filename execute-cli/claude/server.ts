/**
 * Planner → Claude Code bridge.
 *
 *   bun run server.ts            # or: bun start
 *
 * A tiny local HTTP server that Planner's "Run agent → Claude Code" calls.
 * It runs the `claude` CLI headless (`claude -p`) inside the project folder
 * the user picked and streams Claude's `stream-json` events back as NDJSON,
 * one JSON object per line. What the agent is doing shows live in Planner
 * through the planner-for-claude-code skill's `event` reports (Firebase), so
 * the stream is only the run's lifeline: closing it stops the agent.
 *
 * Routes:
 *   GET  /health                    → { ok, name, version }   (token required)
 *   POST /api/claude-code/execute   → NDJSON stream           (token required)
 *        body: { projectPath, context, extraContext? }
 *   POST /api/claude-code/permission → { ok }                 (token required)
 *        body: { runId, requestId, allow }
 *   POST /api/local/pick-folder     → { path | null }         (token required)
 *   POST /api/local/open-folder     → 204                     (token required)
 *        body: { path }
 *   POST /internal/permission       → { allow, message? }     (token required)
 *        body: { runId, tool, input } — from permission-mcp.ts
 *
 * Approvals: each run gets `permission-mcp.ts` as its
 * `--permission-prompt-tool`, so a tool call that needs permission doesn't
 * fail — it waits. The bridge puts a `permission_request` line in the run's
 * stream (Planner shows Allow / Deny under the task's comments), holds the
 * request until `/api/claude-code/permission` answers it (or
 * `approvalTimeoutMinutes` passes: deny), and streams `permission_resolved`.
 *
 * The folder routes let a deployed Planner (whose own `/api/local/*` routes
 * refuse to run off localhost) pick and open folders on this machine.
 *
 * The prompt is built from the payload in this order:
 *   1. context       — the "Copy context" text (ask + Plan API link)
 *   2. extraContext  — free text the user typed in the Run agent dialog
 *
 * Settings live in `config.json` next to this file (copy
 * `config.example.json`). A missing token is generated and saved on first
 * start. The server only binds to loopback, checks the Host header (DNS
 * rebinding), the Origin (CORS allowlist) and a bearer token, because it
 * runs an agent that can edit files on this machine.
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

type Config = {
  host: string;
  port: number;
  token: string;
  allowedOrigins: string[];
  timeoutMinutes: number;
  approvalTimeoutMinutes: number;
  claude: {
    bin: string;
    permissionMode: string;
    model: string;
    allowedTools: string[];
    extraArgs: string[];
  };
};

type ExecutePayload = {
  projectPath: string;
  context: string;
  extraContext?: string;
};

const VERSION = "1.2.0";
const HERE = dirname(new URL(import.meta.url).pathname);
const CONFIG_PATH = process.env.PLANNER_CLAUDE_CONFIG ?? join(HERE, "config.json");
const EXAMPLE_PATH = join(HERE, "config.example.json");
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const MAX_BODY_CHARS = 200_000;

function loadConfig(): Config {
  const base = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8")) as Config;
  const own: Partial<Config> = existsSync(CONFIG_PATH)
    ? (JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>)
    : {};
  const config: Config = { ...base, ...own, claude: { ...base.claude, ...own.claude } };
  if (!config.token) {
    config.token = `pcc_${randomBytes(24).toString("base64url")}`;
    writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    console.log(`[planner-claude] generated a token and saved it to ${CONFIG_PATH}`);
  }
  if (!LOOPBACK.has(config.host)) {
    throw new Error(`host must be a loopback address, got "${config.host}"`);
  }
  return config;
}

const config = loadConfig();
const running = new Set<{ kill: () => void }>();

type Decision = { allow: boolean; message?: string };

/** Live runs by id: their stream, and approvals waiting on the user. */
const runs = new Map<
  string,
  { send: (o: unknown) => void; pending: Map<string, (d: Decision) => void> }
>();

/** The most telling field of a tool call's input, for the approval prompt. */
function toolDetail(input: Record<string, unknown>): string {
  const pick =
    input.command ??
    input.file_path ??
    input.notebook_path ??
    input.pattern ??
    input.path ??
    input.url;
  return typeof pick === "string" ? pick.slice(0, 2000) : JSON.stringify(input).slice(0, 500);
}

/** Ask the user (through the run's stream) and wait for Allow / Deny. */
function requestPermission(runId: string, tool: string, input: Record<string, unknown>) {
  const run = runs.get(runId);
  if (!run) {
    return Promise.resolve<Decision>({ allow: false, message: "This run is no longer live." });
  }
  const requestId = randomUUID();
  return new Promise<Decision>((resolve) => {
    const timer = setTimeout(
      () =>
        finish({
          allow: false,
          message: `No answer in Planner within ${config.approvalTimeoutMinutes} minutes.`,
        }),
      config.approvalTimeoutMinutes * 60_000,
    );
    function finish(d: Decision) {
      clearTimeout(timer);
      if (!run?.pending.delete(requestId)) {
        return;
      }
      run.send({ type: "planner", event: "permission_resolved", requestId, ...d });
      resolve(d);
    }
    run.pending.set(requestId, finish);
    run.send({
      type: "planner",
      event: "permission_request",
      requestId,
      tool,
      detail: toolDetail(input),
    });
    console.log(`[planner-claude] run ${runId} asks: ${tool} ${toolDetail(input).slice(0, 80)}`);
  });
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !config.allowedOrigins.includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return Response.json(body, { status, headers: cors });
}

function tokenOk(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(config.token);
  return given.length === want.length && timingSafeEqual(given, want);
}

function parsePayload(raw: unknown): ExecutePayload | string {
  if (!raw || typeof raw !== "object") {
    return "Body must be a JSON object.";
  }
  const { projectPath, context, extraContext } = raw as Record<string, unknown>;
  if (typeof projectPath !== "string" || !isAbsolute(projectPath)) {
    return "projectPath must be an absolute path.";
  }
  if (typeof context !== "string" || !context.trim()) {
    return "context is required.";
  }
  if (extraContext !== undefined && typeof extraContext !== "string") {
    return "extraContext must be a string.";
  }
  if (context.length + (extraContext?.length ?? 0) > MAX_BODY_CHARS) {
    return "context is too long.";
  }
  return { projectPath: resolve(projectPath), context, extraContext };
}

/** 1. Copy context text, 2. Extra context — the order the Run agent dialog shows. */
function buildPrompt({ context, extraContext }: ExecutePayload): string {
  const extra = extraContext?.trim();
  return extra ? `${context.trim()}\n\nExtra context:\n${extra}` : context.trim();
}

const HOME = process.env.HOME ?? "";
const PLANNER_SCRIPT = ".claude/skills/planner-for-claude-code/scripts/planner.sh";
/** The skill installed globally (`~/.claude/skills`), as Planner's README sets it up. */
const GLOBAL_SCRIPT = HOME ? join(HOME, PLANNER_SCRIPT) : "";

/**
 * The run exists to work on a Planner task, and the skill reaches the task —
 * and reports its live progress — only through `planner.sh`, so that script
 * is always allowed, wherever the skill is installed (the project or
 * `~/.claude`) and however it is spelled. Headless runs cannot approve a
 * prompt for it.
 */
function plannerRules(projectPath: string): string[] {
  const paths = [PLANNER_SCRIPT, `./${PLANNER_SCRIPT}`, join(projectPath, PLANNER_SCRIPT)];
  if (GLOBAL_SCRIPT) {
    paths.push(GLOBAL_SCRIPT, `~/${PLANNER_SCRIPT}`, `$HOME/${PLANNER_SCRIPT}`);
  }
  return paths.map((p) => `Bash(${p}:*)`);
}

/** What a headless run must know that the skill alone doesn't say. */
function plannerSystemPrompt(projectPath: string): string {
  const lines = [
    "This run was started from Planner's Run agent dialog, in the project folder the user picked:",
    `  ${projectPath}`,
    "Work in that folder. Use the planner-for-claude-code skill for the task link, and report live",
    "progress with its `event` command (start, a step per milestone, then done or fail): the user",
    "watches it in Planner. Tool calls that need permission are sent to the user in Planner to",
    "Allow or Deny; just make the call and wait. Nobody can answer a free-form question: if you are",
    "blocked or denied, say what you need in the completion comment and report `fail`.",
    "Never curl or WebFetch the Plan API link yourself: the skill's script adds the key.",
  ];
  if (!existsSync(join(projectPath, PLANNER_SCRIPT)) && GLOBAL_SCRIPT) {
    lines.push(`The skill's script: ${GLOBAL_SCRIPT} (call it by that absolute path).`);
  }
  return lines.join("\n");
}

/** The approval tool, as an MCP server Claude Code starts for this run only. */
function mcpConfig(runId: string): string {
  return JSON.stringify({
    mcpServers: {
      planner: {
        type: "stdio",
        command: process.execPath,
        args: ["run", join(HERE, "permission-mcp.ts")],
        env: {
          PLANNER_BRIDGE_URL: `http://127.0.0.1:${config.port}`,
          PLANNER_BRIDGE_TOKEN: config.token,
          PLANNER_RUN_ID: runId,
        },
      },
    },
  });
}

const APPROVE_TOOL = "mcp__planner__approve";

function claudeArgs(prompt: string, projectPath: string, runId: string): string[] {
  const c = config.claude;
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];
  if (c.permissionMode) {
    args.push("--permission-mode", c.permissionMode);
  }
  if (c.model) {
    args.push("--model", c.model);
  }
  args.push("--append-system-prompt", plannerSystemPrompt(projectPath));
  args.push("--mcp-config", mcpConfig(runId), "--permission-prompt-tool", APPROVE_TOOL);
  const allowed = [...plannerRules(projectPath), APPROVE_TOOL, ...c.allowedTools];
  args.push("--allowedTools", allowed.join(","));
  return [...args, ...c.extraArgs];
}

/**
 * Session markers a parent Claude Code sets in its terminal. Started from
 * one (e.g. VS Code's integrated terminal), the child `claude` would think it
 * is a nested session of that window; drop them so each run starts fresh.
 */
const PARENT_SESSION_ENV = [
  "CLAUDECODE",
  "CLAUDE_PID",
  "CLAUDE_AGENT_SDK_VERSION",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
];

function childEnv(): Record<string, string | undefined> {
  const env = { ...process.env };
  for (const key of PARENT_SESSION_ENV) {
    delete env[key];
  }
  return env;
}

function execute(payload: ExecutePayload, signal: AbortSignal, cors: Record<string, string>) {
  const runId = randomUUID();
  const proc = Bun.spawn(
    [config.claude.bin, ...claudeArgs(buildPrompt(payload), payload.projectPath, runId)],
    {
      cwd: payload.projectPath,
      env: childEnv(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const handle = { kill: () => proc.kill() };
  running.add(handle);
  const timer = setTimeout(() => proc.kill(), config.timeoutMinutes * 60_000);
  signal.addEventListener("abort", () => proc.kill());
  console.log(`[planner-claude] pid ${proc.pid} in ${payload.projectPath}`);

  const encoder = new TextEncoder();
  const line = (o: unknown) => encoder.encode(`${JSON.stringify(o)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch {
          // Client went away; the abort listener kills the process.
        }
      };
      const pending = new Map<string, (d: Decision) => void>();
      runs.set(runId, { send: (o) => send(line(o)), pending });
      send(
        line({ type: "planner", event: "start", runId, pid: proc.pid, cwd: payload.projectPath }),
      );
      const stderr = new Response(proc.stderr).text();
      // Claude already writes one JSON object per line: pass it through.
      for await (const chunk of proc.stdout) {
        send(chunk);
      }
      const code = await proc.exited;
      clearTimeout(timer);
      running.delete(handle);
      for (const finish of [...pending.values()]) {
        finish({ allow: false, message: "The run ended." });
      }
      runs.delete(runId);
      const err = (await stderr).trim();
      send(
        line({
          type: "planner",
          event: "exit",
          code,
          ...(err ? { stderr: err.slice(-4000) } : {}),
        }),
      );
      console.log(`[planner-claude] pid ${proc.pid} exited ${code}`);
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      proc.kill();
    },
  });

  return new Response(stream, {
    headers: { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}

/** Five minutes to choose a folder before the picker is given up on. */
const PICK_TIMEOUT_MS = 5 * 60 * 1000;
const PICK_PROMPT = "Choose a project folder";

/** Picker command per platform; a non-zero exit means "cancelled". */
function pickerCommand(): string[] {
  switch (process.platform) {
    case "darwin":
      return ["osascript", "-e", `POSIX path of (choose folder with prompt "${PICK_PROMPT}")`];
    case "win32":
      return [
        "powershell.exe",
        "-NoProfile",
        "-STA",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms;" +
          "$d = New-Object System.Windows.Forms.FolderBrowserDialog;" +
          `$d.Description = '${PICK_PROMPT}';` +
          "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath } else { exit 1 }",
      ];
    default:
      return ["zenity", "--file-selection", "--directory", `--title=${PICK_PROMPT}`];
  }
}

/** Show the native folder picker; `null` when the user cancels. */
async function pickFolder(): Promise<string | null> {
  const proc = Bun.spawn(pickerCommand(), { stdout: "pipe", stderr: "ignore" });
  const timer = setTimeout(() => proc.kill(), PICK_TIMEOUT_MS);
  const out = (await new Response(proc.stdout).text()).trim();
  const code = await proc.exited;
  clearTimeout(timer);
  if (code !== 0 || !out) {
    return null;
  }
  // macOS returns a trailing slash; keep "/" itself.
  return out.length > 1 ? out.replace(/[\\/]+$/, "") : out;
}

/** Open a directory in the OS file manager (Finder / Explorer / xdg-open). */
function openFolder(path: string): void {
  const [file, ...args] =
    process.platform === "darwin"
      ? // A bundle (Foo.app) is a directory `open` would launch: reveal it instead.
        ["open", ...(/\.app$/i.test(path) ? ["-R", path] : [path])]
      : process.platform === "win32"
        ? ["explorer.exe", path]
        : ["xdg-open", path];
  spawn(file, args, { detached: true, stdio: "ignore" }).unref();
}

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  // A run streams for minutes; don't drop quiet connections.
  idleTimeout: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);
    const host = request.headers.get("host") ?? "";

    if (!LOOPBACK.has(new URL(`http://${host}`).hostname)) {
      return json({ error: "Bad host." }, 403, {});
    }
    if (origin && !cors["Access-Control-Allow-Origin"]) {
      return json({ error: `Origin ${origin} is not in allowedOrigins.` }, 403, {});
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!tokenOk(request)) {
      return json({ error: "Missing or wrong token." }, 401, cors);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, name: "planner-claude-code", version: VERSION }, 200, cors);
    }

    if (url.pathname === "/internal/permission" && request.method === "POST") {
      // From permission-mcp.ts (no Origin): held open until the user answers.
      const body = (await request.json().catch(() => null)) as {
        runId?: unknown;
        tool?: unknown;
        input?: unknown;
      } | null;
      if (typeof body?.runId !== "string") {
        return json({ allow: false, message: "runId is required." }, 400, cors);
      }
      const input =
        body.input && typeof body.input === "object" ? (body.input as Record<string, unknown>) : {};
      const decision = await requestPermission(body.runId, String(body.tool ?? "tool"), input);
      return json(decision, 200, cors);
    }

    if (url.pathname === "/api/claude-code/permission" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as {
        runId?: unknown;
        requestId?: unknown;
        allow?: unknown;
      } | null;
      const finish =
        typeof body?.runId === "string" && typeof body.requestId === "string"
          ? runs.get(body.runId)?.pending.get(body.requestId)
          : undefined;
      if (!finish) {
        return json(
          { error: "That request is no longer waiting (answered, timed out or the run ended)." },
          404,
          cors,
        );
      }
      finish(
        body?.allow === true
          ? { allow: true }
          : { allow: false, message: "The user denied this in Planner." },
      );
      return json({ ok: true }, 200, cors);
    }

    if (url.pathname === "/api/local/pick-folder" && request.method === "POST") {
      return json({ path: await pickFolder() }, 200, cors);
    }

    if (url.pathname === "/api/local/open-folder" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
      const path = body?.path;
      if (typeof path !== "string" || !isAbsolute(path)) {
        return json({ error: "path must be an absolute path." }, 400, cors);
      }
      if (!existsSync(path) || !statSync(path).isDirectory()) {
        return json({ error: `Folder not found: ${path}` }, 404, cors);
      }
      openFolder(path);
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/claude-code/execute" && request.method === "POST") {
      if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
        return json({ error: "Content-Type must be application/json." }, 415, cors);
      }
      const payload = parsePayload(await request.json().catch(() => null));
      if (typeof payload === "string") {
        return json({ error: payload }, 400, cors);
      }
      if (!existsSync(payload.projectPath) || !statSync(payload.projectPath).isDirectory()) {
        return json({ error: `Not a folder: ${payload.projectPath}` }, 400, cors);
      }
      return execute(payload, request.signal, cors);
    }

    return json({ error: "Not found." }, 404, cors);
  },
});

console.log(`[planner-claude] listening on http://${server.hostname}:${server.port}`);
console.log(`[planner-claude] allowed origins: ${config.allowedOrigins.join(", ")}`);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    for (const r of running) {
      r.kill();
    }
    process.exit(0);
  });
}
