---
name: planner-for-claude-code
description: Read a Planner task's thought, carry out the plan it describes, and create, read, edit, replace, or delete its comments through the local Plan API (/api/plan/<todoId>/comment). Use when the user pastes a Planner "Copy context" link (an /api/plan/... URL, or an older curl around one) alone or with "do this plan", or asks to read, reply to, add, update, or remove comments on a Planner task/thought. "login planner" means: run `planner.sh login --clipboard`. A link that points at a comment means: solve any unresolved section in it (e.g. **Bug**) and rewrite it as **Bug (Resolved)**. Reports live progress to the app while working (`planner.sh event` start/step/ask/done/fail). After finishing a plan, posts a completion comment on the task.
---

# Planner for Claude Code

Talk to the Planner app's third-party Plan API (`src/app/api/plan/**`) with
`scripts/planner.sh`. Every call runs as the signed-in user (Supabase RLS).

Script: `.claude/skills/planner-for-claude-code/scripts/planner.sh` (path relative to repo root).

## Setup

1. The app must be running (default `http://localhost:3000`; override with
   `PLANNER_URL` or `--base <url>`). Check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`.
2. Token. The app's "Copy context" button (`CopyApiUrlButton`) copies a bare
   link with no secret in it, like Figma's "Copy link to selection", under a
   one-line ask — `Do this plan` (thought) or `Solve this comment` (comment):
   ```
   Solve this comment
   http://localhost:3000/api/plan/<todoId>/comment/<commentId>?fileId=<fileId>
   ```
   Never curl it yourself — use the script, which adds the key. (Older copies
   were a curl around the same URL; treat them the same.) The key lives in `.claude/planner-token`
   (mode 600, git-ignored; `PLANNER_TOKEN` env var overrides it). Never read,
   cat, grep or print that file — use the script. It is a Plan API key (`pln_…`) that lasts until revoked.
   - **"login planner"** from the user: they just pressed Settings → API
     keys → **Copy key for CLI**. Run `planner.sh login --clipboard` and report
     its output (path and last four characters only).
   - **No token yet** (`planner: no token`) or `HTTP 401` (revoked key): ask
     the user to press Settings → API keys → **Copy key for CLI** and type
     "login planner", then run `planner.sh login --clipboard`. It reads the key from the clipboard,
     saves it, and clears the clipboard, so the key never enters the chat.
   - **Old curl with a literal key** pasted in chat (`Bearer pln_…` or a JWT):
     `planner.sh login '<curl>'` still works, but tell the user the key is
     now in this transcript and they should revoke it and use the clipboard
     flow. A JWT expires after ~1 hour.
   - `HTTP 503` on a `pln_` key: the server lacks `SUPABASE_SECRET_KEY`.
3. IDs. Get them from the pasted link: `planner.sh parse '<url>'` prints
   `todoId=… commentId=… fileId=… base=…`. Always pass `--file <fileId>` when known,
   and `--base <base>` when it is not `http://localhost:3000` —
   task ids are only unique per file and the API answers `409` without it when
   ambiguous.

Never print the token in replies, commit it, or put it in a URL.

## Commands

Options go before the command: `planner.sh [--file <fileId>] [--base <url>] [--full] <command> …`

| Command                               | API                             | Result                                                                                                       |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `thought <todoId>`                    | `GET /api/plan/<todoId>`        | `{thought}`                                                                                                  |
| `list <todoId> [--open]`              | `GET …/comment[?open=1]`        | `{thought, comments:[{id, comment}]}`, oldest first; `--open` drops settled comments and adds `settled: <n>` |
| `get <todoId> <commentId>`            | `GET …/comment/<id>`            | `{comment}`                                                                                                  |
| `open <todoId> <commentId>`           | `GET …/comment/<id>`            | plain text: only the open sections, or `no open sections`                                                    |
| `add <todoId> <body\|->`              | `POST …/comment`                | `{id, comment}` (201, server id)                                                                             |
| `put <todoId> <commentId> <body\|->`  | `PUT …/comment/<id>`            | creates (201) or replaces (200)                                                                              |
| `edit <todoId> <commentId> <body\|->` | `PATCH …/comment/<id>`          | edits existing; 404 if missing                                                                               |
| `delete <todoId> <commentId>`         | `DELETE …/comment/<id>`         | `{"status": 204}`                                                                                            |
| `event <todoId> <type> [text\|-]`     | `POST /api/plan/<todoId>/event` | run status; see **Live progress**                                                                            |

- Bodies are Markdown, rendered by an MDX editor: never write a bare `<word>` outside backticks (e.g. `<agent>`) — it parses as a JSX tag and the comment fails to open. Wrap it in backticks or reword. Use `-` and a heredoc for anything multi-line or with quotes:

  ```bash
  S=.claude/skills/planner-for-claude-code/scripts/planner.sh
  $S --file default add 9wdlMuuBTE0NJ5_NehdsO - <<'EOF'
  Reply from Claude:

  - point one
  - point two
  EOF
  ```

- Write commands and `get` drop the echoed `thought` to keep output small; add
  `--full` to keep it. `list` and `thought` always include it.
- Errors print `HTTP <status>: {"error": …}` to stderr and exit 1. Common:
  401 bad/expired token, 404 task or comment not found, 409 ambiguous task id
  (add `--file`), 400 empty body / unknown field.
- The API reads the cloud copy. A `404 Task not found.` for a task the user
  can see usually means it is not synced yet: ask them to press **Sync** (or
  turn on auto-save) and resend the link.

## Live progress

