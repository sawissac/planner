import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ProviderId = "gemini" | "openrouter";

/** One stored API key. A provider may have several; see `src/lib/ai/key-store.ts`. */
export type AiKey = {
  id: string;
  provider: ProviderId;
  label: string;
  key: string;
};

export type ModelOption = {
  id: string;
  label: string;
  provider: ProviderId;
};

export const FREE_MODELS: ModelOption[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "gemini" },
];

export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolName?: string;
  toolCalls?: { id: string; name: string; args: string }[];
  pending?: boolean;
  hidden?: boolean;
};

/** Which panel the sidebar pane shows; each has a tab on the rail. */
export type SidebarView = "files" | "ai" | "projects";

export type AiState = {
  open: boolean;
  modelId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  openrouterModels: ModelOption[];
  keys: AiKey[];
  /** Key chosen in the chat panel, per provider. Missing → first key. */
  selectedKeyIds: Partial<Record<ProviderId, string>>;
  /** Provider a chat starts on; picking it switches the chat model to it. */
  defaultProvider: ProviderId;
  /** What the sidebar pane shows: the file list, AI provider settings or project folders. */
  sidebarView: SidebarView;
  /**
   * Bumped by {@link showAiProviders} and {@link showProjects}; the app shell
   * watches it to open a closed sidebar. A counter, so asking twice still
   * re-opens.
   */
  providersRequest: number;
};

const MODEL_ID_KEY = "ai.modelId";
const SELECTED_KEYS_KEY = "ai.selectedKeyIds";
const DEFAULT_PROVIDER_KEY = "ai.defaultProvider";

function persist(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

function loadDefaultProvider(): ProviderId {
  if (typeof window === "undefined") {
    return "gemini";
  }
  try {
    const stored = window.localStorage.getItem(DEFAULT_PROVIDER_KEY);
    return stored === "openrouter" ? "openrouter" : "gemini";
  } catch {
    return "gemini";
  }
}

function loadSelectedKeyIds(): Partial<Record<ProviderId, string>> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SELECTED_KEYS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadStoredModelId(): string {
  if (typeof window === "undefined") {
    return FREE_MODELS[0].id;
  }
  try {
    return window.localStorage.getItem(MODEL_ID_KEY) || FREE_MODELS[0].id;
  } catch {
    return FREE_MODELS[0].id;
  }
}

const initialState: AiState = {
  open: false,
  modelId: loadStoredModelId(),
  messages: [],
  isStreaming: false,
  error: null,
  openrouterModels: [],
  keys: [],
  selectedKeyIds: loadSelectedKeyIds(),
  defaultProvider: loadDefaultProvider(),
  sidebarView: "files",
  providersRequest: 0,
};

/** The key a chat with `provider` uses: the chosen one, else the first stored. */
export function resolveKey(
  state: Pick<AiState, "keys" | "selectedKeyIds">,
  provider: ProviderId,
): AiKey | undefined {
  const own = state.keys.filter((k) => k.provider === provider);
  return own.find((k) => k.id === state.selectedKeyIds[provider]) ?? own[0];
}

export function getAllModels(openrouterModels: ModelOption[] = []): ModelOption[] {
  return [...FREE_MODELS, ...openrouterModels];
}

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    setOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload;
    },
    setModel(state, action: PayloadAction<string>) {
      state.modelId = action.payload;
      persist(MODEL_ID_KEY, action.payload);
    },
    setDefaultProvider(state, action: PayloadAction<ProviderId>) {
      const provider = action.payload;
      state.defaultProvider = provider;
      persist(DEFAULT_PROVIDER_KEY, provider);
      const models = getAllModels(state.openrouterModels);
      const current = models.find((m) => m.id === state.modelId);
      if (current?.provider !== provider) {
        const first = models.find((m) => m.provider === provider);
        if (first) {
          state.modelId = first.id;
          persist(MODEL_ID_KEY, first.id);
        }
      }
    },
    setSidebarView(state, action: PayloadAction<SidebarView>) {
      state.sidebarView = action.payload;
    },
    /** Show the AI provider settings in the sidebar, opening it if closed. */
    showAiProviders(state) {
      state.sidebarView = "ai";
      state.providersRequest += 1;
    },
    /** Show the saved project folders in the sidebar, opening it if closed. */
    showProjects(state) {
      state.sidebarView = "projects";
      state.providersRequest += 1;
    },
    addMessage: {
      prepare(msg: Omit<ChatMessage, "id">) {
        return { payload: { ...msg, id: nanoid() } satisfies ChatMessage };
      },
      reducer(state, action: PayloadAction<ChatMessage>) {
        state.messages.push(action.payload);
      },
    },
    updateMessage(
      state,
      action: PayloadAction<{ id: string; content?: string; pending?: boolean }>,
    ) {
      const m = state.messages.find((x) => x.id === action.payload.id);
      if (!m) {
        return;
      }
      if (action.payload.content !== undefined) {
        m.content = action.payload.content;
      }
      if (action.payload.pending !== undefined) {
        m.pending = action.payload.pending;
      }
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearChat(state) {
      state.messages = [];
      state.error = null;
    },
    setOpenrouterModels(state, action: PayloadAction<ModelOption[]>) {
      state.openrouterModels = action.payload;
    },
    setKeys(state, action: PayloadAction<AiKey[]>) {
      state.keys = action.payload;
    },
    selectKey(state, action: PayloadAction<{ provider: ProviderId; id: string }>) {
      state.selectedKeyIds[action.payload.provider] = action.payload.id;
      persist(SELECTED_KEYS_KEY, JSON.stringify(state.selectedKeyIds));
    },
    truncateAfterLastUser(state) {
      let lastUserIdx = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx === -1) {
        return;
      }
      state.messages = state.messages.slice(0, lastUserIdx + 1);
    },
  },
});

export const {
  setOpen,
  setModel,
  addMessage,
  updateMessage,
  setStreaming,
  setError,
  clearChat,
  truncateAfterLastUser,
  setOpenrouterModels,
  setKeys,
  selectKey,
  setDefaultProvider,
  setSidebarView,
  showAiProviders,
  showProjects,
} = aiSlice.actions;

export default aiSlice.reducer;
