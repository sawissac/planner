-- Focus mode is on by default.
--
-- The app's settings slice now starts with focusMode = true (see
-- src/stores/slices/settingsSlice.ts). Mirror that here so a settings row
-- created without the key, and upsert_planner_state's fallback for a payload
-- missing it, agree with the client. Existing rows keep what the user chose.

alter table public.planner_settings
  alter column focus_mode set default true;

-- Same body as 20261006000000_planner_schema.sql; only the focusMode fallback
-- changes. create or replace keeps the signature, so the existing grants to
-- authenticated (and the revoke from public / anon) still apply.
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

-- The light-only redesign repurposed two settings columns; document them.
comment on column public.planner_settings.accent_color is
  'compacto-ui light palette key (e.g. ocean-light); null or unknown = default palette.';
comment on column public.planner_settings.dark_mode is
  'Unused: the app is light-only. Kept so older clients that still send darkMode keep working.';
