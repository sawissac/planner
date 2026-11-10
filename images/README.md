# Planner image server

Stores the pictures embedded in task thoughts and comments: files in
`assets/<user id>/` (git-ignored), records in Supabase (`planner_images`).

```bash
pnpm image-server       # from the repo root → http://127.0.0.1:3033
pnpm image-server:dev   # same, restarting on changes
```

(Or `cd images && bun start`. Its packages resolve from the repo's
`node_modules`; `bun install` here only adds `@types/bun` for `bun run typecheck`.)

It reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the root
`.env.local` / `.env`. Port, allowed origins and the size limit are in
`config.example.json`; override them in a `config.json` next to it.

## Connect Planner

On first start the server generates its token (`pim_…`) and saves it in
`config.json` (git-ignored, mode 600), like `execute-cli/claude`.

Settings → API keys → **Image server**: paste the server URL and that token,
then **Save** (or **Test**). That also pairs the server with your Planner
account: the images belong to it, and another account is refused (clear
`ownerId` in `config.json` to pair again). The app loads every embedded image
from this server with the token.

## Agents

`planner.sh image …` and `planner.sh attach …` (see
`skills/planner-for-claude-code/SKILL.md`) upload, list, replace, rename,
download and delete images. They read the server's URL and token from your
Settings through the Plan API (`/api/image-server`), so an agent only needs
its Plan API key. Routes and auth are documented at the top of `server.ts`.
