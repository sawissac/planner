import localforage from "localforage";

import {
  DEFAULT_PRIORITY_OPTIONS,
  DEFAULT_PROGRESS_OPTIONS,
  FONT_SIZES,
  FONT_WEIGHTS,
  FONTS,
  replaceSettings,
  type SettingsState,
} from "@/stores/slices/settingsSlice";
import { replaceState, type Todo, type TodoFile, type TodosState } from "@/stores/slices/todoSlice";
import { type UsersState } from "@/stores/slices/userSlice";
import type { AppStore } from "@/stores/store";

const STORE_NAME = "planner";
const TODOS_KEY = "todos";
const SETTINGS_KEY = "settings";
const USERS_KEY = "users";

let store: LocalForage | null = null;

function getStore(): LocalForage {
  if (!store) {
    store = localforage.createInstance({
      name: STORE_NAME,
      storeName: "kv",
    });
  }
  return store;
}

function isTodoLike(v: unknown): v is {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  doneAt?: number | null;
  completedFrom?: number;
  completedTo?: number;
  priority?: string | null;
  progress?: string | null;
  assignees?: unknown[];
  groupId?: string | null;
  thought?: unknown;
} {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.done === "boolean" &&
    typeof o.createdAt === "number"
  );
}

function migrateTodo(v: unknown): Todo | null {
  if (!isTodoLike(v)) {
    return null;
  }
  const o = v;
  const d = new Date(o.createdAt);
  const sod = new Date(d);
  sod.setHours(0, 0, 0, 0);
  const eod = new Date(d);
  eod.setHours(23, 59, 59, 999);
  return {
    id: o.id,
    title: o.title,
    done: o.done,
    createdAt: o.createdAt,
    doneAt: typeof o.doneAt === "number" ? o.doneAt : null,
    groupId: typeof o.groupId === "string" ? o.groupId : null,
    completedFrom: typeof o.completedFrom === "number" ? o.completedFrom : sod.getTime(),
    completedTo: typeof o.completedTo === "number" ? o.completedTo : eod.getTime(),
    priority: typeof o.priority === "string" || o.priority === null ? o.priority : null,
    progress: typeof o.progress === "string" ? o.progress : o.done ? "Done" : "Not Started",
    assignees: Array.isArray(o.assignees)
      ? (o.assignees as string[]).filter((x) => typeof x === "string")
      : [],
    thought: typeof o.thought === "string" ? o.thought : "",
  };
}

export function isTodoFile(v: unknown): v is TodoFile {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    Array.isArray(o.todos) &&
    o.todos.every(isTodoLike)
  );
}

function isGroupLike(v: unknown): v is { id: string; name: string } {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string";
}

function migrateFile(f: TodoFile): TodoFile {
  return {
    ...f,
    groups: Array.isArray((f as unknown as Record<string, unknown>).groups)
      ? ((f as unknown as Record<string, unknown>).groups as unknown[])
          .filter(isGroupLike)
          .map((g) => ({ id: g.id, name: g.name }))
      : [],
    todos: f.todos.map((t) => migrateTodo(t)).filter((t): t is Todo => t !== null),
  };
}

function isTodosState(v: unknown): v is TodosState {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.files) &&
    o.files.every(isTodoFile) &&
    (o.activeFileId === null || typeof o.activeFileId === "string")
  );
}

function isSettingsLike(
  v: unknown,
): v is Partial<SettingsState> &
  Pick<
    SettingsState,
    "tableFont" | "titleFontSize" | "titleFontWeight" | "sidebarWidth" | "columnSizing"
  > {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.tableFont === "string" &&
    (FONTS as readonly string[]).includes(o.tableFont) &&
    typeof o.titleFontSize === "number" &&
    (FONT_SIZES as readonly number[]).includes(o.titleFontSize) &&
    typeof o.titleFontWeight === "number" &&
    (FONT_WEIGHTS as readonly number[]).includes(o.titleFontWeight) &&
    typeof o.sidebarWidth === "number" &&
    typeof o.columnSizing === "object" &&
    o.columnSizing !== null
  );
}

