import { createSlice, type PayloadAction, nanoid } from "@reduxjs/toolkit"

export type ProviderId = "gemini" | "ollama" | "huggingface" | "openrouter"

export type ModelOption = {
  id: string
  label: string
  provider: ProviderId
}

export const FREE_MODELS: ModelOption[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "gemini" },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B Instruct",
    provider: "huggingface",
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    label: "Qwen2.5 72B Instruct",
    provider: "huggingface",
  },
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    label: "Mistral 7B Instruct v0.3",
    provider: "huggingface",
  },
]

export type ChatRole = "user" | "assistant" | "system" | "tool"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  toolName?: string
  toolCalls?: { id: string; name: string; args: string }[]
  pending?: boolean
  hidden?: boolean
}

export type AiState = {
  open: boolean
  modelId: string
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  ollamaModels: string[]
  openrouterModels: ModelOption[]
}

const MODEL_ID_KEY = "ai.modelId"

function loadStoredModelId(): string {
  if (typeof window === "undefined") return FREE_MODELS[0].id
  try {
    return window.localStorage.getItem(MODEL_ID_KEY) || FREE_MODELS[0].id
  } catch {
    return FREE_MODELS[0].id
  }
}

const initialState: AiState = {
  open: false,
  modelId: loadStoredModelId(),
  messages: [],
  isStreaming: false,
  error: null,
  ollamaModels: [],
  openrouterModels: [],
}

export function getAllModels(
  ollamaNames: string[],
  openrouterModels: ModelOption[] = [],
): ModelOption[] {
  return [
    ...FREE_MODELS,
    ...openrouterModels,
    ...ollamaNames.map((n) => ({
      id: n,
      label: `${n} (Ollama)`,
      provider: "ollama" as const,
    })),
  ]
}

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    setOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload
    },
    setModel(state, action: PayloadAction<string>) {
      state.modelId = action.payload
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(MODEL_ID_KEY, action.payload)
        } catch {
          /* ignore quota errors */
        }
      }
    },
    addMessage: {
      prepare(msg: Omit<ChatMessage, "id">) {
        return { payload: { ...msg, id: nanoid() } satisfies ChatMessage }
      },
      reducer(state, action: PayloadAction<ChatMessage>) {
        state.messages.push(action.payload)
      },
    },
    updateMessage(state, action: PayloadAction<{ id: string; content?: string; pending?: boolean }>) {
      const m = state.messages.find((x) => x.id === action.payload.id)
      if (!m) return
      if (action.payload.content !== undefined) m.content = action.payload.content
      if (action.payload.pending !== undefined) m.pending = action.payload.pending
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    clearChat(state) {
      state.messages = []
      state.error = null
    },
    setOllamaModels(state, action: PayloadAction<string[]>) {
      state.ollamaModels = action.payload
    },
    setOpenrouterModels(state, action: PayloadAction<ModelOption[]>) {
      state.openrouterModels = action.payload
    },
    truncateAfterLastUser(state) {
      let lastUserIdx = -1
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "user") {
          lastUserIdx = i
          break
        }
      }
      if (lastUserIdx === -1) return
      state.messages = state.messages.slice(0, lastUserIdx + 1)
    },
  },
})

export const {
  setOpen,
  setModel,
  addMessage,
  updateMessage,
  setStreaming,
  setError,
  clearChat,
  truncateAfterLastUser,
  setOllamaModels,
  setOpenrouterModels,
} = aiSlice.actions

export default aiSlice.reducer
