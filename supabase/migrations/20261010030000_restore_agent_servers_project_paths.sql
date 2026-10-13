-- Bring back "Run agent" and project paths.
--
-- 20261010020000 dropped both tables when the features were removed; this
-- re-creates them as 20261010000000_project_paths.sql and
-- 20261010010000_agent_servers.sql had them. Rows dropped then are gone:
-- re-add the server URL/token (Settings → API keys) and the folders.
--
-- project_paths: folders on the user's computer, saved from the sidebar's
-- Projects pane or the Run agent dialog (src/lib/project-paths.ts).
-- planner_agent_servers: where "Run agent" sends a task — the local bridge
-- execute-cli/claude (src/lib/agent-servers.ts).
-- Both are signed-in only, owner-only RLS, and never travel through the
-- planner_state RPCs.

create table public.project_paths (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated (nanoid), like every other planner id.
  id text not null check (id <> ''),
  -- Absolute path as the OS picker returned it.
  path text not null check (path <> ''),
  -- Display name; starts as the folder name, renamable in the sidebar.
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, path)
);

create index project_paths_user_created_idx
  on public.project_paths (user_id, created_at);

create trigger project_paths_set_updated_at
  before update on public.project_paths
  for each row execute function public.planner_set_updated_at();

alter table public.project_paths enable row level security;

create policy "Users manage their own project paths"
  on public.project_paths for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.project_paths from anon;
grant select, insert, update, delete on public.project_paths to authenticated;

create table public.planner_agent_servers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null check (provider in ('claude-code')),
  -- Base URL, e.g. http://127.0.0.1:4319 — the client appends the route.
  url text not null check (url ~ '^https?://'),
  token text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create trigger planner_agent_servers_set_updated_at
  before update on public.planner_agent_servers
  for each row execute function public.planner_set_updated_at();

alter table public.planner_agent_servers enable row level security;

create policy "Users manage their own agent servers"
  on public.planner_agent_servers for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.planner_agent_servers from anon;
grant select, insert, update, delete on public.planner_agent_servers to authenticated;
