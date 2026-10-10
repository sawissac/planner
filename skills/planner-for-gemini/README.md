# Planner for Gemini

Gemini reads Planner tasks and works their comment threads through function
calling.

- [system-instructions.md](system-instructions.md): the system instructions.
- [function-declarations.json](function-declarations.json): one function per
  Plan API call.
- [run.mjs](run.mjs): a small chat client that runs those function calls
  against your Planner, so Gemini can actually read and post.

Gemini can't edit your files or run your app. For a coding plan it writes the
code in the chat, and its completion comment says the code still has to be
applied. Use the Claude Code or Cursor skill when you want the repo changed.

## Option A: run.mjs (recommended)

Runs on your machine, so it reaches `http://localhost:3000`. Needs Node 18+
and no packages.

1. Get a Gemini API key: [aistudio.google.com](https://aistudio.google.com) →
   **Get API key**.
2. Save your Planner key to `.claude/planner-token`: Planner → Settings → API
   keys → **Copy key for CLI**, then
   `.claude/skills/planner-for-claude-code/scripts/planner.sh login --clipboard`.
   (Or set `PLANNER_TOKEN` in your shell.)
3. Start the app (`pnpm dev`) and, from the repo root:

   ```bash
   export GEMINI_API_KEY=…   # keep it out of shell history, e.g. read from a password manager
   node skills/planner-for-gemini/run.mjs
   ```

4. Press **Copy context** on a task or comment in Planner, paste the curl at
   the `you>` prompt, and add "do this plan" if you like. An empty line or
   Ctrl-D ends the chat.

Paste the curl at the prompt rather than on the command line: inside double
quotes your shell would run `$(cat .claude/planner-token)`. `run.mjs` blanks
out any `Bearer …` key in what you type before sending it to Gemini anyway.

Settings: `GEMINI_MODEL` (default `gemini-flash-latest`), `PLANNER_URL`
(default `http://localhost:3000`), `PLANNER_TOKEN` / `PLANNER_TOKEN_FILE`.
`delete_comment` asks `[y/N]` in the terminal before it runs.

## Option B: AI Studio playground

Good for trying the prompt; slow for real work, because the playground does
not run function calls: you run each request yourself and paste back its
result.

1. [aistudio.google.com](https://aistudio.google.com) → **Create prompt**.
2. **System instructions**: paste `system-instructions.md`.
3. **Tools → Function calling → Edit**: paste `function-declarations.json`.
4. Paste a **Copy context** curl. When Gemini answers with a function call,
   run the matching request yourself, for example with
   `.claude/skills/planner-for-claude-code/scripts/planner.sh`
   (`list_comments` → `list <todoId> --open`, `add_comment` → `add`, …), and
   paste the JSON it prints as the function response.

## Errors

- `401`: wrong or revoked Planner key. Copy a new one and log in again.
- `404 Task not found.`: the task is not synced yet. Press **Sync** in Planner.
- `409`: the task id is in more than one file; include the `fileId`.
- `Gemini 400/403`: check `GEMINI_API_KEY` and `GEMINI_MODEL`.
