"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  KeyRound,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/hooks";
import {
  clearChat,
  getAllModels,
  setModel,
  setOllamaModels,
  setOpen,
  setOpenrouterModels,
  type ProviderId,
} from "@/lib/aiSlice";
import {
  PROVIDER_KEY_URL,
  PROVIDER_LABEL,
  getApiKey,
  listOllamaModels,
  listOpenrouterFreeModels,
  setApiKey,
} from "@/lib/ai/providers";
import { retryChat, runChat } from "@/lib/ai/runner";
import { cn } from "@/lib/utils";

const PROVIDERS: ProviderId[] = ["gemini", "huggingface", "openrouter", "ollama"];

function ApiKeysForm({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<Record<ProviderId, string>>(() => ({
    gemini: getApiKey("gemini"),
    ollama: getApiKey("ollama"),
    huggingface: getApiKey("huggingface"),
    openrouter: getApiKey("openrouter"),
  }));

  const save = () => {
    for (const p of PROVIDERS) setApiKey(p, keys[p].trim());
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>AI providers</DialogTitle>
        <DialogDescription>
          Keys / endpoints stored in your browser localStorage. Ollama runs locally and needs no key — just a base URL.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        {PROVIDERS.map((p) => {
          const isOllama = p === "ollama";
          return (
            <div key={p} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{PROVIDER_LABEL[p]}</label>
                <a
                  href={PROVIDER_KEY_URL[p]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {isOllama ? "Install" : "Get key"}
                </a>
              </div>
              <input
                type={isOllama ? "text" : "password"}
                autoComplete="off"
                value={keys[p]}
                onChange={(e) => setKeys((s) => ({ ...s, [p]: e.target.value }))}
                placeholder={
                  isOllama
                    ? "http://localhost:11434 (default)"
                    : `${PROVIDER_LABEL[p]} API key`
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {isOllama && (
                <p className="text-xs text-muted-foreground">
                  Base URL of your local Ollama server. Leave blank for default. Start it with <code className="rounded bg-muted px-1">ollama serve</code>.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save}>Save</Button>
      </DialogFooter>
    </>
  );
}

function ApiKeysDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <ApiKeysForm onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

const EXAMPLE_PROMPTS = [
  "Plan a 3-day trip to Chiang Mai for me and Alice.",
  "Break down launching a personal blog into weekly tasks for the next month.",
  "Plan my study schedule for a Spanish A2 exam in 6 weeks.",
  "Outline a 1-week sprint to ship a landing page MVP.",
  "Plan meal prep for a high-protein week, 4 dinners.",
  "Draft a 2-week onboarding plan for a new junior engineer.",
  "Plan a weekend home declutter — kitchen, closet, garage.",
  "Schedule a 5K training plan starting from couch level, 8 weeks.",
];

function ExamplePromptsDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (text: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Example prompts</DialogTitle>
          <DialogDescription>
            Pick one to fill the chat box. Edit before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-auto">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onPick(p);
                onOpenChange(false);
              }}
              className="text-left text-sm rounded-md border border-border bg-background hover:bg-accent px-3 py-2 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AiChat() {
  const open = useAppSelector((s) => s.ai.open);
  const messages = useAppSelector((s) => s.ai.messages);
  const isStreaming = useAppSelector((s) => s.ai.isStreaming);
  const error = useAppSelector((s) => s.ai.error);
  const modelId = useAppSelector((s) => s.ai.modelId);
  const ollamaModels = useAppSelector((s) => s.ai.ollamaModels);
  const openrouterModels = useAppSelector((s) => s.ai.openrouterModels);
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [input, setInput] = useState("");
  const [keysOpen, setKeysOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const allModels = useMemo(
    () => getAllModels(ollamaModels, openrouterModels),
    [ollamaModels, openrouterModels],
  );
  const model = useMemo(
    () => allModels.find((m) => m.id === modelId) ?? allModels[0],
    [allModels, modelId],
  );

  const refreshOllama = async () => {
    try {
      const names = await listOllamaModels();
      dispatch(setOllamaModels(names));
    } catch {
      dispatch(setOllamaModels([]));
    }
  };

  const refreshOpenrouter = async () => {
    try {
      const models = await listOpenrouterFreeModels();
      dispatch(setOpenrouterModels(models));
    } catch {
      dispatch(setOpenrouterModels([]));
    }
  };

  useEffect(() => {
    void refreshOllama();
    void refreshOpenrouter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || isStreaming) return;
    setInput("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await runChat(store, text, ctrl.signal);
    abortRef.current = null;
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const retry = async () => {
    if (isStreaming) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await retryChat(store, ctrl.signal);
    abortRef.current = null;
  };

  const canRetry = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages],
  );

  const visibleMessages = messages.filter(
    (m) =>
      !m.hidden &&
      (m.role === "user" ||
        (m.role === "assistant" &&
          (m.content || (m.toolCalls && m.toolCalls.length > 0)))),
  );

  const status: "ready" | "streaming" = isStreaming ? "streaming" : "ready";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={cn(
              "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,640px)] flex flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden",
              visibleMessages.length === 0 ? "max-h-[70vh]" : "h-[70vh]",
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
              <Sparkles className="size-4 text-primary" />
              <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
                <PopoverTrigger
                  className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-accent"
                  aria-label="Select model"
                >
                  <span className="truncate max-w-[16rem]">{model.label}</span>
                  <ChevronsUpDown className="size-3 opacity-50" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="p-0 w-[20rem]"
                >
                  <Command>
                    <CommandInput placeholder="Search models…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No matching model.</CommandEmpty>
                      {PROVIDERS.map((p, idx) => {
                        const models = allModels.filter((m) => m.provider === p);
                        return (
                          <div key={p}>
                            {idx > 0 && <CommandSeparator />}
                            <CommandGroup heading={PROVIDER_LABEL[p]}>
                              {models.length === 0 && p === "ollama" && (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                  No models. Run <code className="rounded bg-muted px-1">ollama pull &lt;name&gt;</code>.
                                </div>
                              )}
                              {models.length === 0 && p === "openrouter" && (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                  Loading free models…
                                </div>
                              )}
                              {models.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={`${m.label} ${m.id} ${PROVIDER_LABEL[p]}`}
                                  onSelect={() => {
                                    dispatch(setModel(m.id));
                                    setModelPickerOpen(false);
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "size-3",
                                      m.id === modelId ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <span className="truncate">{m.label}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </div>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex-1" />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setKeysOpen(true)}
                aria-label="API keys"
                title="API keys"
              >
                <KeyRound />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => dispatch(clearChat())}
                disabled={messages.length === 0}
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => dispatch(setOpen(false))}
                aria-label="Close"
                title="Close"
              >
                <X />
              </Button>
            </div>

            <Conversation className="flex-1 min-h-0">
              <ConversationContent className="gap-4 p-3">
                {visibleMessages.length === 0 && (
                  <ConversationEmptyState
                    icon={<Bot className="size-8 opacity-40" />}
                    title="Plan something"
                    description={'Example: "Plan a 3-day trip to Chiang Mai for me and Alice."'}
                  >
                    <Bot className="size-8 opacity-40 text-muted-foreground" />
                    <p className="text-sm max-w-sm text-muted-foreground">
                      Plan something. Example: &quot;Plan a 3-day trip to Chiang Mai for me and Alice.&quot;
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExamplesOpen(true)}
                    >
                      <Lightbulb />
                      Browse examples
                    </Button>
                  </ConversationEmptyState>
                )}

                {visibleMessages.map((m) => {
                  const content =
                    m.content ||
                    (m.toolCalls && m.toolCalls.length > 0
                      ? `_Running: ${m.toolCalls.map((c) => c.name).join(", ")}_`
                      : "");
                  return (
                    <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
                      <MessageContent>
                        <MessageResponse>{content}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                })}

                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2 flex items-start justify-between gap-2">
                    <span className="flex-1">{error}</span>
                    {canRetry && !isStreaming && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={retry}
                        className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
                        aria-label="Retry"
                      >
                        <RotateCcw className="size-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="p-2 border-t border-border shrink-0">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                  <PromptInputTextarea
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    placeholder="Plan something…"
                    disabled={isStreaming}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools />
                  {isStreaming ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      type="button"
                      onClick={stop}
                      aria-label="Stop"
                    >
                      <X />
                    </Button>
                  ) : (
                    <PromptInputSubmit
                      status={status}
                      disabled={!input.trim()}
                    />
                  )}
                </PromptInputFooter>
              </PromptInput>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ApiKeysDialog
        open={keysOpen}
        onOpenChange={(o) => {
          setKeysOpen(o);
          if (!o) {
            void refreshOllama();
            void refreshOpenrouter();
          }
        }}
      />
      <ExamplePromptsDialog
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        onPick={setInput}
      />
    </>
  );
}
