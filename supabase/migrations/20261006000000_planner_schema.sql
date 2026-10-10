-- Planner cloud-sync schema.
--
-- Normalized storage for the Redux state that `src/lib/cloud-sync.ts` syncs:
--   todos.files[]              -> planner_files
--   todos.files[].groups[]     -> planner_groups
--   todos.files[].todos[]      -> planner_todos
--   todos.files[].todos[].assignees[] -> planner_todo_assignees
--   users.users[]              -> planner_members
--   settings (scalars) + todos.activeFileId -> planner_settings
--   settings.priorityOptions / progressOptions -> planner_field_options
--   settings.columnSizing / userColumnSizing   -> planner_column_widths
--   settings.sorting           -> planner_sort_columns
--
-- No state is stored as JSON. jsonb only appears as the RPC wire format.
--
-- Ids are client-generated (`nanoid()`, plus the literal "default" for the
-- seed file), so they are text, not uuid, and only unique per user. Groups
-- and todos are additionally only unique per file: importing a file
-- re-ids the file but keeps its group/todo ids. Every key is therefore
-- composite, rooted at user_id.
--
-- The client still does one RPC per push/pull (`upsert_planner_state` /
-- `get_planner_state`); the fan-out across tables happens here.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.planner_files (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (id <> ''),
  name text not null,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.planner_groups (
  user_id uuid not null,
  file_id text not null,
  id text not null check (id <> ''),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, file_id, id),
  foreign key (user_id, file_id)
    references public.planner_files (user_id, id) on delete cascade
);

-- Assignable people inside the planner (userSlice), not auth users.
create table public.planner_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (id <> ''),
  name text not null,
  agenda text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.planner_todos (
  user_id uuid not null,
  file_id text not null,
  id text not null check (id <> ''),
  group_id text,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  completed_from timestamptz,
  completed_to timestamptz,
  -- Free text: the option lists are user-editable (settings.priorityOptions
  -- / settings.progressOptions), so no enum or check constraint.
  priority text,
  progress text,
  thought text not null default '',
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, file_id, id),
  foreign key (user_id, file_id)
    references public.planner_files (user_id, id) on delete cascade,
  foreign key (user_id, file_id, group_id)
    references public.planner_groups (user_id, file_id, id) on delete set null (group_id)
);

create table public.planner_todo_assignees (
  user_id uuid not null,
  file_id text not null,
  todo_id text not null,
  member_id text not null,
  position integer not null default 0,
  primary key (user_id, file_id, todo_id, member_id),
  foreign key (user_id, file_id, todo_id)
    references public.planner_todos (user_id, file_id, id) on delete cascade,
  foreign key (user_id, member_id)
    references public.planner_members (user_id, id) on delete cascade
);

-- SettingsState scalars, one row per user. Defaults mirror the slice's
-- initialState. List/map fields live in the child tables below.
create table public.planner_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_file_id text,
  table_font text not null default 'roboto'
    check (table_font in ('roboto', 'poppins', 'caveat')),
  title_font_size smallint not null default 14 check (title_font_size > 0),
  title_font_weight smallint not null default 400
    check (title_font_weight between 100 and 900),
  sidebar_width integer not null default 320 check (sidebar_width > 0),
  sidebar_open boolean not null default true,
  cloud_auto_sync boolean not null default true,
  focus_mode boolean not null default false,
  dark_mode boolean not null default false,
  board_compact boolean not null default false,
  page_size integer not null default 30 check (page_size > 0),
  active_tab text not null default 'todo',
  accent_color text,
  global_filter text not null default '',
  -- Filters hold a group id / option value, but are global while groups are
  -- per file, so no foreign key.
  group_filter text,
  priority_filter text,
  progress_filter text,
  updated_at timestamptz not null default now(),
  foreign key (user_id, active_file_id)
    references public.planner_files (user_id, id) on delete set null (active_file_id)
);

