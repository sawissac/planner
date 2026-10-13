---
name: planner-for-claude-code
description: Work on tasks from the Planner app. Paste a task link and Claude reads the plan written on it, does the work, shows its progress live in the app, and leaves a "Done" comment when finished. Paste a link to a comment and Claude fixes whatever is still open in it (like a **Bug** list) and marks it **Resolved**. Also reads, adds, edits, and deletes comments on a task. Use when the user pastes a Planner "Copy context" link (a URL containing /api/plan/, or an older curl command wrapping one), says "do this plan", or asks about comments on a Planner task. When the user says "login planner", save their API key by running `planner.sh login --clipboard`.
---

# Planner for Claude Code

Work with Planner tasks through `planner.sh`, which calls the app's Plan API
(`src/app/api/plan/**`) as the signed-in user.

- **Task**: one row in Planner (`todoId`).
- **Thought**: the plan written on a task, in Markdown.
- **Comment**: a note under a task (`commentId`).
- **File**: the Planner file the task lives in (`fileId`).

The script is installed globally. Always call it by this path:

```bash
S=~/.claude/skills/planner-for-claude-code/scripts/planner.sh
```

## Setup

1. **App running.** Default `http://localhost:3000`; change it with
   `PLANNER_URL` or `--base <url>`. Check:
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
2. **API key.** The user's "Copy context" button copies a request line plus a
   link with no secret in it (older versions wrapped it in curl; treat the
   same):

   ```
   Solve this comment
   http://localhost:3000/api/plan/<todoId>/comment/<commentId>?fileId=<fileId>
   ```

   Never curl the link yourself; the script adds the key. The key (`pln_…`,
   valid until revoked) lives in `~/.claude/planner-token`, or
   `PLANNER_TOKEN` if set. Never read, print, or commit it, or put it in a URL.
   - **"login planner"**, **`planner: no token`**, or **`HTTP 401`**: if the
     user has not just copied the key, ask them to press Settings → API keys →
     **Copy key for CLI** and say "login planner". Then run
     `$S login --clipboard` and report its output (path and last four
     characters only). It reads, saves, and clears the clipboard.
   - **Old curl with the key in it** (`Bearer pln_…` or a JWT):
     `$S login '<curl>'` works, but tell the user the key is now in the chat
     and they should revoke it. A JWT expires in about an hour.
   - **`HTTP 503` with a `pln_` key**: the server lacks `SUPABASE_SECRET_KEY`.

3. **Ids.** `$S parse '<url>'` prints `todoId=… commentId=… fileId=… base=…`.
   Always pass `--file <fileId>` (task ids repeat across files → `409`), and
   `--base <base>` when it is not localhost:3000.

## Commands

`planner.sh [--file <fileId>] [--base <url>] [--full] <command> …`

| Command                               | Does                                    | Returns                                                                                  |
| ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `thought <todoId>`                    | Read the plan                           | `{thought}`                                                                              |
| `list <todoId> [--open]`              | Read plan + comments, oldest first      | `{thought, comments:[{id, comment}]}`; `--open` hides finished ones, adds `settled: <n>` |
| `get <todoId> <commentId>`            | Read one comment                        | `{comment}`                                                                              |
| `open <todoId> <commentId>`           | Show a comment's unfinished sections    | Plain text, or `no open sections`                                                        |
| `add <todoId> <body\|->`              | Add a comment (app picks id)            | `{id, comment}`                                                                          |
| `put <todoId> <commentId> <body\|->`  | Create with this id, or replace         | `201` / `200`                                                                            |
| `edit <todoId> <commentId> <body\|->` | Replace an existing comment's full text | `404` if missing                                                                         |
| `delete <todoId> <commentId>`         | Delete a comment                        | `{"status": 204}`                                                                        |
| `event <todoId> <type> [text\|-]`     | Report live progress                    | See **Live progress**                                                                    |

- **Comment text** is Markdown in a JSX-aware editor: a bare `<word>` outside
  backticks breaks the comment. Wrap it in backticks. For multi-line text or
  quotes, pass `-` and a heredoc:

  ```bash
  $S --file default add 9wdlMuuBTE0NJ5_NehdsO - <<'EOF'
  Reply from Claude:

  - point one
  EOF
  ```

