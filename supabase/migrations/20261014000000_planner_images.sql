-- Images.
--
-- Pictures attached to a task's thought or comments, served by the image
-- service (images/server.ts, src/app/api/images/**). Each image is
--   - a row in planner_images: its name, type, size, and the task it was
--     uploaded for, and
--   - its file on the app server's disk, at
--     `images/assets/<user id>/<image id>.<ext>` (git-ignored).
-- Markdown embeds an image by its file route, `/api/images/<id>/file`, which
-- answers to a Plan API key or the app's session cookie; the files are never
-- served statically.
--
-- The API-key path reads rows through the secret key (bypassing RLS) and
-- scopes every call to the key's user itself; the session path goes through
-- the policy below.

create table public.planner_images (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Server-generated (nanoid); also the file name in images/assets.
  id text not null check (id <> ''),
  name text not null default '',
  content_type text not null
    check (content_type in ('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif')),
  size integer not null check (size > 0),
  -- The task the image was uploaded for, if any. No foreign key: the image
  -- outlives the task in any markdown that still embeds it.
  file_id text,
  todo_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index planner_images_todo_idx on public.planner_images (user_id, file_id, todo_id);

create trigger planner_images_set_updated_at
  before update on public.planner_images
  for each row execute function public.planner_set_updated_at();

alter table public.planner_images enable row level security;

create policy "Users manage their own images"
  on public.planner_images for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.planner_images from anon;
grant select, insert, update, delete on public.planner_images to authenticated;