-- settings.priorityOptions / settings.progressOptions
create table public.planner_field_options (
  user_id uuid not null references public.planner_settings (user_id) on delete cascade,
  field text not null check (field in ('priority', 'progress')),
  value text not null,
  position integer not null default 0,
  primary key (user_id, field, value)
);

-- settings.columnSizing (todo table) / settings.userColumnSizing (member table)
create table public.planner_column_widths (
  user_id uuid not null references public.planner_settings (user_id) on delete cascade,
  table_name text not null check (table_name in ('todos', 'members')),
  column_id text not null,
  width double precision not null check (width >= 0),
  primary key (user_id, table_name, column_id)
);

-- settings.sorting (TanStack SortingState: ordered, one entry per column)
create table public.planner_sort_columns (
  user_id uuid not null references public.planner_settings (user_id) on delete cascade,
  column_id text not null,
  descending boolean not null default false,
  position integer not null default 0,
  primary key (user_id, column_id)
);

-- ---------------------------------------------------------------------------
-- Indexes (primary keys already cover user_id / file_id lookups)
-- ---------------------------------------------------------------------------

create index planner_todos_group_idx
  on public.planner_todos (user_id, file_id, group_id)
  where group_id is not null;

create index planner_todo_assignees_member_idx
  on public.planner_todo_assignees (user_id, member_id);

-- ---------------------------------------------------------------------------
-- updated_at refresh (the column default only fires on insert)
-- ---------------------------------------------------------------------------

create function public.planner_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger planner_files_set_updated_at
  before update on public.planner_files
  for each row execute function public.planner_set_updated_at();

create trigger planner_groups_set_updated_at
  before update on public.planner_groups
  for each row execute function public.planner_set_updated_at();

create trigger planner_members_set_updated_at
  before update on public.planner_members
  for each row execute function public.planner_set_updated_at();

create trigger planner_todos_set_updated_at
  before update on public.planner_todos
  for each row execute function public.planner_set_updated_at();

create trigger planner_settings_set_updated_at
  before update on public.planner_settings
  for each row execute function public.planner_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: every row carries user_id, so each policy is a plain
-- equality check on the leading primary-key column.
-- ---------------------------------------------------------------------------

alter table public.planner_files enable row level security;
alter table public.planner_groups enable row level security;
alter table public.planner_members enable row level security;
alter table public.planner_todos enable row level security;
alter table public.planner_todo_assignees enable row level security;
alter table public.planner_settings enable row level security;
alter table public.planner_field_options enable row level security;
alter table public.planner_column_widths enable row level security;
alter table public.planner_sort_columns enable row level security;

create policy "Users manage their own files"
  on public.planner_files for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own groups"
  on public.planner_groups for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own members"
  on public.planner_members for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own todos"
  on public.planner_todos for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own todo assignees"
  on public.planner_todo_assignees for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own settings"
  on public.planner_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own field options"
  on public.planner_field_options for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own column widths"
  on public.planner_column_widths for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own sort columns"
  on public.planner_sort_columns for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- New public tables are no longer exposed to the Data API roles by default,
-- so grant explicitly. Signed-in users only; RLS narrows to their own rows.
revoke all on
  public.planner_files,
  public.planner_groups,
  public.planner_members,
  public.planner_todos,
  public.planner_todo_assignees,
  public.planner_settings,
  public.planner_field_options,
  public.planner_column_widths,
  public.planner_sort_columns
  from anon;

grant select, insert, update, delete on
  public.planner_files,
  public.planner_groups,
  public.planner_members,
  public.planner_todos,
  public.planner_todo_assignees,
  public.planner_settings,
  public.planner_field_options,
  public.planner_column_widths,
  public.planner_sort_columns
  to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
--
-- Both run as the caller (security invoker), so the RLS policies above
-- apply inside them too.
-- ---------------------------------------------------------------------------

