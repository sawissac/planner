# execute-cli/claude

Local bridge between Planner's **Run agent → Claude Code** and the `claude`
CLI on your computer. Planner posts a task to it; it runs `claude -p` in the
project folder you picked and keeps the run alive while it streams. What the
agent is doing shows live under the task's comments: the
`planner-for-claude-code` skill reports it with `planner.sh event`, the same
live progress a pasted **Copy context** link gets.

## Run

```bash
cd execute-cli/claude
bun install        # once, editor types only
bun start          # or: bun run dev (restarts on change)
```

On first start it copies the defaults from `config.example.json` into
`config.json` (git-ignored, mode 600) with a new random `token`, and prints
the URL it listens on (default `http://127.0.0.1:4319`).

Then in Planner: **Settings → API keys → Claude Code server**, paste the URL
and the `token` from `config.json`, **Save**, then **Test**.

The agent needs the skill installed globally (see
[`skills/README.md`](../../skills/README.md)):

```bash
cp -R skills/planner-for-claude-code ~/.claude/skills/
```

and your Plan API key saved with `planner.sh login --clipboard`
(`~/.claude/planner-token`).

## Config (`config.json`)

| Key                      | Default                                   | What it does                                                                                                       |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `host`                   | `127.0.0.1`                               | Bind address. Loopback only; anything else is refused.                                                             |
| `port`                   | `4319`                                    |                                                                                                                    |
| `token`                  | generated                                 | Bearer token Planner must send. Rotate by clearing it and restarting.                                              |
| `allowedOrigins`         | `localhost:3000` and the deployed Planner | Planner origins allowed to call the server (CORS). Add yours if you deploy elsewhere.                              |
| `approvalTimeoutMinutes` | `10`                                      | How long a paused tool call waits for Allow / Deny in Planner before it is denied.                                 |
| `timeoutMinutes`         | `30`                                      | A run is killed after this long.                                                                                   |
| `claude.bin`             | `claude`                                  | Path to the Claude Code CLI.                                                                                       |
| `claude.permissionMode`  | `acceptEdits`                             | `--permission-mode`. Headless runs cannot answer permission prompts, so pick what the agent may do without asking. |
| `claude.model`           | `""`                                      | `--model`, empty for your default.                                                                                 |
| `claude.allowedTools`    | `[]`                                      | `--allowedTools`, e.g. `["Bash(pnpm:*)", "Bash(git:*)"]`.                                                          |
| `claude.extraArgs`       | `[]`                                      | Any other CLI flags, appended as-is.                                                                               |

`planner.sh` (the skill's script) is always allowed, so the agent can read
the task, report its progress and post its completion comment.

## Approvals

Anything else that needs permission — running `node`, `pnpm`, `git`, a write
outside the folder — is **asked in Planner**. Each run gets
`permission-mcp.ts` as its `--permission-prompt-tool`: the tool call pauses,
the live panel under the task's comments shows what it wants to run with
**Allow** / **Deny**, and the agent continues with your answer. Answer from
the computer running the bridge (the buttons call it directly). No answer in
`approvalTimeoutMinutes` denies it; stopping or ending the run denies what is
still waiting.

To skip asking for things you always allow, list them in `allowedTools`
(`["Bash(pnpm:*)", "Bash(node:*)"]`), the project's `.claude/settings.json`,
or use `"permissionMode": "bypassPermissions"` for a trusted project.

Your normal Claude Code setup still applies: the CLI's login, `~/.claude`
settings and skills, and the project's own `.claude/settings.json` and
`CLAUDE.md`. Set `PLANNER_CLAUDE_CONFIG=/path/to/config.json` to use a config
elsewhere.

## API

All routes need `Authorization: Bearer <token>`. Requests with an `Origin`
must come from `allowedOrigins`; the `Host` must be loopback.

### `GET /health`

`200 { "ok": true, "name": "planner-claude-code", "version": "1.1.0" }`

### `POST /api/claude-code/execute`

```json
{
  "projectPath": "/Users/me/code/my-app",
  "context": "Do this plan\nhttp://localhost:3000/api/plan/<todoId>?fileId=<fileId>",
  "extraContext": "Use pnpm. Don't touch the migrations."
}
```

- `projectPath` — absolute path of an existing folder; the agent's working directory.
- `context` — the **Copy context** text (one-line ask + Plan API link).
- `extraContext` — optional free text.

The prompt is the two in that order:

```
<context>

Extra context:
<extraContext>
```

Response: `application/x-ndjson`, one JSON object per line: Claude's
`stream-json` events (`system`, `assistant`, `user`, `result`) framed by the
bridge's own:

```json
{"type":"planner","event":"start","pid":123,"cwd":"/Users/me/code/my-app"}
{"type":"planner","event":"exit","code":0}
```

Closing the request (Planner's **Stop** on the live run under the task's
comments, or closing the tab that started it) kills the run.

### `POST /api/claude-code/permission`

`{ "runId", "requestId", "allow": true | false }` → `{ "ok": true }`, or 404
when that request is no longer waiting. `runId` comes from the stream's
`start` line, `requestId` from its `permission_request` line:

```json
{"type":"planner","event":"permission_request","requestId":"…","tool":"Bash","detail":"node index.ts"}
{"type":"planner","event":"permission_resolved","requestId":"…","allow":true}
```

`POST /internal/permission` is the other end, called by `permission-mcp.ts`.

### `POST /api/local/pick-folder` · `POST /api/local/open-folder`

The OS folder picker (`{ "path": "/abs/path" }`, or `{ "path": null }` when
cancelled) and "open in Finder/Explorer" (`{ "path" }` → 204). Planner uses
them when it is not running on this machine (a deployed copy can't open
dialogs here); on localhost it uses its own `/api/local/*` routes.

```bash
curl -N -X POST http://127.0.0.1:4319/api/claude-code/execute \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"projectPath":"'"$PWD"'","context":"Say hi"}'
```