function migrateSettings(v: Partial<SettingsState>): SettingsState {
  return {
    tableFont: v.tableFont!,
    titleFontSize: v.titleFontSize!,
    titleFontWeight: v.titleFontWeight!,
    sidebarWidth: v.sidebarWidth!,
    sidebarOpen: typeof v.sidebarOpen === "boolean" ? v.sidebarOpen : true,
    cloudAutoSync:
      typeof v.cloudAutoSync === "boolean"
        ? v.cloudAutoSync
        : typeof (v as { driveAutoSync?: unknown }).driveAutoSync === "boolean"
          ? (v as { driveAutoSync?: boolean }).driveAutoSync!
          : true,
    columnSizing: v.columnSizing!,
    userColumnSizing:
      typeof v.userColumnSizing === "object" && v.userColumnSizing !== null
        ? v.userColumnSizing
        : {},
    priorityOptions:
      Array.isArray(v.priorityOptions) && v.priorityOptions.every((p) => typeof p === "string")
        ? v.priorityOptions
        : [...DEFAULT_PRIORITY_OPTIONS],
    progressOptions:
      Array.isArray(v.progressOptions) && v.progressOptions.every((p) => typeof p === "string")
        ? v.progressOptions
        : [...DEFAULT_PROGRESS_OPTIONS],
    focusMode: typeof v.focusMode === "boolean" ? v.focusMode : false,
    darkMode: typeof v.darkMode === "boolean" ? v.darkMode : false,
    pageSize: typeof v.pageSize === "number" ? v.pageSize : 30,
    sorting:
      Array.isArray(v.sorting) &&
      v.sorting.every(
        (s) =>
          s &&
          typeof s === "object" &&
          typeof (s as { id?: unknown }).id === "string" &&
          typeof (s as { desc?: unknown }).desc === "boolean",
      )
        ? v.sorting
        : [],
    globalFilter: typeof v.globalFilter === "string" ? v.globalFilter : "",
    groupFilter: typeof v.groupFilter === "string" || v.groupFilter === null ? v.groupFilter : null,
    priorityFilter:
      typeof v.priorityFilter === "string" || v.priorityFilter === null ? v.priorityFilter : null,
    progressFilter:
      typeof v.progressFilter === "string" || v.progressFilter === null ? v.progressFilter : null,
    accentColor:
      typeof v.accentColor === "string" || v.accentColor === null ? (v.accentColor ?? null) : null,
    activeTab: typeof v.activeTab === "string" ? v.activeTab : "todo",
    boardCompact: typeof v.boardCompact === "boolean" ? v.boardCompact : false,
  };
}

export async function loadTodos(): Promise<TodosState | null> {
  const data = await getStore().getItem<unknown>(TODOS_KEY);
  if (isTodosState(data)) {
    return { ...data, files: data.files.map(migrateFile) };
  }
  if (Array.isArray(data) && data.every(isTodoLike)) {
    const todos = data.map((t) => migrateTodo(t)).filter((t): t is Todo => t !== null);
    return {
      files: [{ id: "default", name: "Default", groups: [], todos }],
      activeFileId: "default",
    };
  }
  return null;
}

export async function saveTodos(state: TodosState): Promise<void> {
  await getStore().setItem(TODOS_KEY, state);
}

export async function loadSettings(): Promise<SettingsState | null> {
  const data = await getStore().getItem<unknown>(SETTINGS_KEY);
  return isSettingsLike(data) ? migrateSettings(data) : null;
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await getStore().setItem(SETTINGS_KEY, settings);
}

function isUsersState(v: unknown): v is UsersState {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.users) &&
    o.users.every(
      (u: unknown) =>
        u &&
        typeof u === "object" &&
        typeof (u as Record<string, unknown>).id === "string" &&
        typeof (u as Record<string, unknown>).name === "string" &&
        typeof (u as Record<string, unknown>).agenda === "string",
    )
  );
}

export async function loadUsers(): Promise<UsersState | null> {
  const data = await getStore().getItem<unknown>(USERS_KEY);
  return isUsersState(data) ? data : null;
}

export async function saveUsers(state: UsersState): Promise<void> {
  await getStore().setItem(USERS_KEY, state);
}

export async function hydrate(appStore: AppStore): Promise<void> {
  const [todos, settings, users] = await Promise.all([loadTodos(), loadSettings(), loadUsers()]);
  if (todos) {
    appStore.dispatch(replaceState(todos));
  }
  if (settings) {
    appStore.dispatch(replaceSettings(settings));
  }
  if (users) {
    const { replaceUsers } = await import("@/stores/slices/userSlice");
    appStore.dispatch(replaceUsers(users));
  }
}

export function subscribePersist(appStore: AppStore, delayMs = 300): () => void {
  let todosTimer: ReturnType<typeof setTimeout> | null = null;
  let settingsTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTodos: TodosState | null = null;
  let lastSettings: SettingsState | null = null;

  let lastUsers: UsersState | null = null;
  let usersTimer: ReturnType<typeof setTimeout> | null = null;

  return appStore.subscribe(() => {
    const state = appStore.getState();
    if (state.todos !== lastTodos) {
      lastTodos = state.todos;
      if (todosTimer) {
        clearTimeout(todosTimer);
      }
      todosTimer = setTimeout(() => {
        void saveTodos(state.todos);
      }, delayMs);
    }
    if (state.users !== lastUsers) {
      lastUsers = state.users;
      if (usersTimer) {
        clearTimeout(usersTimer);
      }
      usersTimer = setTimeout(() => {
        void saveUsers(state.users);
      }, delayMs);
    }
    if (state.settings !== lastSettings) {
      lastSettings = state.settings;
      if (settingsTimer) {
        clearTimeout(settingsTimer);
      }
      settingsTimer = setTimeout(() => {
        void saveSettings(state.settings);
      }, delayMs);
    }
  });
}