While you work on a task, the app shows what you are doing live under the
task's comments (Firebase Realtime Database), and pops a "finished" toast
(bottom right, with Close) when you report `done` or `fail`. Report with `event`;
pass the same `--file` as the other calls, and `--comment <commentId>` when
the link was a comment:

| Type    | When                                                                                              | Text                                                                              |
| ------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `start` | right after reading the task, before any work                                                     | one line: what you are about to do                                                |
| `step`  | at each milestone — starting a plan item, before editing a group of files, before running checks  | one line, present tense: `Editing the sidebar rail`, `Running typecheck and lint` |
| `ask`   | when you stop to ask the user something or wait on them (a decision, a permission, a missing key) | the question, as asked                                                            |
| `done`  | after the completion comment is posted (or the comment rewritten)                                 | the one-line outcome from that comment                                            |
| `fail`  | when you give up or are blocked and end your turn                                                 | why, and what the user should do                                                  |

```bash
$S --file <fileId> event <todoId> start "Do this plan: add the export button"
$S --file <fileId> event <todoId> step "Adding ExportButton to the toolbar"
$S --file <fileId> event <todoId> done "Export button added; typecheck and lint pass"
```

- Keep it coarse: roughly one `step` per plan item or open section plus one
  for verification — not one per tool call. Plain text, one line, no code,
  never the token.
- Every run ends with `done` or `fail`, also after an `ask` the user answered.
  After an `ask`, the next `step` puts the run back to working.
- `event` never fails your command: if it prints `event not recorded`, carry
  on and don't retry.

## Workflow

**Route the pasted link first** (`planner.sh parse '<url>'`):

- URL has a `commentId` → **Solve the comment's open sections** (below).
  Do not re-run the task's plan.
- URL has no `commentId` (or the user says "do this plan") → **Carry out a
  plan** (below).

### Solve the comment's open sections

The user writes new asks into an existing comment as a bold heading line plus
items, e.g.:

```markdown
**Bug**

- update the ai key provider icon
- it ui feel a little odd. make it combined styles.
```

0. `event … --comment <commentId> start` (see **Live progress**) once the
   link is parsed.
1. `$S --file <fileId> open <todoId> <commentId>` prints only the **open
   sections**: each line that is only a bold heading (`**Bug**`, `**Fix**`,
   `**Request**`, …) not marked `(Resolved)`, with its items, plus a
   `(Partly resolved)` section's Resolved Message (it says what stays open).
2. **`no open sections`** → change nothing; tell the user the comment is
   fully resolved, and report `done "Nothing open in this comment"`. Do not
   fetch the thread.
3. **Open sections** → treat their items as the user's instructions and do
   them now, without asking first — the user put them there for you. For
   context read the thought (`thought <todoId>`), and other comments only if
   an item refers to them. Ask only when an item is genuinely ambiguous in a
   way the code can't settle; otherwise pick a sensible reading and state it
   in the resolved message.
   Report a `step` as you start each section.
4. Verify (typecheck, lint, the running app) — a `step` first.
5. **Rewrite that same comment** — do not `add` a new one. Keep everything
   outside the open sections byte-for-byte; replace each open section with:

   ```markdown
   **Bug (Resolved)**

   > <original item 1, verbatim>
   >
   > <original item 2, verbatim>

   **Resolved Message**

   - <each item → what changed, with key file paths>

   Verified: <checks run>. Not committed.
   ```

   Quote the user's wording as-is (typos included); reuse the section's own
   heading word (`Bug`, `Fix`, …) plus ` (Resolved)`. If some items were
   skipped or blocked, use `(Partly resolved)` and say which stay open — the
   next run picks those up. `get` the full body only now, rewrite it, then
   `edit` with the full body.

6. Report `done` with the outcome (or `fail` if a section stays blocked).
7. On `401`, keep the rewritten body and ask the user to re-copy the key
   (Setup step 2); post it once `login --clipboard` succeeds.

### Carry out a plan

0. `event <todoId> start` (see **Live progress**).
1. `list <todoId> --open` — the thought is the plan; the comments left may
   add to or amend it. Settled ones (`**Done**` notes, fully resolved
   requests) are dropped; `settled: <n>` says how many. Run plain `list` only
   if the plan refers to earlier history.
2. Do the work in the repo, verify it (typecheck, lint, the running app),
   reporting a `step` per plan item and before verifying, and an `ask`
   whenever you stop to ask the user.
3. **When done, post a completion comment** with `add`. Write it for the
   task's reader, in Markdown:

   ```bash
   $S --file <fileId> add <todoId> - <<'EOF'
   **Done** — <one-line outcome>

   - <each plan item → what changed, with key file paths>
   - <anything left for the user: commands to run, decisions, follow-ups>

   Verified: <checks run>. Not committed.
   EOF
   ```

   Keep it short: one bullet per plan item, no code dumps, never the token.
   If part of the plan was skipped or blocked, say so in the comment rather
   than marking it done.

4. Report `done` with the comment's one-line outcome — or `fail` if the plan
   was blocked.
5. On `401` at this point, keep the drafted comment, tell the user it could
   not be posted, and ask them to re-copy the key (Setup step 2); post it
   once `login --clipboard` succeeds.

### Other comment actions

- **Read a thread**: `list <todoId>` (`--open` for what still needs work); summarize the thought and each comment by id.
- **Reply / add**: `add` (server picks id). Use `put` only when a stable,
  caller-chosen id is wanted (idempotent upsert).
- **Edit**: `get` first, then `edit` with the full new body (it replaces, no merge).
- **Delete**: destructive and not undoable — confirm with the user first unless
  they named the exact comment to delete. Clean up any test comments you create.
