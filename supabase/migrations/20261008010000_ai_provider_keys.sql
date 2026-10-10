-- AI provider keys.
--
-- A signed-in user can keep several API keys per AI provider and pick one
-- in the chat panel (src/lib/ai/key-store.ts). Signed-out users keep theirs
-- in browser localStorage instead; on sign-in they are moved here.
--
-- Keys are secrets: rows are visible only to their owner (RLS below), never
-- to anon, and never travel through the planner_state RPCs.

create table public.planner_ai_keys (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated (nanoid), like every other planner id.
  id text not null check (id <> ''),
  provider text not null check (provider in ('gemini', 'openrouter')),
  label text not null default '',
  api_key text not null check (api_key <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index planner_ai_keys_user_provider_idx
  on public.planner_ai_keys (user_id, provider, created_at);

create trigger planner_ai_keys_set_updated_at
  before update on public.planner_ai_keys
  for each row execute function public.planner_set_updated_at();

alter table public.planner_ai_keys enable row level security;

create policy "Users manage their own AI keys"
  on public.planner_ai_keys for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.planner_ai_keys from anon;
grant select, insert, update, delete on public.planner_ai_keys to authenticated;
