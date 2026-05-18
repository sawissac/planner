import type { OpenAITool } from "./providers"
import type { AppStore } from "../store"
import { addUser, deleteUser, updateUser } from "../userSlice"
import {
  addTodo,
  clearAll,
  createFile,
  createGroup,
  deleteFile,
  deleteGroup,
  deleteTodo,
  renameFile,
  renameGroup,
  setActiveFile,
  updateTodo,
} from "../todoSlice"
import { undoAction, canUndo } from "../undo"

export const AI_TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "create_user",
      description:
        "Create a new person in the user table. Use ONLY when the user explicitly named someone who is not already in Existing users. Always check Existing users first and match case-insensitively. Returns the new user's id and name.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Display name as the user wrote it. Trim whitespace.",
          },
          agenda: {
            type: "string",
            description:
              "Optional short role/agenda (e.g. 'designer', 'travel buddy'). Omit if unclear.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user",
      description:
        "Edit an existing person's name or agenda. Use the user id from Existing users in context. Only include fields you want to change.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing user id. REQUIRED." },
          name: { type: "string", description: "New display name." },
          agenda: {
            type: "string",
            description: "Replacement agenda/role. Empty string clears it.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_user",
      description:
        "Permanently remove a person from the user table. Existing tasks keep their assignee ids (the entry just becomes orphan). Use ONLY when the user explicitly asked to remove that person.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing user id. REQUIRED." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_group",
      description:
        "Create a new group in the active file. Use ONLY when no existing group fits — reuse an existing group if the name overlaps the new topic by roughly 70%+ in meaning. Most plans need 1–3 groups total. Returns the group id.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Short, descriptive group name (2–4 words). Title Case. Examples: 'Chiang Mai Trip', 'Onboarding Plan', 'Landing Page MVP'.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_group",
      description:
        "Rename an existing group in the active file. Use the group id from Existing groups in context.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing group id. REQUIRED." },
          name: { type: "string", description: "New group name. REQUIRED." },
        },
        required: ["id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      description:
        "Append a task to the active file. Reuse existing group/user ids from context whenever possible. Required: title and thought. See the system prompt for the full quality bar — titles must be imperative+concrete, thoughts must add information beyond the title.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Imperative verb + concrete object. Good: 'Book Chiang Mai → Bangkok return flights'. Bad: 'Flights', 'Plan trip'.",
          },
          priority: {
            type: "string",
            description:
              "Must match one of Available priorities exactly (case-sensitive). Reserve the highest tier for blockers/hard deadlines. Omit if unclear.",
          },
          progress: {
            type: "string",
            description:
              "Must match one of Available progress states exactly (case-sensitive). Defaults to 'Not Started' on create. Setting 'Done' also marks the task done.",
          },
          groupId: {
            type: "string",
            description:
              "Existing group id from context. Omit for ungrouped. Prefer reuse over creating new groups.",
          },
          assigneeIds: {
            type: "array",
            items: { type: "string" },
            description:
              "User ids to assign. Only set when the user explicitly named someone. Empty array == no assignees.",
          },
          dueFrom: {
            type: "string",
            description:
              "ISO date YYYY-MM-DD. First day of work window. Resolve relative phrases ('next Monday') using Today from context. Omit if no date is given or derivable.",
          },
          dueTo: {
            type: "string",
            description:
              "ISO date YYYY-MM-DD. Last day of work window. Equal to dueFrom for single-day tasks. Never span today → deadline — only span the actual work window.",
          },
          thought: {
            type: "string",
            description:
              "REQUIRED. 1–3 sentences that ADD information beyond the title: WHY this matters, WHAT to watch for, or HOW to start. Never restate the title. Plain text, no markdown. Good: 'Book early — May fares spike for the long weekend. Compare AirAsia vs Thai Smile; morning out, evening back keeps day 1 and 3 intact.' Bad: 'Book the flights for the trip.'",
          },
        },
        required: ["title", "thought"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todo",
      description:
        "Modify fields on an existing task in the active file. Use the task id from Existing tasks in context (NOT the title). Only include the fields you want to change — all others are left untouched. Use this for rescheduling, reassigning, changing priority/group, marking done, or rewriting title/thought.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Existing task id from context. REQUIRED.",
          },
          title: { type: "string", description: "New title. Same quality bar as add_todo." },
          thought: {
            type: "string",
            description: "Replacement thought. Same quality bar as add_todo.",
          },
          priority: {
            type: "string",
            description: "Must match Available priorities exactly. Use empty string to clear.",
          },
          progress: {
            type: "string",
            description: "Must match Available progress states exactly. Use empty string to clear. Setting 'Done' also marks the task done; setting any other value reopens it.",
          },
          groupId: {
            type: "string",
            description: "Existing group id. Empty string to ungroup.",
          },
          assigneeIds: {
            type: "array",
            items: { type: "string" },
            description: "Full replacement list of user ids. Empty array to clear.",
          },
          dueFrom: {
            type: "string",
            description: "ISO YYYY-MM-DD. New start of work window.",
          },
          dueTo: {
            type: "string",
            description: "ISO YYYY-MM-DD. New end of work window. Same as dueFrom for single-day.",
          },
          done: {
            type: "boolean",
            description: "Mark complete or reopen. doneAt is set/cleared automatically.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      description:
        "Permanently remove a single task from the active file. Use ONLY when the user explicitly asked to delete/remove/cancel that task. Use the task id from Existing tasks in context. For bulk deletes use delete_todos instead.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Existing task id from context. REQUIRED.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todos",
      description:
        "Bulk-remove tasks from the active file in one call. Use when the user says things like 'delete the plan', 'remove all tasks', 'clear the trip', 'cancel everything in group X'. Pass exactly ONE filter: `all=true` to wipe the active file, `groupId` to wipe one group's tasks, or `ids` for a specific subset. Never delete without an explicit user request.",
      parameters: {
        type: "object",
        properties: {
          all: {
            type: "boolean",
            description: "True = delete every task in the active file. Use for 'delete the plan' / 'clear everything'.",
          },
          groupId: {
            type: "string",
            description: "Existing group id. Deletes every task whose groupId matches.",
          },
          ids: {
            type: "array",
            items: { type: "string" },
            description: "Explicit task ids to remove.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_group",
      description:
        "Remove a group from the active file. By default tasks in that group are KEPT (their groupId becomes null). Set cascade=true to also delete the tasks inside it. Use when the user asked to delete/remove a group/section.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing group id. REQUIRED." },
          cascade: {
            type: "boolean",
            description: "True = also delete every task currently in this group.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description:
        "Create a new planner file (project/workspace) and make it active. Use when the user asks to start a new file/project/plan in its own workspace. Returns the file id.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "File name (2–4 words). Title Case. e.g. 'Chiang Mai Trip', 'Q3 Goals'.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_file",
      description:
        "Rename an existing file. Use the file id from Files in context.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing file id. REQUIRED." },
          name: { type: "string", description: "New file name. REQUIRED." },
        },
        required: ["id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description:
        "Permanently remove a file (and all its groups/tasks). DESTRUCTIVE. Use ONLY when the user explicitly asked to delete that file/project.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing file id. REQUIRED." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_active_file",
      description:
        "Switch which file is active. All subsequent group/task tools target the active file. Use when the user asks to switch project/file.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing file id. REQUIRED." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description:
        "Search tasks in the active file by text and/or filters. Use this when the user asks about tasks that may not be in the initial context dump, or to find by attribute (overdue, assigned to X, in group Y, by priority, done/open). Returns full task records (id, title, thought, dates, priority, group, assignees, done). Combine filters with AND.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Case-insensitive substring match on title and thought. Omit for filter-only search.",
          },
          groupId: { type: "string", description: "Restrict to this group id." },
          assigneeId: { type: "string", description: "Restrict to tasks assigned to this user id." },
          priority: { type: "string", description: "Exact priority match." },
          progress: { type: "string", description: "Exact progress state match." },
          done: { type: "boolean", description: "True = only completed; false = only open." },
          dueFrom: { type: "string", description: "ISO YYYY-MM-DD. Match tasks whose window overlaps on/after this date." },
          dueTo: { type: "string", description: "ISO YYYY-MM-DD. Match tasks whose window overlaps on/before this date." },
          limit: { type: "number", description: "Max results (default 50)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks_by_date",
      description:
        "List tasks in the active file whose work window overlaps the given date range. Use for 'what's on my plate next week', 'show me Monday', etc. Returns tasks sorted by dueFrom ascending.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "ISO YYYY-MM-DD. Inclusive start." },
          to: { type: "string", description: "ISO YYYY-MM-DD. Inclusive end. Default = same as from." },
          includeDone: { type: "boolean", description: "Include completed tasks. Default false." },
        },
        required: ["from"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_task",
      description:
        "Return the full record of a single task in the active file. Use when context-listed task title/thought may be truncated and you need full text before editing.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task id from context. REQUIRED." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todos",
      description:
        "Apply the SAME patch to multiple tasks in one call. Use for bulk reassign, repriority, reschedule, mark-done. Each field in `patch` overwrites that field on every listed task. Omit a patch field to leave it unchanged.",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" }, description: "Task ids to update. REQUIRED." },
          patch: {
            type: "object",
            description: "Fields to overwrite on each task.",
            properties: {
              priority: { type: "string", description: "Empty string clears." },
              progress: {
                type: "string",
                description:
                  "Empty string clears. Setting 'Done' also marks tasks done; any other value reopens them.",
              },
              groupId: { type: "string", description: "Empty string ungroups." },
              assigneeIds: { type: "array", items: { type: "string" } },
              dueFrom: { type: "string", description: "ISO YYYY-MM-DD." },
              dueTo: { type: "string", description: "ISO YYYY-MM-DD." },
              done: { type: "boolean" },
            },
          },
        },
        required: ["ids", "patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_todos",
      description:
        "Move multiple tasks to a different group in one call. Shortcut for update_todos with patch={groupId}. Use empty string for groupId to ungroup.",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" }, description: "Task ids to move. REQUIRED." },
          groupId: { type: "string", description: "Target group id. Empty string = ungroup. REQUIRED." },
        },
        required: ["ids", "groupId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_add_todos",
      description:
        "Create many tasks in one tool call. Strongly prefer this over multiple add_todo calls when generating a plan — one call instead of N round-trips. Each item follows the same quality bar as add_todo (imperative title + concrete thought). All items land in the active file.",
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            description: "Array of task specs. REQUIRED, at least 1.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                thought: { type: "string" },
                priority: { type: "string" },
                progress: {
                  type: "string",
                  description:
                    "Must match Available progress states exactly. Default 'Not Started'. 'Done' also marks the task done.",
                },
                groupId: { type: "string" },
                assigneeIds: { type: "array", items: { type: "string" } },
                dueFrom: { type: "string", description: "ISO YYYY-MM-DD." },
                dueTo: { type: "string", description: "ISO YYYY-MM-DD." },
              },
              required: ["title", "thought"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_last_action",
      description:
        "Revert the most recent state-changing action (any todo/group/file/user mutation). Use ONLY when the user explicitly asks to undo / take back / revert the last change. One step per call. Returns whether anything was undone.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "find_free_slots",
      description:
        "Suggest dates in the given range that have task load below `capacity`. Use BEFORE scheduling a new batch so you spread work instead of piling one day. Counts any task whose work window covers that day. Returns ISO dates sorted by current load ascending.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "ISO YYYY-MM-DD inclusive start. REQUIRED." },
          to: { type: "string", description: "ISO YYYY-MM-DD inclusive end. REQUIRED." },
          capacity: { type: "number", description: "Max tasks/day to consider 'free'. Default 3." },
          limit: { type: "number", description: "Max dates returned. Default 14." },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_overdue",
      description:
        "Find every open task in the active file whose dueTo is before today and bump it to `toDate` (default today). Returns the ids and count moved. Use when the user says 'clean up overdue', 'push the misses to today', etc.",
      parameters: {
        type: "object",
        properties: {
          toDate: { type: "string", description: "ISO YYYY-MM-DD target. Default = today." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "duplicate_todo",
      description:
        "Copy an existing task to a new task in the same file. Optionally override title/dueFrom/dueTo/groupId. All other fields (priority, assignees, thought) are cloned.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Source task id. REQUIRED." },
          title: { type: "string", description: "Override title. Default: source title + ' (copy)'." },
          dueFrom: { type: "string", description: "ISO YYYY-MM-DD override." },
          dueTo: { type: "string", description: "ISO YYYY-MM-DD override." },
          groupId: { type: "string", description: "Override group id. Empty string = ungroup." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "duplicate_group",
      description:
        "Create a new group in the active file and optionally copy every task from a source group into it. Useful for templating recurring plan structures (e.g. duplicate 'Q1 Goals' into 'Q2 Goals').",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Source group id. REQUIRED." },
          name: { type: "string", description: "New group name. Default: source name + ' (copy)'." },
          includeTodos: { type: "boolean", description: "Copy tasks from the source group into the new group. Default true." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_capabilities",
      description:
        "Return the list of every tool currently exposed to you, with each tool's description. Use when the user asks 'what can you do', 'list your tools', 'what commands are available', etc. Pure read, no side effects.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_app_features",
      description:
        "Return the user-facing feature list of this planner app (groups, priorities, assignees, multi-file workspaces, Google Drive sync, undo/redo, dark mode, AI assistant, etc.). Use when the user asks 'what does this app do', 'what features does it have', 'can it do X', etc.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "Return EVERY task in the active file (the current project) as full records. Use when the user asks 'show all tasks', 'list my todos', 'what's in this project'. For filtered lookups (by group, assignee, date, etc.) use search_tasks instead.",
      parameters: {
        type: "object",
        properties: {
          includeDone: {
            type: "boolean",
            description: "Include completed tasks. Default true.",
          },
        },
      },
    },
  },
]

export type ToolName =
  | "create_user"
  | "update_user"
  | "delete_user"
  | "create_group"
  | "rename_group"
  | "delete_group"
  | "add_todo"
  | "update_todo"
  | "delete_todo"
  | "delete_todos"
  | "create_file"
  | "rename_file"
  | "delete_file"
  | "set_active_file"
  | "search_tasks"
  | "list_tasks_by_date"
  | "get_task"
  | "update_todos"
  | "move_todos"
  | "bulk_add_todos"
  | "undo_last_action"
  | "find_free_slots"
  | "reschedule_overdue"
  | "duplicate_todo"
  | "duplicate_group"
  | "get_capabilities"
  | "get_app_features"
  | "get_tasks"

type ToolResult = Record<string, unknown>

function parseDate(s: unknown, fallback: number): number {
  if (typeof s !== "string") return fallback
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : fallback
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function endOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function runTool(
  store: AppStore,
  name: string,
  argsJson: string,
): ToolResult {
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(argsJson || "{}")
  } catch {
    return { error: "Invalid JSON arguments" }
  }

  if (name === "create_user") {
    const userName = typeof args.name === "string" ? args.name.trim() : ""
    if (!userName) return { error: "name required" }
    const action = addUser(userName)
    store.dispatch(action)
    const id = action.payload.id
    const agenda = typeof args.agenda === "string" ? args.agenda : ""
    if (agenda) {
      store.dispatch(updateUser({ id, agenda }))
    }
    return { id, name: userName }
  }

  if (name === "update_user") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const payload: { id: string; name?: string; agenda?: string } = { id }
    if (typeof args.name === "string") payload.name = args.name.trim()
    if (typeof args.agenda === "string") payload.agenda = args.agenda
    store.dispatch(updateUser(payload))
    return { id, updated: true }
  }

  if (name === "delete_user") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    store.dispatch(deleteUser(id))
    return { id, deleted: true }
  }

  if (name === "create_group") {
    const groupName = typeof args.name === "string" ? args.name.trim() : ""
    if (!groupName) return { error: "name required" }
    const action = createGroup(groupName)
    store.dispatch(action)
    return { id: action.payload.id, name: groupName }
  }

  if (name === "rename_group") {
    const id = typeof args.id === "string" ? args.id : ""
    const newName = typeof args.name === "string" ? args.name.trim() : ""
    if (!id || !newName) return { error: "id and name required" }
    store.dispatch(renameGroup({ id, name: newName }))
    return { id, name: newName, renamed: true }
  }

  if (name === "add_todo") {
    const title = typeof args.title === "string" ? args.title.trim() : ""
    if (!title) return { error: "title required" }
    const groupId =
      typeof args.groupId === "string" && args.groupId ? args.groupId : null
    const action = addTodo(title, groupId)
    store.dispatch(action)
    const id = action.payload.id
    const now = Date.now()
    const fromTs = parseDate(args.dueFrom, now)
    const toTs = parseDate(args.dueTo, fromTs)
    const assigneeIds = Array.isArray(args.assigneeIds)
      ? (args.assigneeIds as unknown[]).filter((x): x is string => typeof x === "string")
      : []
    const priority = typeof args.priority === "string" ? args.priority : null
    const progress =
      typeof args.progress === "string" && args.progress ? args.progress : null
    const thought = typeof args.thought === "string" ? args.thought.trim() : ""
    store.dispatch(
      updateTodo({
        id,
        priority,
        assignees: assigneeIds,
        completedFrom: startOfDay(fromTs),
        completedTo: endOfDay(toTs),
        ...(progress ? { progress } : {}),
        ...(thought ? { thought } : {}),
      }),
    )
    return { id, title }
  }

  if (name === "update_todo") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const payload: Parameters<typeof updateTodo>[0] = { id }
    if (typeof args.title === "string") payload.title = args.title.trim()
    if (typeof args.thought === "string") payload.thought = args.thought.trim()
    if (typeof args.priority === "string")
      payload.priority = args.priority === "" ? null : args.priority
    if (typeof args.progress === "string")
      payload.progress = args.progress === "" ? null : args.progress
    if (typeof args.groupId === "string")
      payload.groupId = args.groupId === "" ? null : args.groupId
    if (Array.isArray(args.assigneeIds))
      payload.assignees = (args.assigneeIds as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    if (typeof args.dueFrom === "string") {
      const ts = Date.parse(args.dueFrom)
      if (Number.isFinite(ts)) payload.completedFrom = startOfDay(ts)
    }
    if (typeof args.dueTo === "string") {
      const ts = Date.parse(args.dueTo)
      if (Number.isFinite(ts)) payload.completedTo = endOfDay(ts)
    }
    if (typeof args.done === "boolean") payload.done = args.done
    store.dispatch(updateTodo(payload))
    return { id, updated: true }
  }

  if (name === "delete_todo") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    store.dispatch(deleteTodo(id))
    return { id, deleted: true }
  }

  if (name === "delete_todos") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    let ids: string[] = []
    if (args.all === true) {
      ids = file.todos.map((t) => t.id)
      store.dispatch(clearAll())
      return { deleted: ids.length, ids }
    }
    if (typeof args.groupId === "string" && args.groupId) {
      ids = file.todos
        .filter((t) => t.groupId === args.groupId)
        .map((t) => t.id)
    } else if (Array.isArray(args.ids)) {
      ids = (args.ids as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    } else {
      return { error: "Must pass one of: all=true, groupId, or ids[]" }
    }
    for (const id of ids) store.dispatch(deleteTodo(id))
    return { deleted: ids.length, ids }
  }

  if (name === "delete_group") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const cascade = args.cascade === true
    let cascadedIds: string[] = []
    if (cascade) {
      const state = store.getState()
      const file = state.todos.files.find(
        (f) => f.id === state.todos.activeFileId,
      )
      if (file) {
        cascadedIds = file.todos
          .filter((t) => t.groupId === id)
          .map((t) => t.id)
        for (const tid of cascadedIds) store.dispatch(deleteTodo(tid))
      }
    }
    store.dispatch(deleteGroup(id))
    return { id, deleted: true, cascadedTodoIds: cascadedIds }
  }

  if (name === "create_file") {
    const fileName = typeof args.name === "string" ? args.name.trim() : ""
    if (!fileName) return { error: "name required" }
    const action = createFile(fileName)
    store.dispatch(action)
    return { id: action.payload.id, name: fileName }
  }

  if (name === "rename_file") {
    const id = typeof args.id === "string" ? args.id : ""
    const newName = typeof args.name === "string" ? args.name.trim() : ""
    if (!id || !newName) return { error: "id and name required" }
    store.dispatch(renameFile({ id, name: newName }))
    return { id, name: newName, renamed: true }
  }

  if (name === "delete_file") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    store.dispatch(deleteFile(id))
    return { id, deleted: true }
  }

  if (name === "set_active_file") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    store.dispatch(setActiveFile(id))
    return { id, active: true }
  }

  if (name === "search_tasks") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const q =
      typeof args.query === "string" ? args.query.trim().toLowerCase() : ""
    const groupId =
      typeof args.groupId === "string" && args.groupId ? args.groupId : null
    const assigneeId =
      typeof args.assigneeId === "string" && args.assigneeId
        ? args.assigneeId
        : null
    const priority =
      typeof args.priority === "string" && args.priority ? args.priority : null
    const progress =
      typeof args.progress === "string" && args.progress ? args.progress : null
    const done = typeof args.done === "boolean" ? args.done : null
    const fromTs =
      typeof args.dueFrom === "string"
        ? startOfDay(Date.parse(args.dueFrom))
        : null
    const toTs =
      typeof args.dueTo === "string"
        ? endOfDay(Date.parse(args.dueTo))
        : null
    const limit =
      typeof args.limit === "number" && args.limit > 0 ? args.limit : 50
    const matches = file.todos.filter((t) => {
      if (q) {
        const hay = `${t.title}\n${t.thought}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (groupId && t.groupId !== groupId) return false
      if (assigneeId && !t.assignees.includes(assigneeId)) return false
      if (priority && t.priority !== priority) return false
      if (progress && t.progress !== progress) return false
      if (done !== null && t.done !== done) return false
      if (fromTs !== null && t.completedTo < fromTs) return false
      if (toTs !== null && t.completedFrom > toTs) return false
      return true
    })
    return {
      count: Math.min(matches.length, limit),
      total: matches.length,
      tasks: matches.slice(0, limit).map((t) => ({
        id: t.id,
        title: t.title,
        thought: t.thought,
        priority: t.priority,
        progress: t.progress,
        groupId: t.groupId,
        assignees: t.assignees,
        done: t.done,
        dueFrom: new Date(t.completedFrom).toISOString().slice(0, 10),
        dueTo: new Date(t.completedTo).toISOString().slice(0, 10),
      })),
    }
  }

  if (name === "list_tasks_by_date") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    if (typeof args.from !== "string") return { error: "from required" }
    const fromTs = startOfDay(Date.parse(args.from))
    if (!Number.isFinite(fromTs)) return { error: "invalid from date" }
    const toTs =
      typeof args.to === "string"
        ? endOfDay(Date.parse(args.to))
        : endOfDay(fromTs)
    if (!Number.isFinite(toTs)) return { error: "invalid to date" }
    const includeDone = args.includeDone === true
    const matches = file.todos
      .filter((t) => {
        if (!includeDone && t.done) return false
        return t.completedFrom <= toTs && t.completedTo >= fromTs
      })
      .sort((a, b) => a.completedFrom - b.completedFrom)
    return {
      count: matches.length,
      tasks: matches.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        progress: t.progress,
        groupId: t.groupId,
        assignees: t.assignees,
        done: t.done,
        dueFrom: new Date(t.completedFrom).toISOString().slice(0, 10),
        dueTo: new Date(t.completedTo).toISOString().slice(0, 10),
      })),
    }
  }

  if (name === "get_task") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const t = file.todos.find((x) => x.id === id)
    if (!t) return { error: "task not found" }
    return {
      id: t.id,
      title: t.title,
      thought: t.thought,
      priority: t.priority,
      progress: t.progress,
      groupId: t.groupId,
      assignees: t.assignees,
      done: t.done,
      doneAt: t.doneAt,
      createdAt: t.createdAt,
      dueFrom: new Date(t.completedFrom).toISOString().slice(0, 10),
      dueTo: new Date(t.completedTo).toISOString().slice(0, 10),
    }
  }

  if (name === "update_todos") {
    const ids = Array.isArray(args.ids)
      ? (args.ids as unknown[]).filter((x): x is string => typeof x === "string")
      : []
    if (ids.length === 0) return { error: "ids required" }
    const patch = (args.patch as Record<string, unknown>) ?? {}
    const base: Parameters<typeof updateTodo>[0] = { id: "" }
    if (typeof patch.priority === "string")
      base.priority = patch.priority === "" ? null : patch.priority
    if (typeof patch.progress === "string")
      base.progress = patch.progress === "" ? null : patch.progress
    if (typeof patch.groupId === "string")
      base.groupId = patch.groupId === "" ? null : patch.groupId
    if (Array.isArray(patch.assigneeIds))
      base.assignees = (patch.assigneeIds as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    if (typeof patch.dueFrom === "string") {
      const ts = Date.parse(patch.dueFrom)
      if (Number.isFinite(ts)) base.completedFrom = startOfDay(ts)
    }
    if (typeof patch.dueTo === "string") {
      const ts = Date.parse(patch.dueTo)
      if (Number.isFinite(ts)) base.completedTo = endOfDay(ts)
    }
    if (typeof patch.done === "boolean") base.done = patch.done
    for (const id of ids) store.dispatch(updateTodo({ ...base, id }))
    return { updated: ids.length, ids }
  }

  if (name === "move_todos") {
    const ids = Array.isArray(args.ids)
      ? (args.ids as unknown[]).filter((x): x is string => typeof x === "string")
      : []
    if (ids.length === 0) return { error: "ids required" }
    if (typeof args.groupId !== "string") return { error: "groupId required" }
    const groupId = args.groupId === "" ? null : args.groupId
    for (const id of ids) store.dispatch(updateTodo({ id, groupId }))
    return { moved: ids.length, ids, groupId }
  }

  if (name === "bulk_add_todos") {
    const items = Array.isArray(args.todos) ? args.todos : []
    if (items.length === 0) return { error: "todos array required" }
    const created: { id: string; title: string }[] = []
    for (const raw of items) {
      const item = (raw ?? {}) as Record<string, unknown>
      const title = typeof item.title === "string" ? item.title.trim() : ""
      if (!title) continue
      const groupId =
        typeof item.groupId === "string" && item.groupId ? item.groupId : null
      const action = addTodo(title, groupId)
      store.dispatch(action)
      const id = action.payload.id
      const now = Date.now()
      const fromTs = parseDate(item.dueFrom, now)
      const toTs = parseDate(item.dueTo, fromTs)
      const assigneeIds = Array.isArray(item.assigneeIds)
        ? (item.assigneeIds as unknown[]).filter(
            (x): x is string => typeof x === "string",
          )
        : []
      const priority =
        typeof item.priority === "string" ? item.priority : null
      const progress =
        typeof item.progress === "string" && item.progress ? item.progress : null
      const thought =
        typeof item.thought === "string" ? item.thought.trim() : ""
      store.dispatch(
        updateTodo({
          id,
          priority,
          assignees: assigneeIds,
          completedFrom: startOfDay(fromTs),
          completedTo: endOfDay(toTs),
          ...(progress ? { progress } : {}),
          ...(thought ? { thought } : {}),
        }),
      )
      created.push({ id, title })
    }
    return { created: created.length, tasks: created }
  }

  if (name === "undo_last_action") {
    if (!canUndo()) return { undone: false, reason: "nothing to undo" }
    store.dispatch(undoAction())
    return { undone: true }
  }

  if (name === "find_free_slots") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    if (typeof args.from !== "string" || typeof args.to !== "string")
      return { error: "from and to required" }
    const fromTs = startOfDay(Date.parse(args.from))
    const toTs = startOfDay(Date.parse(args.to))
    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs))
      return { error: "invalid date" }
    const capacity =
      typeof args.capacity === "number" && args.capacity > 0 ? args.capacity : 3
    const limit =
      typeof args.limit === "number" && args.limit > 0 ? args.limit : 14
    const DAY = 86400000
    const days: { date: string; load: number }[] = []
    for (let ts = fromTs; ts <= toTs; ts += DAY) {
      const dayStart = ts
      const dayEnd = endOfDay(ts)
      let load = 0
      for (const t of file.todos) {
        if (t.done) continue
        if (t.completedFrom <= dayEnd && t.completedTo >= dayStart) load++
      }
      if (load < capacity) {
        days.push({
          date: new Date(ts).toISOString().slice(0, 10),
          load,
        })
      }
    }
    days.sort((a, b) => a.load - b.load)
    return { capacity, slots: days.slice(0, limit) }
  }

  if (name === "reschedule_overdue") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const targetTs =
      typeof args.toDate === "string"
        ? Date.parse(args.toDate)
        : Date.now()
    if (!Number.isFinite(targetTs)) return { error: "invalid toDate" }
    const todayStart = startOfDay(Date.now())
    const newFrom = startOfDay(targetTs)
    const newTo = endOfDay(targetTs)
    const overdue = file.todos.filter(
      (t) => !t.done && t.completedTo < todayStart,
    )
    for (const t of overdue) {
      store.dispatch(
        updateTodo({ id: t.id, completedFrom: newFrom, completedTo: newTo }),
      )
    }
    return {
      rescheduled: overdue.length,
      ids: overdue.map((t) => t.id),
      to: new Date(newFrom).toISOString().slice(0, 10),
    }
  }

  if (name === "duplicate_todo") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const src = file.todos.find((x) => x.id === id)
    if (!src) return { error: "source task not found" }
    const title =
      typeof args.title === "string" && args.title.trim()
        ? args.title.trim()
        : `${src.title} (copy)`
    const groupId =
      typeof args.groupId === "string"
        ? args.groupId === ""
          ? null
          : args.groupId
        : src.groupId
    const action = addTodo(title, groupId)
    store.dispatch(action)
    const newId = action.payload.id
    const fromTs =
      typeof args.dueFrom === "string"
        ? parseDate(args.dueFrom, src.completedFrom)
        : src.completedFrom
    const toTs =
      typeof args.dueTo === "string"
        ? parseDate(args.dueTo, src.completedTo)
        : src.completedTo
    store.dispatch(
      updateTodo({
        id: newId,
        priority: src.priority,
        progress: src.progress,
        assignees: [...src.assignees],
        completedFrom: startOfDay(fromTs),
        completedTo: endOfDay(toTs),
        thought: src.thought,
      }),
    )
    return { id: newId, title, sourceId: id }
  }

  if (name === "get_capabilities") {
    return {
      count: AI_TOOLS.length,
      tools: AI_TOOLS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
      })),
    }
  }

  if (name === "get_app_features") {
    return {
      features: [
        {
          name: "Multi-file workspaces",
          summary:
            "Several independent planner files; switch between them from the sidebar. Each file has its own groups and tasks.",
        },
        {
          name: "Board (Kanban)",
          summary:
            "Board tab renders tasks as cards in columns grouped by progress state. Drag a card to another column to update its progress. Add/rename/delete columns (custom progress states) and add/edit/delete cards inline; all edits reflect in the Todo table and vice-versa.",
        },
        {
          name: "Groups (sections)",
          summary:
            "Tasks can be organised into groups inside a file. Drag-and-drop reorder within and across groups.",
        },
        {
          name: "Tasks with thoughts",
          summary:
            "Every task has a title plus a 'thought' field for the reasoning / how-to-start / what-to-watch-for.",
        },
        {
          name: "Priorities",
          summary:
            "Configurable priority labels (defaults editable in Settings). Sort and filter the table by priority.",
        },
        {
          name: "Assignees",
          summary:
            "Maintain a separate people table (name + agenda). Assign multiple people to a task.",
        },
        {
          name: "Date ranges",
          summary:
            "Tasks have a start/end work window (single-day or multi-day). Range cell editor in the table.",
        },
        {
          name: "Filtering & sorting",
          summary:
            "Global text search, per-column sort, group filter and priority filter persist across reloads.",
        },
        {
          name: "Undo / redo",
          summary:
            "Up to 100 steps of history for any todo/group/file/user mutation.",
        },
        {
          name: "Google Drive sync",
          summary:
            "Optional auto-sync of all planner data to a Drive folder; toggle in Settings.",
        },
        {
          name: "Theming",
          summary:
            "Dark mode, custom accent color, custom fonts and font sizes.",
        },
        {
          name: "Focus mode",
          summary:
            "Hides chrome to leave only the task table on screen.",
        },
        {
          name: "AI planning assistant",
          summary:
            "Chat panel that can create/edit/delete files, groups, users, tasks. Multiple providers (Gemini, HuggingFace, local Ollama).",
        },
      ],
    }
  }

  if (name === "get_tasks") {
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const includeDone = args.includeDone === undefined ? true : args.includeDone === true
    const tasks = file.todos
      .filter((t) => includeDone || !t.done)
      .map((t) => ({
        id: t.id,
        title: t.title,
        thought: t.thought,
        priority: t.priority,
        progress: t.progress,
        groupId: t.groupId,
        assignees: t.assignees,
        done: t.done,
        dueFrom: new Date(t.completedFrom).toISOString().slice(0, 10),
        dueTo: new Date(t.completedTo).toISOString().slice(0, 10),
      }))
    return {
      fileId: file.id,
      fileName: file.name,
      count: tasks.length,
      tasks,
    }
  }

  if (name === "duplicate_group") {
    const id = typeof args.id === "string" ? args.id : ""
    if (!id) return { error: "id required" }
    const state = store.getState()
    const file = state.todos.files.find(
      (f) => f.id === state.todos.activeFileId,
    )
    if (!file) return { error: "No active file" }
    const src = file.groups.find((g) => g.id === id)
    if (!src) return { error: "source group not found" }
    const newName =
      typeof args.name === "string" && args.name.trim()
        ? args.name.trim()
        : `${src.name} (copy)`
    const includeTodos = args.includeTodos !== false
    const groupAction = createGroup(newName)
    store.dispatch(groupAction)
    const newGroupId = groupAction.payload.id
    const copiedIds: string[] = []
    if (includeTodos) {
      const srcTodos = file.todos.filter((t) => t.groupId === id)
      for (const t of srcTodos) {
        const a = addTodo(t.title, newGroupId)
        store.dispatch(a)
        const newId = a.payload.id
        store.dispatch(
          updateTodo({
            id: newId,
            priority: t.priority,
            progress: t.progress,
            assignees: [...t.assignees],
            completedFrom: t.completedFrom,
            completedTo: t.completedTo,
            thought: t.thought,
          }),
        )
        copiedIds.push(newId)
      }
    }
    return {
      id: newGroupId,
      name: newName,
      sourceId: id,
      copiedTodoIds: copiedIds,
    }
  }

  return { error: `Unknown tool: ${name}` }
}
