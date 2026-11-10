-- Agent runs.
--
-- Live progress of an agent working on a task, as its skill reports it
-- through the Plan API (`POST /api/plan/<todoId>/event`, `planner.sh event`).
-- One row per task — the latest run. The task's comment thread watches it
-- through Supabase Realtime (src/lib/agent-runs.ts, AgentRunPanel).
--
-- Writes go only through planner_agent_run_event(), which applies one event
-- atomically (the start / join / ifActive rules live there, so two quick
-- events can't race). The app's Clear goes through planner_agent_run_clear(),
-- which hides the run rather than deleting it: Realtime can't apply RLS to
-- DELETE events, so a delete would announce its key to every subscriber.

create table public.planner_agent_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id text not null,
  todo_id text not null,
  run_id uuid not null,
  agent text not null,
  status text not null check (status in ('running', 'waiting', 'done', 'failed')),
  comment_id text,
  -- Started by Planner's Run agent dialog; the agent's own `start` joins it.
  launched boolean not null default false,
  -- Cleared in the app: read as "no run" until the next start.
  cleared boolean not null default false,
  -- [{ kind, text, at (epoch ms), tool?, requestId? }], oldest first.
  steps jsonb not null default '[]',
  -- { <requestId>: { tool, detail, bridgeRunId, state, at } }
  approvals jsonb not null default '{}',
  result text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (user_id, file_id, todo_id)
);

alter table public.planner_agent_runs enable row level security;

create policy "Users read their own agent runs"
  on public.planner_agent_runs for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.planner_agent_runs from anon, authenticated;
grant select on public.planner_agent_runs to authenticated;

