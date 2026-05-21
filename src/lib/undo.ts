import type { Middleware } from "@reduxjs/toolkit";

import { replaceState } from "@/stores/slices/todoSlice";
import { replaceUsers } from "@/stores/slices/userSlice";
import type { RootState } from "@/stores/store";

type Snapshot = {
  todos: RootState["todos"];
  users: RootState["users"];
};

const HISTORY_TYPES = new Set<string>([
  "todos/createFile",
  "todos/renameFile",
  "todos/setFileIcon",
  "todos/deleteFile",
  "todos/importFiles",
  "todos/createGroup",
  "todos/renameGroup",
  "todos/deleteGroup",
  "todos/addTodo",
  "todos/updateTodo",
  "todos/toggleTodo",
  "todos/deleteTodo",
  "todos/reorder",
  "todos/reorderGroup",
  "todos/clearAll",
  "users/addUser",
  "users/updateUser",
  "users/deleteUser",
  "users/reorderUser",
]);

const undoStack: Snapshot[] = [];
const redoStack: Snapshot[] = [];
const MAX_HISTORY = 100;
let suppressed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) {
    fn();
  }
}

export function subscribeUndo(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}
export function canRedo(): boolean {
  return redoStack.length > 0;
}

function snapshot(state: RootState): Snapshot {
  return {
    todos: JSON.parse(JSON.stringify(state.todos)),
    users: JSON.parse(JSON.stringify(state.users)),
  };
}

export const UNDO_PERFORM = "undo/perform";
export const REDO_PERFORM = "undo/redo";

export const undoMiddleware: Middleware = (store) => (next) => (action) => {
  const a = action as { type: string };
  if (a.type === UNDO_PERFORM) {
    const prev = undoStack.pop();
    if (!prev) {
      return;
    }
    redoStack.push(snapshot(store.getState() as RootState));
    suppressed = true;
    try {
      store.dispatch(replaceState(prev.todos));
      store.dispatch(replaceUsers(prev.users));
    } finally {
      suppressed = false;
    }
    notify();
    return;
  }
  if (a.type === REDO_PERFORM) {
    const next2 = redoStack.pop();
    if (!next2) {
      return;
    }
    undoStack.push(snapshot(store.getState() as RootState));
    suppressed = true;
    try {
      store.dispatch(replaceState(next2.todos));
      store.dispatch(replaceUsers(next2.users));
    } finally {
      suppressed = false;
    }
    notify();
    return;
  }
  if (!suppressed && HISTORY_TYPES.has(a.type)) {
    undoStack.push(snapshot(store.getState() as RootState));
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    if (redoStack.length > 0) {
      redoStack.length = 0;
    }
    notify();
  }
  return next(action);
};

export const undoAction = () => ({ type: UNDO_PERFORM });
export const redoAction = () => ({ type: REDO_PERFORM });
