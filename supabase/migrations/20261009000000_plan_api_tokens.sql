-- Plan API keys.
--
-- Short, long-lived bearer keys for the third-party Plan API
-- (src/app/api/plan/**), replacing the hour-long Supabase session token in
-- the "API request" curl. A key looks like `pln_<32 base62 chars>`; only its
-- SHA-256 hash is stored, so a database read never reveals a usable key.
--
-- The browser creates keys (src/lib/plan-api-token.ts) and lists / revokes
-- them under its own RLS. The API resolves a presented key to its user with
-- the server-only secret key (src/lib/plan-api.ts), which bypasses RLS, then
-- scopes every query by that user id itself.

create table public.planner_api_tokens (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated (nanoid): addresses the key for listing and revoking.
  id text not null check (id <> ''),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text not null default '',
  -- Last four characters of the key, so the list can tell keys apart.
  hint text not null default '',
  created_at timestamptz not null default now(),
  -- Written by the API (secret key) on each authenticated request.
  last_used_at timestamptz,
  primary key (user_id, id)
);

alter table public.planner_api_tokens enable row level security;

create policy "Users read their own API keys"
  on public.planner_api_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own API keys"
  on public.planner_api_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users revoke their own API keys"
  on public.planner_api_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.planner_api_tokens from anon;
-- No update grant: a key's hash and owner never change once created.
grant select, insert, delete on public.planner_api_tokens to authenticated;
