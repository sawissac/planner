# Planner for ChatGPT

A custom GPT that reads Planner tasks and works their comment threads through
GPT Actions.

- [instructions.md](instructions.md): paste into the GPT's **Instructions**.
- [openapi.yaml](openapi.yaml): the Plan API schema for **Actions**.

ChatGPT can't edit your files or run your app. For a coding plan it writes the
code in the chat, and its completion comment says the code still has to be
applied. Use the Claude Code or Cursor skill when you want the repo changed.

## Needs a public URL

ChatGPT calls Actions from OpenAI's servers, so it can't reach
`http://localhost:3000`. Use a deployed Planner, or expose your dev server
through an HTTPS tunnel (for example `cloudflared tunnel --url http://localhost:3000`
or `ngrok http 3000`). Anyone with the tunnel URL reaches your dev server, so
close the tunnel when you are done.

## Set up

1. ChatGPT → **Explore GPTs → Create → Configure**.
2. **Name**: Planner Assistant. **Instructions**: paste `instructions.md`.
3. **Actions → Create new action**:
   - **Schema**: paste `openapi.yaml`, then change
     `https://YOUR-PLANNER-HOST` under `servers` to your public URL.
   - **Authentication → API Key → Auth type: Bearer**. Paste a Plan API key
     from Planner → Settings → API keys (press **Copy key for CLI** and paste
     it straight into this field).
4. Keep the GPT private (**Only me**). It acts as the key's owner, so anyone
   who can use the GPT can read and write your tasks' comments.

## Use

Press **Copy context** on a task or comment in Planner and paste the link into
the GPT, alone or with "do this plan". It reads the ids from the URL and
ignores the host. While it works, its progress shows live under the task's
comments (as "ChatGPT") through the `reportProgress` action.

`deleteComment` is marked consequential, so ChatGPT asks before running it.
The other actions may ask once for permission to call your domain.

## Errors

- `401`: the key in the action settings is wrong or revoked. Paste a new one.
- `404 Task not found.`: the task is not synced yet. Press **Sync** in Planner.
- `409`: the task id is in more than one file; include the `fileId` from the
  copied URL.

After changing `openapi.yaml` (for example when `reportProgress` was added),
paste it into the action's **Schema** again.