-- Apply one event (see src/app/api/plan/[todoId]/event/route.ts for the
-- types). Called by the Plan API as the user (session JWT: p_user_id is
-- ignored, auth.uid() is used) or with the secret key (API keys: p_user_id
-- names the user). Returns the run's new status, or 'none' when an
-- `ifActive` event found no active run.
create function public.planner_agent_run_event(
  p_user_id uuid,
  p_file_id text,
  p_todo_id text,
  p_type text,
  p_text text default '',
  p_agent text default 'Agent',
  p_comment_id text default null,
  p_launch boolean default false,
  p_if_active boolean default false,
  p_request_id text default '',
  p_bridge_run_id text default '',
  p_tool text default 'tool',
  p_allow boolean default false
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := case
    when (select auth.jwt() ->> 'role') = 'service_role' then p_user_id
    else (select auth.uid())
  end;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_text text := coalesce(p_text, '');
  v_kind text := case p_type
    when 'start' then 'info'
    when 'step' then 'step'
    when 'ask' then 'ask'
    when 'done' then 'result'
    when 'fail' then 'error'
    when 'permission' then 'permission'
    when 'permission-result' then 'info'
  end;
  v_status text := case p_type
    when 'ask' then 'waiting'
    when 'permission' then 'waiting'
    when 'done' then 'done'
    when 'fail' then 'failed'
    else 'running'
  end;
  v_run public.planner_agent_runs;
  v_active boolean;
  v_step_text text;
  v_step jsonb;
  v_asked jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if v_kind is null then
    raise exception 'Unknown event type: %', p_type using errcode = '22023';
  end if;

  -- One event at a time per task, also while its row doesn't exist yet.
  perform pg_advisory_xact_lock(
    hashtextextended('planner_agent_runs/' || v_uid || '/' || p_file_id || '/' || p_todo_id, 0)
  );

  select * into v_run
  from public.planner_agent_runs r
  where r.user_id = v_uid and r.file_id = p_file_id and r.todo_id = p_todo_id;
  -- A launch always starts fresh.
  v_active := found and not p_launch and not v_run.cleared
    and v_run.status in ('running', 'waiting');

  if p_if_active and not v_active then
    return 'none';
  end if;

  if p_type = 'start' and v_active and v_run.launched then
    -- The launched agent reporting in: keep the run, mark it joined.
    v_run.launched := false;
  elsif p_type = 'start' or not v_active then
    v_run.user_id := v_uid;
    v_run.file_id := p_file_id;
    v_run.todo_id := p_todo_id;
    v_run.run_id := gen_random_uuid();
    v_run.agent := p_agent;
    v_run.comment_id := p_comment_id;
    v_run.launched := p_launch;
    v_run.cleared := false;
    v_run.steps := '[]';
    v_run.approvals := '{}';
    v_run.result := null;
    v_run.started_at := now();
    v_run.ended_at := null;
  end if;

  v_step_text := case
    when v_text <> '' then v_text
    when p_type = 'start' then 'Started'
    when p_type = 'done' then 'Done'
    else ''
  end;

  if p_type = 'permission' then
    v_run.approvals := v_run.approvals || jsonb_build_object(p_request_id, jsonb_build_object(
      'tool', p_tool,
      'detail', v_text,
      'bridgeRunId', coalesce(p_bridge_run_id, ''),
      'state', 'pending',
      'at', v_now
    ));
  elsif p_type = 'permission-result' then
    v_asked := v_run.approvals -> p_request_id;
    v_run.approvals := v_run.approvals || jsonb_build_object(p_request_id,
      coalesce(v_asked, '{}') || jsonb_build_object(
        'state', case when p_allow then 'allowed' else 'denied' end
      ));
    v_step_text := left(
      case when p_allow then 'Allowed' else 'Denied' end || ': '
        || coalesce(v_asked ->> 'tool', p_tool)
        || case when coalesce(v_asked ->> 'detail', '') <> ''
             then ' · ' || (v_asked ->> 'detail') else '' end
        || case when not p_allow and v_text <> '' then ' (' || v_text || ')' else '' end,
      4000);
  end if;

  v_step := jsonb_build_object('kind', v_kind, 'text', v_step_text, 'at', v_now);
  if p_type = 'permission' then
    v_step := v_step || jsonb_build_object('tool', p_tool, 'requestId', p_request_id);
  end if;
  v_run.steps := v_run.steps || jsonb_build_array(v_step);
  v_run.status := v_status;
  v_run.updated_at := now();
  if p_type in ('done', 'fail') then
    v_run.ended_at := now();
  end if;
  if p_type = 'done' and v_text <> '' then
    v_run.result := v_text;
  end if;

  -- One write per event, so Realtime sends one change per event.
  insert into public.planner_agent_runs
  select (v_run).*
  on conflict (user_id, file_id, todo_id) do update set
    run_id = excluded.run_id,
    agent = excluded.agent,
    status = excluded.status,
    comment_id = excluded.comment_id,
    launched = excluded.launched,
    cleared = excluded.cleared,
    steps = excluded.steps,
    approvals = excluded.approvals,
    result = excluded.result,
    started_at = excluded.started_at,
    updated_at = excluded.updated_at,
    ended_at = excluded.ended_at;

  return v_status;
end;
$$;

revoke all on function public.planner_agent_run_event(
  uuid, text, text, text, text, text, text, boolean, boolean, text, text, text, boolean
) from public, anon;
grant execute on function public.planner_agent_run_event(
  uuid, text, text, text, text, text, text, boolean, boolean, text, text, text, boolean
) to authenticated, service_role;

-- The panel's Clear: hide the task's run (any file when p_file_id is null).
create function public.planner_agent_run_clear(p_file_id text, p_todo_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.planner_agent_runs
  set cleared = true, updated_at = now()
  where user_id = (select auth.uid())
    and (p_file_id is null or file_id = p_file_id)
    and todo_id = p_todo_id;
$$;

revoke all on function public.planner_agent_run_clear(text, text) from public, anon;
grant execute on function public.planner_agent_run_clear(text, text) to authenticated;

-- Stream row changes to the app.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table public.planner_agent_runs;
