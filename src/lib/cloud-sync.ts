"use client";

import { mergeTodosState, same } from "@/lib/cloud-merge";
import { replaceSettings } from "@/stores/slices/settingsSlice";
import { replaceState, type TodosState } from "@/stores/slices/todoSlice";
import { replaceUsers } from "@/stores/slices/userSlice";
import type { AppStore } from "@/stores/store";

import {
  fetchRemote,
  isSignedIn,
  onAuthChange,
  pushRemote,
  type RemotePayload,
} from "./cloud-sync-backend";

const DEVICE_KEY = "planner:cloud:device";
const LAST_PULL_KEY = "planner:cloud:lastPull";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type SyncStatus =
  | { kind: "idle" }
  | { kind: "pulling" }
  | { kind: "pushing" }
  | { kind: "error"; message: string }
  | { kind: "ok"; at: number };

type Listener = (s: SyncStatus) => void;
let status: SyncStatus = { kind: "idle" };
const statusListeners = new Set<Listener>();

function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getStatus(): SyncStatus {
  return status;
}

export function onStatus(fn: Listener): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

/**
 * The task tree as of the last pull or push: what this device and the server
 * last agreed on. Merges use it to tell local edits from server-side ones
 * (third-party writes through `/api/plan/**`). In memory only — a fresh load
 * re-seeds it from its first pull.
 */
let base: TodosState | null = null;

/** Serialize sync work so a push and a refresh never interleave their merges. */
let queue: Promise<void> = Promise.resolve();
function exclusive(fn: () => Promise<void>): Promise<void> {
  queue = queue.then(fn, fn);
  return queue;
}

/** Fold server-side changes into the store. Returns the merged task tree. */
function mergeRemote(appStore: AppStore, remote: RemotePayload): TodosState {
  const local = appStore.getState().todos;
  if (!base || !remote.todos || typeof remote.todos !== "object") {
    return local;
  }
  const merged = mergeTodosState(base, local, remote.todos as TodosState);
  if (!same(merged, local)) {
    appStore.dispatch(replaceState(merged));
  }
  return merged;
}

function applyRemote(appStore: AppStore, payload: RemotePayload) {
  if (payload.todos && typeof payload.todos === "object") {
    appStore.dispatch(replaceState(payload.todos as never));
  }
  if (payload.settings && typeof payload.settings === "object") {
    appStore.dispatch(replaceSettings(payload.settings as never));
  }
  if (payload.users && typeof payload.users === "object") {
    appStore.dispatch(replaceUsers(payload.users as never));
  }
}

export function pullOnce(appStore: AppStore): Promise<void> {
  return exclusive(async () => {
    if (!isSignedIn()) {
      return;
    }
    setStatus({ kind: "pulling" });
    try {
      const remote = await fetchRemote();
      if (remote) {
        if (base) {
          // Already synced this session: local edits not pushed yet (the
          // push is debounced, or auto-sync is off) must survive, so merge
          // tasks instead of replacing. Settings and members are only edited
          // here, so the local copies stand and go up with the next push.
          mergeRemote(appStore, remote);
          localStorage.setItem(LAST_PULL_KEY, String(remote.updatedAt));
        } else {
          const localUpdated = Number(localStorage.getItem(LAST_PULL_KEY) ?? 0);
          if (remote.updatedAt > localUpdated) {
            applyRemote(appStore, remote);
            localStorage.setItem(LAST_PULL_KEY, String(remote.updatedAt));
          }
        }
        base = remote.todos as TodosState;
      }
      setStatus({ kind: "ok", at: Date.now() });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "pull failed" });
    }
  });
}

/**
 * Merge in server-side changes without pushing (window focus). The merged
 * state, if it differs, schedules the usual debounced push.
 */
export function refreshFromRemote(appStore: AppStore): Promise<void> {
  return exclusive(async () => {
    if (!isSignedIn() || !base) {
      return;
    }
    try {
      const remote = await fetchRemote();
      if (remote) {
        mergeRemote(appStore, remote);
        base = remote.todos as TodosState;
        localStorage.setItem(LAST_PULL_KEY, String(remote.updatedAt));
      }
    } catch {
      // Background refresh: the next push retries and reports errors.
    }
  });
}

export function pushNow(appStore: AppStore): Promise<void> {
  return exclusive(async () => {
    if (!isSignedIn()) {
      return;
    }
    setStatus({ kind: "pushing" });
    try {
      // Pull first so a push never erases what the Plan API wrote meanwhile.
      const remote = await fetchRemote();
      const todos = remote ? mergeRemote(appStore, remote) : appStore.getState().todos;
      const state = appStore.getState();
      const now = Date.now();
      const payload: RemotePayload = {
        version: 1,
        updatedAt: now,
        deviceId: getDeviceId(),
        todos,
        settings: state.settings,
        users: state.users,
      };
      await pushRemote(payload);
      base = todos;
      localStorage.setItem(LAST_PULL_KEY, String(now));
      setStatus({ kind: "ok", at: now });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "push failed" });
    }
  });
}

/**
 * Pull then push — the Sync button, and "Copy context" before it copies, so
 * the Plan API serves what is on screen. Resolves `false` if a step failed
 * (the status listeners already got the error).
 */
export async function syncNow(appStore: AppStore): Promise<boolean> {
  await pullOnce(appStore);
  await pushNow(appStore);
  return getStatus().kind !== "error";
}

/**
 * Pull only — the Refresh button on a thought and its comments, to pick up
 * what the Plan API wrote. Unpushed local edits survive (see `pullOnce`).
 * Resolves `false` if the pull failed.
 */
export async function refreshNow(appStore: AppStore): Promise<boolean> {
  await pullOnce(appStore);
  return getStatus().kind !== "error";
}

export function subscribeCloudSync(appStore: AppStore, delayMs = 3000): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTodos = appStore.getState().todos;
  let lastSettings = appStore.getState().settings;
  let lastUsers = appStore.getState().users;

  const schedule = () => {
    if (!isSignedIn()) {
      return;
    }
    if (!appStore.getState().settings.cloudAutoSync) {
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void pushNow(appStore);
    }, delayMs);
  };

  const unsubStore = appStore.subscribe(() => {
    const s = appStore.getState();
    if (s.todos !== lastTodos || s.settings !== lastSettings || s.users !== lastUsers) {
      lastTodos = s.todos;
      lastSettings = s.settings;
      lastUsers = s.users;
      schedule();
    }
  });

  const unsubAuth = onAuthChange((signedIn) => {
    if (signedIn) {
      void pullOnce(appStore);
    }
  });

  if (isSignedIn()) {
    void pullOnce(appStore);
  }

  // Pick up Plan API writes when the user comes back to the tab.
  let lastRefresh = 0;
  const onFocus = () => {
    if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 5000) {
      return;
    }
    lastRefresh = Date.now();
    void refreshFromRemote(appStore);
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    unsubStore();
    unsubAuth();
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    if (timer) {
      clearTimeout(timer);
    }
  };
}
