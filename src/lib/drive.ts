"use client"

const SCOPE = "https://www.googleapis.com/auth/drive.appdata"
const TOKEN_KEY = "planner:drive:token"
const FILE_NAME = "planner-state.json"

type GoogleTokenClient = {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: GoogleTokenResponse) => void
          }) => GoogleTokenClient
          revoke: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

type StoredToken = { access_token: string; expires_at: number }

let tokenClient: GoogleTokenClient | null = null
let cachedFileId: string | null = null
let listeners = new Set<(signedIn: boolean) => void>()

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as StoredToken
    if (typeof t.access_token !== "string" || typeof t.expires_at !== "number") return null
    if (Date.now() >= t.expires_at - 30_000) return null
    return t
  } catch {
    return null
  }
}

function writeToken(t: StoredToken | null) {
  if (!t) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  listeners.forEach((fn) => fn(!!t))
}

export function onAuthChange(fn: (signedIn: boolean) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function isSignedIn(): boolean {
  return readToken() !== null
}

function waitForGoogle(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const start = Date.now()
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(id)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id)
        reject(new Error("GIS script load timeout"))
      }
    }, 100)
  })
}

function getClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!id) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID not set")
  return id
}

async function ensureTokenClient(): Promise<GoogleTokenClient> {
  if (tokenClient) return tokenClient
  await waitForGoogle()
  const g = window.google!
  return new Promise((resolve) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPE,
      callback: (resp) => {
        if (resp.access_token && resp.expires_in) {
          writeToken({
            access_token: resp.access_token,
            expires_at: Date.now() + resp.expires_in * 1000,
          })
        }
      },
    })
    tokenClient = client
    resolve(client)
  })
}

export async function signIn(): Promise<void> {
  const client = await ensureTokenClient()
  await new Promise<void>((resolve, reject) => {
    const off = onAuthChange((signedIn) => {
      if (signedIn) {
        off()
        resolve()
      }
    })
    setTimeout(() => {
      off()
      reject(new Error("Sign-in cancelled or timed out"))
    }, 120_000)
    client.requestAccessToken({ prompt: "consent" })
  })
}

export async function signOut(): Promise<void> {
  const t = readToken()
  writeToken(null)
  cachedFileId = null
  if (t && window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => {
      window.google!.accounts.oauth2.revoke(t.access_token, () => resolve())
    })
  }
}

async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const t = readToken()
  if (!t) throw new Error("Not signed in")
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${t.access_token}`)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    writeToken(null)
    throw new Error("Drive auth expired")
  }
  return res
}

async function findFileId(): Promise<string | null> {
  if (cachedFileId) return cachedFileId
  const url = new URL("https://www.googleapis.com/drive/v3/files")
  url.searchParams.set("spaces", "appDataFolder")
  url.searchParams.set("q", `name='${FILE_NAME}'`)
  url.searchParams.set("fields", "files(id,name,modifiedTime)")
  const res = await authedFetch(url.toString())
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = (await res.json()) as { files?: Array<{ id: string }> }
  cachedFileId = data.files?.[0]?.id ?? null
  return cachedFileId
}

export type RemotePayload = {
  version: 1
  updatedAt: number
  deviceId: string
  todos: unknown
  settings: unknown
  users: unknown
}

export async function fetchRemote(): Promise<RemotePayload | null> {
  const id = await findFileId()
  if (!id) return null
  const res = await authedFetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
  )
  if (res.status === 404) {
    cachedFileId = null
    return null
  }
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`)
  const json = (await res.json()) as RemotePayload
  return json
}

export async function pushRemote(payload: RemotePayload): Promise<void> {
  const body = JSON.stringify(payload)
  const existing = await findFileId()
  const boundary = "planner_" + Math.random().toString(36).slice(2)
  const meta = existing
    ? { name: FILE_NAME }
    : { name: FILE_NAME, parents: ["appDataFolder"] }
  const multipart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    body +
    `\r\n--${boundary}--`

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
  const res = await authedFetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  })
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`)
  const data = (await res.json()) as { id?: string }
  if (data.id) cachedFileId = data.id
}