-- Replaces the caller's whole planner state with the given snapshot.
--   p_files          TodosState.files (each with nested groups / todos)
--   p_active_file_id TodosState.activeFileId
--   p_members        UsersState.users
--   p_settings       SettingsState
-- Array order is the stored position. Rows are upserted and anything missing
-- from the snapshot is deleted, so unchanged rows keep their created_at /
-- updated_at. Last push wins, as with the old single-blob backup.
-- Group ids, assignee ids and the active file id that point at nothing are
-- dropped instead of failing the whole push.
create function public.upsert_planner_state(
  p_files jsonb,
  p_active_file_id text,
  p_members jsonb,
  p_settings jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  p_files := coalesce(p_files, '[]'::jsonb);
  p_members := coalesce(p_members, '[]'::jsonb);

  -- Files -------------------------------------------------------------------

  insert into public.planner_files as t (user_id, id, name, icon, position)
  select v_uid, f.value ->> 'id', coalesce(f.value ->> 'name', ''), f.value ->> 'icon', f.ord - 1
  from jsonb_array_elements(p_files) with ordinality as f (value, ord)
  on conflict (user_id, id) do update
    set name = excluded.name, icon = excluded.icon, position = excluded.position
    where (t.name, t.icon, t.position)
      is distinct from (excluded.name, excluded.icon, excluded.position);

  -- Cascades to the file's groups, todos and assignees.
  delete from public.planner_files t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(p_files) as f (value)
      where f.value ->> 'id' = t.id
    );

  -- Groups ------------------------------------------------------------------

  insert into public.planner_groups as t (user_id, file_id, id, name, position)
  select v_uid, f.value ->> 'id', g.value ->> 'id', coalesce(g.value ->> 'name', ''), g.ord - 1
  from jsonb_array_elements(p_files) as f (value)
  cross join lateral jsonb_array_elements(coalesce(f.value -> 'groups', '[]'::jsonb))
    with ordinality as g (value, ord)
  on conflict (user_id, file_id, id) do update
    set name = excluded.name, position = excluded.position
    where (t.name, t.position) is distinct from (excluded.name, excluded.position);

  delete from public.planner_groups t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(p_files) as f (value)
      cross join lateral jsonb_array_elements(coalesce(f.value -> 'groups', '[]'::jsonb)) as g (value)
      where f.value ->> 'id' = t.file_id
        and g.value ->> 'id' = t.id
    );

  -- Members -----------------------------------------------------------------

  insert into public.planner_members as t (user_id, id, name, agenda, position)
  select v_uid, m.value ->> 'id', coalesce(m.value ->> 'name', ''),
    coalesce(m.value ->> 'agenda', ''), m.ord - 1
  from jsonb_array_elements(p_members) with ordinality as m (value, ord)
  on conflict (user_id, id) do update
    set name = excluded.name, agenda = excluded.agenda, position = excluded.position
    where (t.name, t.agenda, t.position)
      is distinct from (excluded.name, excluded.agenda, excluded.position);

  -- Cascades to assignee rows pointing at the removed members.
  delete from public.planner_members t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(p_members) as m (value)
      where m.value ->> 'id' = t.id
    );

  -- Todos -------------------------------------------------------------------
  -- Timestamps arrive as epoch milliseconds (JSON null -> SQL null).

  insert into public.planner_todos as t (
    user_id, file_id, id, group_id, title, done, created_at, done_at,
    completed_from, completed_to, priority, progress, thought, position
  )
  select
    v_uid,
    f.value ->> 'id',
    td.value ->> 'id',
    (
      select g.id
      from public.planner_groups g
      where g.user_id = v_uid
        and g.file_id = f.value ->> 'id'
        and g.id = td.value ->> 'groupId'
    ),
    coalesce(td.value ->> 'title', ''),
    coalesce((td.value ->> 'done')::boolean, false),
    coalesce(to_timestamp((td.value ->> 'createdAt')::double precision / 1000), now()),
    to_timestamp((td.value ->> 'doneAt')::double precision / 1000),
    to_timestamp((td.value ->> 'completedFrom')::double precision / 1000),
    to_timestamp((td.value ->> 'completedTo')::double precision / 1000),
    td.value ->> 'priority',
    td.value ->> 'progress',
    coalesce(td.value ->> 'thought', ''),
    td.ord - 1
  from jsonb_array_elements(p_files) as f (value)
  cross join lateral jsonb_array_elements(coalesce(f.value -> 'todos', '[]'::jsonb))
    with ordinality as td (value, ord)
  on conflict (user_id, file_id, id) do update
    set group_id = excluded.group_id,
        title = excluded.title,
        done = excluded.done,
        created_at = excluded.created_at,
        done_at = excluded.done_at,
        completed_from = excluded.completed_from,
        completed_to = excluded.completed_to,
        priority = excluded.priority,
        progress = excluded.progress,
        thought = excluded.thought,
        position = excluded.position
    where (t.group_id, t.title, t.done, t.created_at, t.done_at, t.completed_from,
           t.completed_to, t.priority, t.progress, t.thought, t.position)
      is distinct from
          (excluded.group_id, excluded.title, excluded.done, excluded.created_at,
           excluded.done_at, excluded.completed_from, excluded.completed_to,
           excluded.priority, excluded.progress, excluded.thought, excluded.position);

  delete from public.planner_todos t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(p_files) as f (value)
      cross join lateral jsonb_array_elements(coalesce(f.value -> 'todos', '[]'::jsonb)) as td (value)
      where f.value ->> 'id' = t.file_id
        and td.value ->> 'id' = t.id
    );

  -- Assignees ---------------------------------------------------------------
  -- Pure link rows with nothing to preserve, so rebuild them wholesale.

  delete from public.planner_todo_assignees where user_id = v_uid;

  insert into public.planner_todo_assignees (user_id, file_id, todo_id, member_id, position)
  select v_uid, f.value ->> 'id', td.value ->> 'id', a.member_id, a.ord - 1
  from jsonb_array_elements(p_files) as f (value)
  cross join lateral jsonb_array_elements(coalesce(f.value -> 'todos', '[]'::jsonb)) as td (value)
  cross join lateral jsonb_array_elements_text(coalesce(td.value -> 'assignees', '[]'::jsonb))
    with ordinality as a (member_id, ord)
  where exists (
    select 1
    from public.planner_members m
    where m.user_id = v_uid
      and m.id = a.member_id
  )
  on conflict do nothing;

  -- Settings ----------------------------------------------------------------
  -- Missing keys fall back to the slice defaults. Always updated (no
  -- is-distinct guard), so updated_at doubles as "last push" for pulls.

  p_settings := coalesce(p_settings, '{}'::jsonb);

  insert into public.planner_settings as s (
    user_id, active_file_id, table_font, title_font_size, title_font_weight,
    sidebar_width, sidebar_open, cloud_auto_sync, focus_mode, dark_mode,
    board_compact, page_size, active_tab, accent_color, global_filter,
    group_filter, priority_filter, progress_filter
  )
  values (
    v_uid,
    (
      select f.id
      from public.planner_files f
      where f.user_id = v_uid
        and f.id = p_active_file_id
    ),
    coalesce(p_settings ->> 'tableFont', 'roboto'),
    coalesce((p_settings ->> 'titleFontSize')::smallint, 14),
    coalesce((p_settings ->> 'titleFontWeight')::smallint, 400),
    coalesce(round((p_settings ->> 'sidebarWidth')::numeric)::integer, 320),
    coalesce((p_settings ->> 'sidebarOpen')::boolean, true),
    coalesce((p_settings ->> 'cloudAutoSync')::boolean, true),
    coalesce((p_settings ->> 'focusMode')::boolean, false),
    coalesce((p_settings ->> 'darkMode')::boolean, false),
    coalesce((p_settings ->> 'boardCompact')::boolean, false),
    coalesce((p_settings ->> 'pageSize')::integer, 30),
    coalesce(p_settings ->> 'activeTab', 'todo'),
    p_settings ->> 'accentColor',
    coalesce(p_settings ->> 'globalFilter', ''),
    p_settings ->> 'groupFilter',
    p_settings ->> 'priorityFilter',
    p_settings ->> 'progressFilter'
  )
  on conflict (user_id) do update
    set active_file_id = excluded.active_file_id,
        table_font = excluded.table_font,
        title_font_size = excluded.title_font_size,
        title_font_weight = excluded.title_font_weight,
        sidebar_width = excluded.sidebar_width,
        sidebar_open = excluded.sidebar_open,
        cloud_auto_sync = excluded.cloud_auto_sync,
        focus_mode = excluded.focus_mode,
        dark_mode = excluded.dark_mode,
        board_compact = excluded.board_compact,
        page_size = excluded.page_size,
        active_tab = excluded.active_tab,
        accent_color = excluded.accent_color,
        global_filter = excluded.global_filter,
        group_filter = excluded.group_filter,
        priority_filter = excluded.priority_filter,
        progress_filter = excluded.progress_filter;

  -- Settings children: small lists with nothing to preserve, so rebuild.

  delete from public.planner_field_options where user_id = v_uid;

  insert into public.planner_field_options (user_id, field, value, position)
  select v_uid, o.field, o.value, o.ord - 1
  from (
    select 'priority' as field, v.value, v.ord
    from jsonb_array_elements_text(
      coalesce(p_settings -> 'priorityOptions', '["high","highest","critical","must","deferred"]'::jsonb)
    ) with ordinality as v (value, ord)
    union all
    select 'progress', v.value, v.ord
    from jsonb_array_elements_text(
      coalesce(p_settings -> 'progressOptions', '["Not Started","InProgress","Done"]'::jsonb)
    ) with ordinality as v (value, ord)
  ) as o
  on conflict do nothing;

  delete from public.planner_column_widths where user_id = v_uid;

  insert into public.planner_column_widths (user_id, table_name, column_id, width)
  select v_uid, c.table_name, c.key, c.value::double precision
  from (
    select 'todos' as table_name, e.key, e.value
    from jsonb_each_text(coalesce(p_settings -> 'columnSizing', '{}'::jsonb)) as e
    union all
    select 'members', e.key, e.value
    from jsonb_each_text(coalesce(p_settings -> 'userColumnSizing', '{}'::jsonb)) as e
  ) as c;

  delete from public.planner_sort_columns where user_id = v_uid;

  insert into public.planner_sort_columns (user_id, column_id, descending, position)
  select v_uid, s.value ->> 'id', coalesce((s.value ->> 'desc')::boolean, false), s.ord - 1
  from jsonb_array_elements(coalesce(p_settings -> 'sorting', '[]'::jsonb))
    with ordinality as s (value, ord)
  on conflict do nothing;
