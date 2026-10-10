-- Project paths.
--
-- Folders on the user's computer, saved from the sidebar's Projects section
-- (src/features/ProjectPaths/ProjectPaths.tsx) or the Run agent dialog's
-- "Project path" field (src/components/customs/ProjectPathField.tsx), both via
-- src/lib/project-paths.ts.
-- The folder is chosen with the OS picker and opened in the OS file manager
-- by the local-only routes under src/app/api/local/.
--
-- Signed-in only: rows are read and written directly with the browser
-- client (owner-only RLS below) and never travel through the planner_state
-- RPCs.

create table public.project_paths (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated (nanoid), like every other planner id.
  id text not null check (id <> ''),
  -- Absolute path as the OS picker returned it.
  path text not null check (path <> ''),
  -- Display name; starts as the folder name, renamable in the sidebar or the Run agent dialog.
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
