import type { AppStore } from "../store";
import {
  addMessage,
  setError,
  setStreaming,
  truncateAfterLastUser,
  type ChatMessage,
} from "../aiSlice";
import { getAllModels } from "../aiSlice";
import {
  chatCompletion,
  getApiKey,
  type OpenAIMessage,
  type OpenAIToolCall,
} from "./providers";
import { AI_TOOLS, runTool } from "./tools";

const MAX_TOOL_ITERATIONS = 100;

const PLAN_INTENT_RE =
  /\b(plan|schedule|break\s*down|outline|draft|organi[sz]e|set\s*up|create|add|build|prep|prepare|design|map\s*out|delete|remove|wipe|clear|cancel|rename|move|reschedule|mark|finish|complete|undo|revert|list|show|find|search|duplicate|copy|switch|open|new\s+(file|project)|todo|task|summari[sz]e|tldr|explain|describe)\b/i;

const THIS_NOUN_RE =
  /\bthis\s+(course|project|plan|file|list|trip|workspace|board|sprint|thing|one|stuff)\b/i;

function annotateUserText(store: AppStore, text: string): string {
  if (!THIS_NOUN_RE.test(text)) return text;
  const state = store.getState();
  const file = state.todos.files.find((f) => f.id === state.todos.activeFileId);
  if (!file) return text;
  return `${text}\n\n[resolved by app: "this <noun>" = active file "${file.name}" (id=${file.id}). Answer from its tasks/groups. Do NOT ask which one.]`;
}

function shouldForceTool(history: ChatMessage[]): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "user" && !m.hidden) return PLAN_INTENT_RE.test(m.content);
  }
  return false;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildContext(store: AppStore): string {
  const state = store.getState();
  const file = state.todos.files.find((f) => f.id === state.todos.activeFileId);
  const priorities = state.settings.priorityOptions;
  const users = state.users.users;
  const allFiles = state.todos.files;
  const now = new Date();
  const today = isoDate(now);
  const dow = WEEKDAYS[now.getDay()];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const lines: string[] = [];
  lines.push(`Today: ${today} (${dow})`);
  lines.push(`Tomorrow: ${isoDate(tomorrow)}`);
  lines.push(`One week from today: ${isoDate(nextWeek)}`);
  lines.push(`One month from today: ${isoDate(nextMonth)}`);
  lines.push(
    `Available priorities (use ONLY these exact strings, case-sensitive): ${priorities.join(", ") || "(none)"}`,
  );
  lines.push("");
  lines.push(`Files (${allFiles.length}):`);
  for (const f of allFiles) {
    const marker = f.id === state.todos.activeFileId ? " [ACTIVE]" : "";
    lines.push(
      `  - id=${f.id} name="${f.name}" groups=${f.groups.length} tasks=${f.todos.length}${marker}`,
    );
  }
  lines.push("");
  lines.push(`Existing users (${users.length}):`);
  if (users.length === 0) lines.push("  (none)");
  else
    for (const u of users)
      lines.push(
        `  - id=${u.id} name="${u.name}"${u.agenda ? ` agenda="${u.agenda}"` : ""}`,
      );
  lines.push("");
  if (file) {
    lines.push(`Active file: "${file.name}" (id=${file.id})`);
    lines.push(`Existing groups (${file.groups.length}):`);
    if (file.groups.length === 0) lines.push("  (none)");
    else
      for (const g of file.groups)
        lines.push(`  - id=${g.id} name="${g.name}"`);
    lines.push("");
    const groupName = (id: string | null) =>
      id ? (file.groups.find((g) => g.id === id)?.name ?? id) : null;
    const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
    const open = file.todos.filter((t) => !t.done).length;
    const done = file.todos.length - open;
    lines.push(
      `Existing tasks (${file.todos.length} total — ${open} open, ${done} done). Do NOT recreate these. When listing tasks to the user, show the group NAME not the id:`,
    );
    if (file.todos.length === 0) lines.push("  (none)");
    else
      for (const t of file.todos) {
        const gname = groupName(t.groupId);
        const anames = t.assignees.map(userName);
        const assigneeStr =
          anames.length > 0
            ? ` [assignees(${anames.length})=${anames.map((n) => `"${n}"`).join(",")}]`
            : " [assignees(0)]";
        lines.push(
          `  - id=${t.id} "${t.title}"${t.priority ? ` [p=${t.priority}]` : ""}${gname ? ` [group="${gname}"]` : ""}${assigneeStr}${t.done ? " [done]" : ""}`,
        );
      }
  } else {
    lines.push(
      "No active file selected. Tell the user to create or select one before planning.",
    );
  }
  return lines.join("\n");
}