end;
$$;

-- Rebuilds the RemotePayload shape (see src/lib/cloud-sync-backend.ts) from
-- the tables. Returns null when signed out.
create function public.get_planner_state()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_files jsonb;
  v_members jsonb;
  v_settings jsonb;
  v_active_file_id text;
  v_updated_at timestamptz;
begin
  if v_uid is null then
    return null;
  end if;

  -- Pull compares this against the device's last sync time. Settings are
  -- written on every push; files/todos cover direct table edits.
  select greatest(
    (select max(updated_at) from public.planner_files where user_id = v_uid),
    (select max(updated_at) from public.planner_todos where user_id = v_uid),
    (select updated_at from public.planner_settings where user_id = v_uid)
  )
  into v_updated_at;

  select jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'groups', coalesce((
        select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name) order by g.position)
        from public.planner_groups g
        where g.user_id = f.user_id
          and g.file_id = f.id
      ), '[]'::jsonb),
      'todos', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', td.id,
            'title', td.title,
            'done', td.done,
            'createdAt', (extract(epoch from td.created_at) * 1000)::bigint,
            'doneAt', (extract(epoch from td.done_at) * 1000)::bigint,
            'completedFrom', (extract(epoch from td.completed_from) * 1000)::bigint,
            'completedTo', (extract(epoch from td.completed_to) * 1000)::bigint,
            'priority', td.priority,
            'progress', td.progress,
            'assignees', coalesce((
              select jsonb_agg(a.member_id order by a.position)
              from public.planner_todo_assignees a
              where a.user_id = td.user_id
                and a.file_id = td.file_id
                and a.todo_id = td.id
            ), '[]'::jsonb),
            'groupId', td.group_id,
            'thought', td.thought
          )
          order by td.position
        )
        from public.planner_todos td
        where td.user_id = f.user_id
          and td.file_id = f.id
      ), '[]'::jsonb)
    )
    -- TodoFile.icon is optional: omit the key rather than send null.
    || case when f.icon is null then '{}'::jsonb else jsonb_build_object('icon', f.icon) end
    order by f.position
  )
  into v_files
  from public.planner_files f
  where f.user_id = v_uid;

  select jsonb_agg(
    jsonb_build_object('id', m.id, 'name', m.name, 'agenda', m.agenda)
    order by m.position
  )
  into v_members
  from public.planner_members m
  where m.user_id = v_uid;

  -- Null when the user has never pushed, so the client keeps its local
  -- settings instead of replacing them with an empty object.
  select
    jsonb_build_object(
      'tableFont', s.table_font,
      'titleFontSize', s.title_font_size,
      'titleFontWeight', s.title_font_weight,
      'sidebarWidth', s.sidebar_width,
      'sidebarOpen', s.sidebar_open,
      'cloudAutoSync', s.cloud_auto_sync,
      'columnSizing', coalesce((
        select jsonb_object_agg(c.column_id, c.width)
        from public.planner_column_widths c
        where c.user_id = s.user_id
          and c.table_name = 'todos'
      ), '{}'::jsonb),
      'userColumnSizing', coalesce((
        select jsonb_object_agg(c.column_id, c.width)
        from public.planner_column_widths c
        where c.user_id = s.user_id
          and c.table_name = 'members'
      ), '{}'::jsonb),
      'priorityOptions', coalesce((
        select jsonb_agg(o.value order by o.position)
        from public.planner_field_options o
        where o.user_id = s.user_id
          and o.field = 'priority'
      ), '[]'::jsonb),
      'progressOptions', coalesce((
        select jsonb_agg(o.value order by o.position)
        from public.planner_field_options o
        where o.user_id = s.user_id
          and o.field = 'progress'
      ), '[]'::jsonb),
      'focusMode', s.focus_mode,
      'darkMode', s.dark_mode,
      'pageSize', s.page_size,
      'sorting', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', sc.column_id, 'desc', sc.descending)
          order by sc.position
        )
        from public.planner_sort_columns sc
        where sc.user_id = s.user_id
      ), '[]'::jsonb),
      'globalFilter', s.global_filter,
      'groupFilter', s.group_filter,
      'priorityFilter', s.priority_filter,
      'progressFilter', s.progress_filter,
      'accentColor', s.accent_color,
      'activeTab', s.active_tab,
      'boardCompact', s.board_compact
    ),
    s.active_file_id
  into v_settings, v_active_file_id
  from public.planner_settings s
  where s.user_id = v_uid;

  return jsonb_build_object(
    'version', 1,
    'updatedAt', (extract(epoch from coalesce(v_updated_at, to_timestamp(0))) * 1000)::bigint,
    'todos', jsonb_build_object(
      'files', coalesce(v_files, '[]'::jsonb),
      'activeFileId', v_active_file_id
    ),
    'users', jsonb_build_object('users', coalesce(v_members, '[]'::jsonb)),
    'settings', v_settings
  );
end;
$$;

revoke execute on function public.upsert_planner_state(jsonb, text, jsonb, jsonb) from public, anon;
revoke execute on function public.get_planner_state() from public, anon;
grant execute on function public.upsert_planner_state(jsonb, text, jsonb, jsonb) to authenticated;
grant execute on function public.get_planner_state() to authenticated;
