-- Thought comments.
--
-- A task's thought can now carry many comments (Todo.comments in
-- src/stores/slices/todoSlice.ts), each a Markdown body written with the
-- thought editor:
--   todos.files[].todos[].comments[] -> planner_thought_comments
--
-- upsert_planner_state / get_planner_state are redefined with a comments
-- section; everything else in their bodies is unchanged from
-- 20261007000000_focus_mode_default.sql (upsert) and
-- 20261006000000_planner_schema.sql (get). create or replace keeps both
-- signatures, so the existing execute grants still apply.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.planner_thought_comments (
  user_id uuid not null,
  file_id text not null,
  todo_id text not null,
  id text not null check (id <> ''),
  body text not null default '',
  position integer not null default 0,
  -- Both come from the client (ThoughtComment.createdAt / updatedAt), so no
  -- updated_at trigger: it would overwrite the edit time with the push time.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, file_id, todo_id, id),
  foreign key (user_id, file_id, todo_id)
    references public.planner_todos (user_id, file_id, id) on delete cascade
);

alter table public.planner_thought_comments enable row level security;

create policy "Users manage their own thought comments"
  on public.planner_thought_comments for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.planner_thought_comments from anon;
grant select, insert, update, delete on public.planner_thought_comments to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_planner_state(
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

  -- Thought comments --------------------------------------------------------
  -- Ids are unique per todo. Timestamps arrive as epoch milliseconds and are
  -- kept as sent: updated_at is the client's last edit, not the push time.

  insert into public.planner_thought_comments as t (
    user_id, file_id, todo_id, id, body, position, created_at, updated_at
  )
  select
    v_uid,
    f.value ->> 'id',
    td.value ->> 'id',
    c.value ->> 'id',
    coalesce(c.value ->> 'body', ''),
    c.ord - 1,
    coalesce(to_timestamp((c.value ->> 'createdAt')::double precision / 1000), now()),
    coalesce(to_timestamp((c.value ->> 'updatedAt')::double precision / 1000), now())
  from jsonb_array_elements(p_files) as f (value)
  cross join lateral jsonb_array_elements(coalesce(f.value -> 'todos', '[]'::jsonb)) as td (value)
  cross join lateral jsonb_array_elements(coalesce(td.value -> 'comments', '[]'::jsonb))
    with ordinality as c (value, ord)
  where coalesce(c.value ->> 'id', '') <> ''
  on conflict (user_id, file_id, todo_id, id) do update
    set body = excluded.body,
        position = excluded.position,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    where (t.body, t.position, t.created_at, t.updated_at)
      is distinct from
          (excluded.body, excluded.position, excluded.created_at, excluded.updated_at);

  -- Comments of deleted todos already went with the todo (cascade).
  delete from public.planner_thought_comments t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(p_files) as f (value)
      cross join lateral jsonb_array_elements(coalesce(f.value -> 'todos', '[]'::jsonb)) as td (value)
      cross join lateral jsonb_array_elements(coalesce(td.value -> 'comments', '[]'::jsonb)) as c (value)
      where f.value ->> 'id' = t.file_id
        and td.value ->> 'id' = t.todo_id
        and c.value ->> 'id' = t.id
    );

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
    coalesce((p_settings ->> 'focusMode')::boolean, true),
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

-- Adds Todo.comments to each todo, and comment edits to updatedAt.
create or replace function public.get_planner_state()
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
    (select max(updated_at) from public.planner_thought_comments where user_id = v_uid),
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
            'thought', td.thought,
            'comments', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', c.id,
                  'body', c.body,
                  'createdAt', (extract(epoch from c.created_at) * 1000)::bigint,
                  'updatedAt', (extract(epoch from c.updated_at) * 1000)::bigint
                )
                order by c.position
              )
              from public.planner_thought_comments c
              where c.user_id = td.user_id
                and c.file_id = td.file_id
                and c.todo_id = td.id
            ), '[]'::jsonb)
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
