import type { ModelOption, ProviderId } from "../aiSlice"

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  ollama: "Ollama (local)",
  huggingface: "Hugging Face",
  openrouter: "OpenRouter (free)",
}

export const PROVIDER_KEY_URL: Record<ProviderId, string> = {
  gemini: "https://aistudio.google.com/apikey",
  ollama: "https://ollama.com/download",
  huggingface: "https://huggingface.co/settings/tokens",
  openrouter: "https://openrouter.ai/settings/keys",
}

const KEY_PREFIX = "ai-key:"

export function getApiKey(provider: ProviderId): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(KEY_PREFIX + provider) ?? ""
}

export function setApiKey(provider: ProviderId, key: string): void {
  if (typeof window === "undefined") return
  if (key) localStorage.setItem(KEY_PREFIX + provider, key)
  else localStorage.removeItem(KEY_PREFIX + provider)
}

export function getOllamaBaseUrl(): string {
  const stored = getApiKey("ollama").trim()
  return (stored || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "")
}

export async function listOllamaModels(
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`${getOllamaBaseUrl()}/api/tags`, { signal })
  if (!res.ok) throw new Error(`Ollama /api/tags HTTP ${res.status}`)
  const data = (await res.json()) as { models?: { name?: string }[] }
  return (data.models ?? [])
    .map((m) => m.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0)
}

export function getEndpoint(provider: ProviderId): string {
  switch (provider) {
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    case "ollama":
      return `${getOllamaBaseUrl()}/v1/chat/completions`
    case "huggingface":
      return "https://router.huggingface.co/v1/chat/completions"
    case "openrouter":
      return "https://openrouter.ai/api/v1/chat/completions"
  }
}

type OpenrouterModel = {
  id: string
  name?: string
  pricing?: { prompt?: string; completion?: string }
}

export async function listOpenrouterFreeModels(
  signal?: AbortSignal,
): Promise<ModelOption[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", { signal })
  if (!res.ok) throw new Error(`OpenRouter /models HTTP ${res.status}`)
  const data = (await res.json()) as { data?: OpenrouterModel[] }
  const list = data.data ?? []
  return list
    .filter((m) => {
      if (m.id.endsWith(":free")) return true
      const p = Number(m.pricing?.prompt ?? "1")
      const c = Number(m.pricing?.completion ?? "1")
      return p === 0 && c === 0
    })
    .map<ModelOption>((m) => ({
      id: m.id,
      label: m.name ? `${m.name}` : m.id,
      provider: "openrouter",
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export type OpenAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string }

export type OpenAIToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type OpenAITool = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type ChatCompletionResponse = {
  choices: {
    message: {
      role: "assistant"
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string
  }[]
  error?: { message?: string }
}

export async function chatCompletion(args: {
  provider: ProviderId
  model: string
  apiKey: string
  messages: OpenAIMessage[]
  tools?: OpenAITool[]
  toolChoice?: "auto" | "required" | "none"
  signal?: AbortSignal
}): Promise<ChatCompletionResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (args.provider !== "ollama") {
    headers.Authorization = `Bearer ${args.apiKey}`
  }
  if (args.provider === "openrouter" && typeof window !== "undefined") {
    headers["HTTP-Referer"] = window.location.origin
    headers["X-Title"] = "Planner"
  }
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
  }
  if (args.tools && args.tools.length > 0) {
    body.tools = args.tools
    body.tool_choice = args.toolChoice ?? "auto"
  }
  const res = await fetch(getEndpoint(args.provider), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: args.signal,
  })
  const data: ChatCompletionResponse = await res.json().catch(() => ({
    choices: [],
    error: { message: "Invalid JSON response" },
  }))
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}
