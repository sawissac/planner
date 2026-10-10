"use client";

import {
  Bot,
  BrainCircuit,
  Check,
  ChevronsUpDown,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useConfirm } from "@/components/customs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PROVIDERS } from "@/features/AiChat/AiProviderSettings";
import { useAuth } from "@/hooks/useAuth";
import { keyName, listKeys } from "@/lib/ai/key-store";
import { listOpenrouterFreeModels, PROVIDER_LABEL } from "@/lib/ai/providers";
import { retryChat, runChat } from "@/lib/ai/runner";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";
import { useAppDispatch, useAppSelector, useAppStore } from "@/stores/hooks";
import {
  clearChat,
  getAllModels,
  resolveKey,
  selectKey,
  setKeys,
  setModel,
  setOpen,
  setOpenrouterModels,
  showAiProviders,
} from "@/stores/slices/aiSlice";

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
          <DialogDescription>Pick one to fill the chat box. Edit before sending.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex max-h-[50vh] flex-col gap-2">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onPick(p);
                onOpenChange(false);
              }}
              className={cn(ui.row, "text-[12px] text-app-text")}
            >
              {p}
            </button>
          ))}
        </DialogBody>
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
  const openrouterModels = useAppSelector((s) => s.ai.openrouterModels);
  const keys = useAppSelector((s) => s.ai.keys);
  const selectedKeyIds = useAppSelector((s) => s.ai.selectedKeyIds);
  const defaultProvider = useAppSelector((s) => s.ai.defaultProvider);
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const store = useAppStore();
  const [input, setInput] = useState("");
  const [examplesOpen, setExamplesOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const allModels = useMemo(() => getAllModels(openrouterModels), [openrouterModels]);
  const model = useMemo(
    () => allModels.find((m) => m.id === modelId) ?? allModels[0],
    [allModels, modelId],
  );

  const refreshOpenrouter = async () => {
    try {
      const models = await listOpenrouterFreeModels();
      dispatch(setOpenrouterModels(models));
    } catch {
      dispatch(setOpenrouterModels([]));
    }
  };

  useEffect(() => {
    void refreshOpenrouter();
  }, []);

  // Reload keys whenever the account changes: sign-in swaps browser keys for
  // the account's (moving any browser keys up first), sign-out swaps back.
  useEffect(() => {
    listKeys()
      .then((k) => dispatch(setKeys(k)))
      .catch(() => dispatch(setKeys([])));
  }, [dispatch, user?.id]);

  // Default provider's models first in the picker.
  const pickerProviders = [defaultProvider, ...AI_PROVIDERS.filter((p) => p !== defaultProvider)];

  const providerKeys = keys.filter((k) => k.provider === model.provider);
  const activeKey = resolveKey({ keys, selectedKeyIds }, model.provider);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || isStreaming) {
      return;
    }
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
    if (isStreaming) {
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await retryChat(store, ctrl.signal);
    abortRef.current = null;
  };

  const canRetry = useMemo(() => messages.some((m) => m.role === "user"), [messages]);

  const visibleMessages = messages.filter(
    (m) =>
      !m.hidden &&
      (m.role === "user" ||
        (m.role === "assistant" && (m.content || (m.toolCalls && m.toolCalls.length > 0)))),
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
              "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,640px)] flex flex-col rounded-2xl border border-app-border bg-app-panel text-app-bright overflow-hidden",
              visibleMessages.length === 0 ? "max-h-[70vh]" : "h-[70vh]",
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-app-border shrink-0">
              <Sparkles className="size-4 text-app-accent" />
              <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
                <PopoverTrigger
                  className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-app-hover"
                  aria-label="Select model"
                >
                  <span className="truncate max-w-[16rem]">{model.label}</span>
                  <ChevronsUpDown className="size-3 opacity-50" />
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 w-[20rem]">
                  <Command>
                    <CommandInput placeholder="Search models…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No matching model.</CommandEmpty>
                      {pickerProviders.map((p, idx) => {
                        const models = allModels.filter((m) => m.provider === p);
                        return (
                          <div key={p}>
                            {idx > 0 && <CommandSeparator />}
                            <CommandGroup
                              heading={`${PROVIDER_LABEL[p]}${p === defaultProvider ? " · default" : ""}`}
                            >
                              {models.length === 0 && p === "openrouter" && (
                                <div className="px-2 py-1.5 text-xs text-app-dim">
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
              {providerKeys.length > 0 ? (
                <Select
                  value={activeKey?.id}
                  onValueChange={(id) => dispatch(selectKey({ provider: model.provider, id }))}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="API key"
                    title="API key used for this chat"
                    className="h-7 max-w-[10rem] gap-1 border-0 bg-transparent px-2 text-xs hover:bg-app-hover"
                    data-testid="ai-chat-key-select"
                  >
                    <BrainCircuit className="size-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerKeys.map((k) => (
                      <SelectItem key={k.id} value={k.id} className="text-xs">
                        {keyName(k, keys)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch(showAiProviders())}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-app-warn hover:bg-app-hover"
                  data-testid="ai-chat-add-key"
                >
                  <BrainCircuit className="size-3" />
                  Add {PROVIDER_LABEL[model.provider]} key
                </button>
              )}
              <div className="flex-1" />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => dispatch(showAiProviders())}
                aria-label="AI provider settings"
                title="AI provider settings"
              >
                <BrainCircuit />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  confirm({
                    title: "Clear chat?",
                    description: "All messages in this chat will be deleted.",
                    confirmLabel: "Clear",
                    destructive: true,
                    onConfirm: () => dispatch(clearChat()),
                  })
                }
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
                    <Bot className="size-8 opacity-40 text-app-dim" />
                    <p className="text-sm max-w-sm text-app-dim">
                      Plan something. Example: &quot;Plan a 3-day trip to Chiang Mai for me and
                      Alice.&quot;
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setExamplesOpen(true)}>
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
                  <div className="text-xs text-app-error bg-app-error/10 rounded-md p-2 flex items-start justify-between gap-2">
                    <span className="flex-1">{error}</span>
                    {canRetry && !isStreaming && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={retry}
                        className="h-6 px-2 text-xs text-app-error hover:bg-app-error/10"
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

            <div className="p-2 border-t border-app-border shrink-0">
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
                    <PromptInputSubmit status={status} disabled={!input.trim()} />
                  )}
                </PromptInputFooter>
              </PromptInput>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ExamplePromptsDialog open={examplesOpen} onOpenChange={setExamplesOpen} onPick={setInput} />
    </>
  );
}
