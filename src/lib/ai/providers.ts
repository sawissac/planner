import type { ModelOption, ProviderId } from "@/stores/slices/aiSlice";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  openrouter: "OpenRouter (free)",
};

export const PROVIDER_KEY_URL: Record<ProviderId, string> = {
  gemini: "https://aistudio.google.com/apikey",
  openrouter: "https://openrouter.ai/settings/keys",
};

export function getEndpoint(provider: ProviderId): string {
  switch (provider) {
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "openrouter":
      return "https://openrouter.ai/api/v1/chat/completions";
  }
}

type OpenrouterModel = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
};

export async function listOpenrouterFreeModels(signal?: AbortSignal): Promise<ModelOption[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", { signal });
  if (!res.ok) {
    throw new Error(`OpenRouter /models HTTP ${res.status}`);
  }
  const data = (await res.json()) as { data?: OpenrouterModel[] };
  const list = data.data ?? [];
  return list
    .filter((m) => {
      if (m.id.endsWith(":free")) {
        return true;
      }
      const p = Number(m.pricing?.prompt ?? "1");
      const c = Number(m.pricing?.completion ?? "1");
      return p === 0 && c === 0;
    })
    .map<ModelOption>((m) => ({
      id: m.id,
      label: m.name ? `${m.name}` : m.id,
      provider: "openrouter",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type OpenAIMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatCompletionResponse = {
  choices: {
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }[];
  error?: { message?: string };
};

export async function chatCompletion(args: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  toolChoice?: "auto" | "required" | "none";
  signal?: AbortSignal;
}): Promise<ChatCompletionResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${args.apiKey}`,
  };
  if (args.provider === "openrouter" && typeof window !== "undefined") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "Planner";
  }
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
  };
  if (args.tools && args.tools.length > 0) {
    body.tools = args.tools;
    body.tool_choice = args.toolChoice ?? "auto";
  }
  const res = await fetch(getEndpoint(args.provider), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: args.signal,
  });
  const data: ChatCompletionResponse = await res.json().catch(() => ({
    choices: [],
    error: { message: "Invalid JSON response" },
  }));
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
