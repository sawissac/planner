"use client"

import type { AppStore } from "./store"
import { replaceState } from "./todoSlice"
import { replaceSettings } from "./settingsSlice"
import { replaceUsers } from "./userSlice"
import {
  fetchRemote,
  pushRemote,
  isSignedIn,
  onAuthChange,
  type RemotePayload,
} from "./drive"

const DEVICE_KEY = "planner:drive:device"
const LAST_PULL_KEY = "planner:drive:lastPull"

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export type SyncStatus =
  | { kind: "idle" }
  | { kind: "pulling" }
  | { kind: "pushing" }
  | { kind: "error"; message: string }
  | { kind: "ok"; at: number }

type Listener = (s: SyncStatus) => void
let status: SyncStatus = { kind: "idle" }
const statusListeners = new Set<Listener>()

function setStatus(s: SyncStatus) {
  status = s
  statusListeners.forEach((fn) => fn(s))
}

export function getStatus(): SyncStatus {
  return status
}

export function onStatus(fn: Listener): () => void {
  statusListeners.add(fn)
  fn(status)
  return () => {
    statusListeners.delete(fn)
  }
}

function applyRemote(appStore: AppStore, payload: RemotePayload) {
  if (payload.todos && typeof payload.todos === "object") {
    appStore.dispatch(replaceState(payload.todos as never))
  }
  if (payload.settings && typeof payload.settings === "object") {
    appStore.dispatch(replaceSettings(payload.settings as never))
  }
  if (payload.users && typeof payload.users === "object") {
    appStore.dispatch(replaceUsers(payload.users as never))
  }
}

export async function pullOnce(appStore: AppStore): Promise<void> {
  if (!isSignedIn()) return
  setStatus({ kind: "pulling" })
  try {
    const remote = await fetchRemote()
    if (remote) {
      const localUpdated = Number(localStorage.getItem(LAST_PULL_KEY) ?? 0)
      if (remote.updatedAt > localUpdated) {
        applyRemote(appStore, remote)
        localStorage.setItem(LAST_PULL_KEY, String(remote.updatedAt))
      }
    }
    setStatus({ kind: "ok", at: Date.now() })
  } catch (e) {
    setStatus({ kind: "error", message: e instanceof Error ? e.message : "pull failed" })
  }
}

export async function pushNow(appStore: AppStore): Promise<void> {
  if (!isSignedIn()) return
  setStatus({ kind: "pushing" })
  try {
    const state = appStore.getState()
    const now = Date.now()
    const payload: RemotePayload = {
      version: 1,
      updatedAt: now,
      deviceId: getDeviceId(),
      todos: state.todos,
      settings: state.settings,
      users: state.users,
    }
    await pushRemote(payload)
    localStorage.setItem(LAST_PULL_KEY, String(now))
    setStatus({ kind: "ok", at: now })
  } catch (e) {
    setStatus({ kind: "error", message: e instanceof Error ? e.message : "push failed" })
  }
}

export function subscribeDriveSync(
  appStore: AppStore,
  delayMs = 3000,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastTodos = appStore.getState().todos
  let lastSettings = appStore.getState().settings
  let lastUsers = appStore.getState().users

  const schedule = () => {
    if (!isSignedIn()) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void pushNow(appStore)
    }, delayMs)
  }

  const unsubStore = appStore.subscribe(() => {
    const s = appStore.getState()
    if (s.todos !== lastTodos || s.settings !== lastSettings || s.users !== lastUsers) {
      lastTodos = s.todos
      lastSettings = s.settings
      lastUsers = s.users
      schedule()
    }
  })

  const unsubAuth = onAuthChange((signedIn) => {
    if (signedIn) void pullOnce(appStore)
  })

  if (isSignedIn()) void pullOnce(appStore)

  return () => {
    unsubStore()
    unsubAuth()
    if (timer) clearTimeout(timer)
  }
}