function systemPrompt(store: AppStore): string {
  return `You are a senior planning assistant embedded in a todo planner app. You have FULL write access to files, groups, tasks, and users. The user has pre-approved your edits — act decisively, do not ask for permission for routine operations.

# Identity

If asked "who are you" / "what are you" / "what's your name": reply in ONE short sentence — "I'm your planning assistant in this todo app. I can create, edit, and organize files, groups, tasks, and users." NO tool calls. NO task lists. Then stop.

# Chit-chat & meta questions — no tools

Greetings ("hi", "hello", "yo"), thanks ("thx", "ok"), identity ("who are u"), and small talk: reply with one short line. DO NOT call any tool. Tools are ONLY for planner operations or explicit "what can you do" / "list my tasks" requests.

# READ THIS FIRST — non-negotiable

1. NEVER ask the user clarifying questions for any plan/schedule/break-down/outline request. Pick reasonable defaults and CALL bulk_add_todos. The user can edit. They WILL be angry if you ask. Asking = bug.
2. NEVER invent tools. Only the catalog below exists. No google:search, no web_search, no anything else.
3. NEVER reply with "What would you like to do?", "Tell me more about your goal", "I need more context", "Could you clarify". For any request with a verb + topic, EXECUTE.
4. Plans of 2+ tasks → ONE bulk_add_todos call. Never N individual add_todo.
5. If no active file exists, create_file first, then bulk_add_todos next turn. Never stop after create_file.
6. After a tool result, ANSWER the user's original question using that data. NEVER say "the original question was not provided" or fabricate a different question. If the tool was irrelevant to what they asked (e.g. you called search_tasks for "who are u"), ignore the result and answer the actual question plainly.

# Few-shot example — couch-to-5K, 8 weeks

User: "Schedule a 5K training plan starting from couch level, 8 weeks."
You: (assistant content: "Couch-to-5K, 8 weeks, 3 sessions/week. Group: 'Couch to 5K'. Defaults: Mon/Wed/Sat starting tomorrow.") Then call create_group({name:"Couch to 5K"}), then next turn bulk_add_todos with ~24 dated tasks like "Week 1 Day 1 — 60s jog / 90s walk × 8", each with a thought explaining the build-up. DO NOT ASK ABOUT FITNESS LEVEL, INJURIES, OR DAYS OF WEEK. Defaults are fine.

# Tool catalog

## Files (workspaces)
- create_file(name) — new file, becomes active.
- rename_file(id, name).
- delete_file(id) — DESTRUCTIVE, removes file + all its groups/tasks. Only on explicit request.
- set_active_file(id) — switch which file subsequent group/task ops target.

## Users (people)
- create_user(name, agenda?) — only when assigning to someone not in Existing users.
- update_user(id, name?, agenda?) — rename or update agenda.
- delete_user(id) — only on explicit request.

## Groups (sections in active file)
- create_group(name) — only when no existing group fits.
- rename_group(id, name).
- delete_group(id, cascade?) — cascade=true also deletes tasks inside. Default keeps tasks (groupId→null).

## Tasks (in active file)
- add_todo(title, thought, priority?, groupId?, assigneeIds?, dueFrom?, dueTo?) — thought REQUIRED. Single task only.
- bulk_add_todos({todos: [...]}) — STRONGLY PREFERRED for plans of 2+ tasks. One call instead of N. Same per-item fields as add_todo.
- update_todo(id, ...any subset of fields) — single task: reschedule, reassign, retitle, repriority, regroup, toggle done.
- update_todos({ids, patch}) — same patch on many tasks. Bulk reassign / repriority / reschedule / mark done.
- move_todos({ids, groupId}) — shortcut for regrouping many tasks. Empty groupId ungroups.
- delete_todo(id) — single task removal.
- delete_todos({ all?, groupId?, ids? }) — BULK delete. Use exactly one filter. Prefer over N×delete_todo.
- duplicate_todo(id, title?, dueFrom?, dueTo?, groupId?) — clone a task; clones priority/assignees/thought.
- duplicate_group(id, name?, includeTodos?) — clone a group, optionally with its tasks. Good for recurring templates.

## Read / query (active file)
- get_tasks({includeDone?}) — dump EVERY task in active file as full records. Use for "show all tasks", "list my todos".
- search_tasks({query?, groupId?, assigneeId?, priority?, done?, dueFrom?, dueTo?, limit?}) — filtered lookup. Substring on title+thought, plus filters.
- list_tasks_by_date({from, to?, includeDone?}) — tasks whose work window overlaps the range. Sorted by dueFrom.
- get_task(id) — full record incl. complete thought. Use before editing if context may be truncated.

## Introspection
- get_capabilities() — list of every tool you have, with descriptions. Use for "what can you do", "list your tools".
- get_app_features() — user-facing planner feature list. Use for "what does this app do", "can it do X".

## Scheduling helpers
- find_free_slots({from, to, capacity?, limit?}) — returns dates sorted by current load ascending. Call BEFORE scheduling a batch so you spread work.
- reschedule_overdue({toDate?}) — sweeps every open task whose dueTo < today, bumps to toDate (default today).

## Safety
- undo_last_action() — revert the most recent mutation. Use ONLY on explicit user request ("undo", "revert that").

# Decision rules

- "delete the plan" / "wipe everything" / "clear all" → delete_todos({all:true}). Never refuse-and-ask.
- "delete tasks in <group>" → delete_todos({groupId}) in ONE call.
- "delete <group>" → delete_group(id). If user implies tasks too ("get rid of the trip section and its tasks"), cascade=true.
- "rename <group/file/person> to X" → rename_group / rename_file / update_user.
- "mark <task> done" / "I finished X" → update_todo({id, done:true}).
- "mark these done" / batch toggle → update_todos({ids, patch:{done:true}}).
- "move X to <group>" → update_todo({id, groupId}). Multiple → move_todos.
- "reschedule X to <date>" → update_todo({id, dueFrom, dueTo}). Multiple → update_todos.
- "find / how many tasks…" → search_tasks. Don't guess from context — query for fresh data.
- "show all tasks" / "list my todos" / "what's in this project" → get_tasks.
- "what is this <X>" / "what's this <X> about" / "summarize this <X>" / "tldr" — "this X" ALWAYS means the active file. Call get_tasks, then answer from active file name + tasks + groups. NEVER ask "which X?" when an active file exists. X can be anything the user calls the file (course, project, plan, trip, list, etc).
- "what's on Monday" / "next week" → list_tasks_by_date.
- "what can you do" / "list your tools" → get_capabilities.
- "what does this app do" / "what features" → get_app_features.
- "clean up overdue" / "push misses to today" → reschedule_overdue.
- "undo" / "revert that" → undo_last_action.
- New plan ≥ 2 tasks → bulk_add_todos in ONE call. Never N×add_todo.
- New plan with date spread → call find_free_slots first, then bulk_add_todos using suggested dates.
- "copy / duplicate this task/group" → duplicate_todo / duplicate_group.
- "new project/file <name>" → create_file. Subsequent additions land there because it becomes active.
- "switch to <file>" → set_active_file.
- Match user-mentioned names to ids using the context. Case-insensitive partial match is fine; if multiple match, pick the most recent.

# Planning method (for new-plan asks)

1. Parse goal: scope, deadlines, people, constraints. Note what's missing vs guessable.
2. Decompose into atomic tasks (30 min – half a day each). No vague mega-tasks. No filler ("think about X").
3. Group strategy: reuse if existing group covers ≥70% of topic; else create ONE new group. Most plans need 1–3 groups.
4. Schedule across the window. Prep before dependent. Don't pile one day unless asked.
5. Priorities from Available list only. Highest tier reserved for blockers/hard deadlines.
6. Assignees only when user named someone.

# Task quality bar

- Title: imperative verb + concrete object. Good: "Book Chiang Mai → Bangkok return flights". Bad: "Flights", "Plan trip".
- Thought (REQUIRED, 1–3 sentences): adds NEW info beyond the title — WHY it matters, WHAT to watch for, or HOW to start. Never restate the title.
  - Good: "Book early — May fares spike for the long weekend. Compare AirAsia vs Thai Smile; morning out + evening back preserves day 1 and day 3."
  - Bad: "Book the flights for the trip."
- Every task produces a concrete deliverable.

# Date rules

- Resolve relative phrases ("next Monday", "in 3 days", "end of month") using Today/Tomorrow/One-week/One-month from context. Never guess.
- Absolute dates from the user win.
- Multi-day: dueFrom = first work day, dueTo = last work day. Never span today → deadline.
- Single-day: dueFrom === dueTo.
- No date info → omit both.

# Reasoning protocol

For non-trivial requests, before firing tool calls, briefly note (in your assistant message content) the plan: what you'll add/change, in what groups, on what dates. 1–4 short lines. Then call tools.

# Execution policy

- Execute the WHOLE intent this turn. Use parallel tool calls aggressively — create_group then fire all add_todos in parallel.
- Never pause mid-plan to confirm. The user pre-approved all writes.
- Prerequisite chaining: if you need a new file/group/user, call that tool first. Wait for its tool result, READ the returned id, then in the NEXT model turn call add_todo with that id. Keep going until the full plan is in.
- After create_file: do not stop. The next turn MUST call add_todo (or create_group → add_todo) for every task in the user's request.
- Never recreate an existing task (match by title, case-insensitive in the active file).
- If no active file exists, create_file first, then proceed.

# Absolute rule: tools over prose

You create tasks ONLY via add_todo tool calls. NEVER describe a task in your reply text. The user does NOT see anything you write — they only see what tools mutate. If you find yourself typing "Title: X" or "Task: Y" or listing tasks in plain text, STOP and call add_todo instead. A reply that lists tasks in text without tool calls is a BUG — the tasks did not get created.

If a required field like "thought" is missing for a task the user requested, DO NOT skip the task. Generate a 1–3 sentence thought yourself based on the task title and context, then call add_todo. Never refuse a task because info is "missing" — fill it.

# Clarification — almost never

Default = NO clarification. If the request names an activity + a timeframe (e.g. "5K training plan, 8 weeks", "study Spanish, 6 weeks", "plan a 3-day trip"), you have enough — pick reasonable defaults and execute. Couch-to-5K, beginner Spanish A1, generic tourist itinerary — all valid defaults. The user can edit anything.

NEVER ask the user a question when:
- A verb + topic is present ("plan X", "schedule X", "break down X", "outline X").
- The user already gave scope or timeframe.
- You could fill the gap with a reasonable default and let them edit.

Ask ONLY when literally unanswerable: ambiguous named person you cannot disambiguate ("which Alex?"). For anything else: assume, execute, summarize, move on.

When the user says "this <noun>" (this course / this project / this plan / this file / this list / this trip / etc), it ALWAYS refers to the ACTIVE FILE in context. Never ask "which one?". If no active file exists, say so plainly — do not ask which one they meant.

When you do ask (rare):
- Plain-text reply. ZERO tool calls in that turn. Then stop.
- Never call get_capabilities, get_app_features, or any read tool "to figure out what to do" — those are ONLY when the user literally asks what the assistant/app can do.

# Forbidden behaviors (will break the app)

- Calling tools that aren't in the catalog above (e.g. "google:search", "web_search"). The catalog is complete. Do not invent tools.
- Replying with a generic prompt like "What would you like to do today?" or "Tell me more about your goal" when the user already gave a concrete plan request. That is a BUG.
- Treating get_capabilities output as a reason to ask the user a follow-up. get_capabilities is only for "what can you do" questions and its result is summarized back, not turned into a question.
- Mixing a clarifying question with tool calls in the same turn. Either execute or ask — never both.

# Output

After tools complete, give a tight summary (≤5 lines): what changed, counts, date range, any defaults you picked. Do not re-list every task.

# Context
${buildContext(store)}`;
}

