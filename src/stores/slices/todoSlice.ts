import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type Group = {
  id: string;
  name: string;
};

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  doneAt: number | null;
  completedFrom: number;
  completedTo: number;
  priority: string | null;
  progress: string | null;
  assignees: string[];
  groupId: string | null;
  thought: string;
};

export const PROGRESS_DONE = "Done";
export const PROGRESS_NOT_STARTED = "Not Started";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export type TodoFile = {
  id: string;
  name: string;
  icon?: string;
  groups: Group[];
  todos: Todo[];
};

export type TodosState = {
  files: TodoFile[];
  activeFileId: string | null;
};

const DEFAULT_FILE_ID = "default";

const initialState: TodosState = {
  files: [{ id: DEFAULT_FILE_ID, name: "Default", groups: [], todos: [] }],
  activeFileId: DEFAULT_FILE_ID,
};

function getActive(state: TodosState): TodoFile | undefined {
  return state.files.find((f) => f.id === state.activeFileId);
}

const todoSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    createFile: {
      prepare(name: string) {
        return { payload: { id: nanoid(), name } };
      },
      reducer(state, action: PayloadAction<{ id: string; name: string }>) {
        state.files.push({
          id: action.payload.id,
          name: action.payload.name,
          groups: [],
          todos: [],
        });
        state.activeFileId = action.payload.id;
      },
    },
    renameFile(state, action: PayloadAction<{ id: string; name: string }>) {
      const f = state.files.find((x) => x.id === action.payload.id);
      if (f) {
        f.name = action.payload.name;
      }
    },
    setFileIcon(state, action: PayloadAction<{ id: string; icon: string }>) {
      const f = state.files.find((x) => x.id === action.payload.id);
      if (f) {
        f.icon = action.payload.icon;
      }
    },
    deleteFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
      if (state.activeFileId === action.payload) {
        state.activeFileId = state.files[0]?.id ?? null;
      }
    },
    setActiveFile(state, action: PayloadAction<string>) {
      if (state.files.some((f) => f.id === action.payload)) {
        state.activeFileId = action.payload;
      }
    },
    importFiles(state, action: PayloadAction<TodoFile[]>) {
      for (const f of action.payload) {
        state.files.push(f);
      }
      if (action.payload.length > 0) {
        state.activeFileId = action.payload[action.payload.length - 1].id;
      }
    },
    createGroup: {
      prepare(name: string) {
        return { payload: { id: nanoid(), name } };
      },
      reducer(state, action: PayloadAction<Group>) {
        const f = getActive(state);
        if (f) {
          f.groups.push(action.payload);
        }
      },
    },
    renameGroup(state, action: PayloadAction<{ id: string; name: string }>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      const g = f.groups.find((x) => x.id === action.payload.id);
      if (g) {
        g.name = action.payload.name;
      }
    },
    deleteGroup(state, action: PayloadAction<string>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      f.groups = f.groups.filter((g) => g.id !== action.payload);
      for (const t of f.todos) {
        if (t.groupId === action.payload) {
          t.groupId = null;
        }
      }
    },
    addTodo: {
      prepare(title: string, groupId: string | null = null) {
        const now = Date.now();
        return {
          payload: {
            id: nanoid(),
            title,
            done: false,
            createdAt: now,
            doneAt: null,
            completedFrom: startOfDay(now),
            completedTo: endOfDay(now),
            priority: null,
            progress: PROGRESS_NOT_STARTED,
            assignees: [],
            groupId,
            thought: "",
          } satisfies Todo,
        };
      },
      reducer(state, action: PayloadAction<Todo>) {
        const f = getActive(state);
        if (!f) {
          return;
        }
        if (action.payload.groupId) {
          const idx = f.todos.findIndex((t) => t.groupId === action.payload.groupId);
          if (idx !== -1) {
            f.todos.splice(idx, 0, action.payload);
            return;
          }
        }
        f.todos.unshift(action.payload);
      },
    },
    updateTodo(
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        done?: boolean;
        createdAt?: number;
        doneAt?: number | null;
        completedFrom?: number;
        completedTo?: number;
        priority?: string | null;
        progress?: string | null;
        assignees?: string[];
        groupId?: string | null;
        thought?: string;
      }>,
    ) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      const t = f.todos.find((i) => i.id === action.payload.id);
      if (!t) {
        return;
      }
      if (action.payload.title !== undefined) {
        t.title = action.payload.title;
      }
      if (action.payload.done !== undefined) {
        t.done = action.payload.done;
        if (!action.payload.done) {
          t.doneAt = null;
          if (t.progress === PROGRESS_DONE) {
            t.progress = PROGRESS_NOT_STARTED;
          }
        } else {
          if (t.doneAt === null) {
            t.doneAt = Date.now();
          }
          t.progress = PROGRESS_DONE;
        }
      }
      if (action.payload.assignees !== undefined) {
        t.assignees = action.payload.assignees;
      }
      if (action.payload.createdAt !== undefined) {
        t.createdAt = action.payload.createdAt;
      }
      if (action.payload.doneAt !== undefined) {
        t.doneAt = action.payload.doneAt;
      }
      if (action.payload.completedFrom !== undefined) {
        t.completedFrom = action.payload.completedFrom;
      }
      if (action.payload.completedTo !== undefined) {
        t.completedTo = action.payload.completedTo;
      }
      if (action.payload.priority !== undefined) {
        t.priority = action.payload.priority;
      }
      if (action.payload.progress !== undefined) {
        t.progress = action.payload.progress;
        if (action.payload.progress === PROGRESS_DONE) {
          t.done = true;
          if (t.doneAt === null) {
            t.doneAt = Date.now();
          }
        } else if (action.payload.progress !== null) {
          t.done = false;
          t.doneAt = null;
        }
      }
      if (action.payload.groupId !== undefined) {
        t.groupId = action.payload.groupId;
      }
      if (action.payload.thought !== undefined) {
        t.thought = action.payload.thought;
      }
    },
    toggleTodo(state, action: PayloadAction<string>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      const t = f.todos.find((i) => i.id === action.payload);
      if (t) {
        t.done = !t.done;
        t.doneAt = t.done ? Date.now() : null;
        t.progress = t.done ? PROGRESS_DONE : PROGRESS_NOT_STARTED;
      }
    },
    renamePriorityValue(state, action: PayloadAction<{ from: string; to: string }>) {
      const { from, to } = action.payload;
      for (const f of state.files) {
        for (const t of f.todos) {
          if (t.priority === from) {
            t.priority = to;
          }
        }
      }
    },
    renameProgressValue(state, action: PayloadAction<{ from: string; to: string }>) {
      const { from, to } = action.payload;
      for (const f of state.files) {
        for (const t of f.todos) {
          if (t.progress === from) {
            t.progress = to;
          }
        }
      }
    },
    deleteTodo(state, action: PayloadAction<string>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      f.todos = f.todos.filter((i) => i.id !== action.payload);
    },
    reorderFile(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const { fromId, toId } = action.payload;
      if (fromId === toId) {
        return;
      }
      const from = state.files.findIndex((f) => f.id === fromId);
      const to = state.files.findIndex((f) => f.id === toId);
      if (from === -1 || to === -1) {
        return;
      }
      const [moved] = state.files.splice(from, 1);
      state.files.splice(to, 0, moved);
    },
    reorder(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      const { fromId, toId } = action.payload;
      if (fromId === toId) {
        return;
      }
      const from = f.todos.findIndex((i) => i.id === fromId);
      const to = f.todos.findIndex((i) => i.id === toId);
      if (from === -1 || to === -1) {
        return;
      }
      const [moved] = f.todos.splice(from, 1);
      // Drag across groups: adopt target's groupId.
      const target = f.todos[to > from ? to - 1 : to];
      if (target && target.groupId !== moved.groupId) {
        moved.groupId = target.groupId;
      }
      f.todos.splice(to, 0, moved);
    },
    reorderGroup(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const f = getActive(state);
      if (!f) {
        return;
      }
      const { fromId, toId } = action.payload;
      if (fromId === toId) {
        return;
      }
      const from = f.groups.findIndex((g) => g.id === fromId);
      const to = f.groups.findIndex((g) => g.id === toId);
      if (from === -1 || to === -1) {
        return;
      }
      const [moved] = f.groups.splice(from, 1);
      f.groups.splice(to, 0, moved);
    },
    clearAll(state) {
      const f = getActive(state);
      if (f) {
        f.todos = [];
      }
    },
    replaceState(state, action: PayloadAction<TodosState>) {
      state.files = action.payload.files;
      state.activeFileId = action.payload.activeFileId;
    },
  },
});

export const {
  createFile,
  renameFile,
  setFileIcon,
  deleteFile,
  setActiveFile,
  importFiles,
  createGroup,
  renameGroup,
  deleteGroup,
  addTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  reorder,
  reorderGroup,
  reorderFile,
  clearAll,
  replaceState,
  renamePriorityValue,
  renameProgressValue,
} = todoSlice.actions;

export default todoSlice.reducer;
