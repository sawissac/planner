-- Agent servers.
--
-- Where Planner's "Run agent" sends a task: the URL (and bearer token) of a
-- local bridge such as execute-cli/claude, which runs the agent CLI in a
-- project folder. Set in Settings → API keys (src/features/Settings/
-- AgentServerSettings.tsx via src/lib/agent-servers.ts); one row per
-- provider per user.
--
-- The token is a secret for the user's own machine: rows are visible only to
-- their owner (RLS below), never to anon, and never travel through the
-- planner_state RPCs.

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