function toOpenAIMessages(
  store: AppStore,
  history: ChatMessage[],
): OpenAIMessage[] {
  const msgs: OpenAIMessage[] = [
    { role: "system", content: systemPrompt(store) },
  ];
  for (const m of history) {
    if (m.role === "user") msgs.push({ role: "user", content: m.content });
    else if (m.role === "assistant") {
      if (m.toolCalls && m.toolCalls.length > 0) {
        msgs.push({
          role: "assistant",
          content: m.content || null,
          tool_calls: m.toolCalls.map((c) => ({
            id: c.id,
            type: "function" as const,
            function: { name: c.name, arguments: c.args },
          })),
        });
      } else {
        msgs.push({ role: "assistant", content: m.content });
      }
    } else if (m.role === "tool" && m.toolName) {
      msgs.push({ role: "tool", content: m.content, tool_call_id: m.toolName });
    }
  }
  return msgs;
}

async function runLoop(store: AppStore, signal: AbortSignal): Promise<void> {
  const state = store.getState();
  const modelOpt = getAllModels(
    state.ai.ollamaModels,
    state.ai.openrouterModels,
  ).find((m) => m.id === state.ai.modelId);
  if (!modelOpt) {
    store.dispatch(setError("Model not found"));
    return;
  }
  const apiKey = getApiKey(modelOpt.provider);
  if (!apiKey && modelOpt.provider !== "ollama") {
    store.dispatch(
      setError(`Missing API key for ${modelOpt.provider}. Add it in settings.`),
    );
    return;
  }

  store.dispatch(setStreaming(true));
  store.dispatch(setError(null));

  const validToolNames = new Set(AI_TOOLS.map((t) => t.function.name));
  let nudgesUsed = 0;
  const MAX_NUDGES = 2;

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const history = store.getState().ai.messages;
      const messages = toOpenAIMessages(store, history);
      const forceTool = shouldForceTool(history);
      const toolChoice = forceTool && i === 0 ? "required" : "auto";
      const res = await chatCompletion({
        provider: modelOpt.provider,
        model: modelOpt.id,
        apiKey,
        messages,
        tools: AI_TOOLS,
        toolChoice,
        signal,
      });
      const choice = res.choices?.[0];
      if (!choice) throw new Error("Empty response");
      const msg = choice.message;
      const rawCalls: OpenAIToolCall[] = msg.tool_calls ?? [];
      const validCalls = rawCalls.filter((c) =>
        validToolNames.has(c.function.name),
      );
      const invalidCalls = rawCalls.filter(
        (c) => !validToolNames.has(c.function.name),
      );

      store.dispatch(
        addMessage({
          role: "assistant",
          content: msg.content ?? "",
          toolCalls: validCalls.map((c) => ({
            id: c.id,
            name: c.function.name,
            args: c.function.arguments,
          })),
        }),
      );

      if (validCalls.length === 0) {
        const stuck = invalidCalls.length > 0 || !msg.content?.trim() ||
          /\b(clarify|more (info|context|detail)|could you|please (tell|provide|specify)|what (would|kind|day|time)|let me know|need to know)\b/i.test(
            msg.content ?? "",
          );
        if (forceTool && stuck && nudgesUsed < MAX_NUDGES) {
          nudgesUsed++;
          const bad = invalidCalls
            .map((c) => c.function.name)
            .filter(Boolean)
            .join(", ");
          const hint = bad
            ? `Tool "${bad}" does not exist. Use bulk_add_todos.`
            : `Do NOT ask the user. Call bulk_add_todos NOW with reasonable defaults.`;
          store.dispatch(
            addMessage({
              role: "user",
              hidden: true,
              content: `[system override] ${hint} Pick defaults. The user has pre-approved everything. NEVER reply with text — only call tools from the catalog.`,
            }),
          );
          continue;
        }
        return;
      }

      for (const call of validCalls) {
        const result = runTool(
          store,
          call.function.name,
          call.function.arguments,
        );
        store.dispatch(
          addMessage({
            role: "tool",
            toolName: call.id,
            content: JSON.stringify(result),
          }),
        );
      }
    }
    store.dispatch(setError("Tool iteration limit reached"));
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    store.dispatch(setError((e as Error).message));
  } finally {
    store.dispatch(setStreaming(false));
  }
}

export async function runChat(
  store: AppStore,
  userText: string,
  signal: AbortSignal,
): Promise<void> {
  store.dispatch(
    addMessage({ role: "user", content: annotateUserText(store, userText) }),
  );
  await runLoop(store, signal);
}

export async function retryChat(
  store: AppStore,
  signal: AbortSignal,
): Promise<void> {
  const history = store.getState().ai.messages;
  const hasUser = history.some((m) => m.role === "user");
  if (!hasUser) {
    store.dispatch(setError("Nothing to retry"));
    return;
  }
  store.dispatch(truncateAfterLastUser());
  await runLoop(store, signal);
}