- `get` and write commands omit the plan text; `--full` keeps it.
- Errors print `HTTP <status>: {"error": …}` and exit 1: `401` bad key, `404`
  not found, `409` ambiguous task (add `--file`), `400` empty body or unknown
  field.
- The API reads the cloud copy. `404 Task not found.` on a task the user can
  see → not synced yet; ask them to press **Sync** and resend the link.

## Live progress

The app shows your progress live under the task's comments, and a "finished"
pop-up on `done` / `fail`. Send `event` with the same `--file`, plus
`--comment <commentId>` when the link was a comment.

| Type    | When                                                      | Text                                        |
| ------- | --------------------------------------------------------- | ------------------------------------------- |
| `start` | After reading the task, before any work                   | What you are about to do                    |
| `step`  | Each plan item or open section, and before running checks | Present tense: `Running typecheck and lint` |
| `ask`   | When you stop to ask or wait on the user                  | The question                                |
| `done`  | After posting the "Done" comment or rewriting the comment | Its one-line result                         |
| `fail`  | When blocked and ending your turn                         | Why, and what the user should do            |

```bash
$S --file <fileId> event <todoId> step "Adding ExportButton to the toolbar"
```

- One line, plain text, no code, never the key. Not one per tool call.
- Every run ends with `done` or `fail`, even after an answered `ask`.
- If it prints `event not recorded`, carry on; don't retry.

## Workflow

Run `$S parse '<url>'`. Link has a `commentId` → **Fix a comment**. Otherwise
(or "do this plan") → **Do a plan**.

In both: send `start` first, `step` as you go, check your work (typecheck,
lint, running app), then `done` or `fail`. On `401` when saving, keep your
text, ask the user to re-copy the key (Setup 2), and save once login works.

### Fix a comment

Users add requests to a comment as a bold heading plus a list. A section is
**open** until marked `(Resolved)`:

```markdown
**Bug**

- update the ai key provider icon
- it ui feel a little odd. make it combined styles.
```

1. `$S --file <fileId> open <todoId> <commentId>` prints only open sections
   (`**Bug**`, `**Fix**`, `**Request**`, …), plus the Resolved Message of any
   `(Partly resolved)` section, which says what is left.
2. `no open sections` → change nothing, tell the user, send
   `done "Nothing open in this comment"`.
3. Otherwise do each item now, without asking first. Read `thought <todoId>`
   for context, other comments only if an item mentions them. Ask only if the
   code can't settle an unclear item; else pick a sensible reading and state
   it in the Resolved Message. Don't redo the task's whole plan.
4. **Rewrite that same comment** (`get` it now, then `edit` with the full
   text; never `add`). Keep everything outside the open sections exactly as
   is. Replace each open section with:

   ```markdown
   **Bug (Resolved)**

   > <original item 1, word for word>
   >
   > <original item 2, word for word>

   **Resolved Message**

   - <each item → what changed, with key file paths>

   Verified: <checks run>. Not committed.
   ```

   Quote the user exactly, typos included. Keep their heading word (`Bug`,
   `Fix`, …). If items were skipped or blocked, use `(Partly resolved)` and
   say which stay open.

### Do a plan

1. `list <todoId> --open`: the thought is the plan; remaining comments may
   amend it. Use plain `list` only if the plan refers to earlier history.
2. Do the work in the repo and check it.
3. Post a completion comment with `add`, written for the task's reader:

   ```bash
   $S --file <fileId> add <todoId> - <<'EOF'
   **Done** — <one-line result>

   - <each plan item → what changed, with key file paths>
   - <anything left for the user: commands, decisions, follow-ups>

   Verified: <checks run>. Not committed.
   EOF
   ```

   One bullet per plan item, no code dumps. If part was skipped or blocked,
   say so instead of calling it done.

### Other requests

- **Read a thread**: `list <todoId>` (`--open` for what still needs work);
  summarize the plan and each comment by id.
- **Add**: use `add`. Use `put` only when you need a fixed id of your own.
- **Edit**: `get` first, then `edit` with the full new text (no merge).
- **Delete**: cannot be undone. Confirm first unless the user named the exact
  comment. Delete any test comments you create.
