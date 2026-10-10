import { getAllModels, resolveKey, setKeys } from "@/stores/slices/aiSlice";
import type { AppStore } from "@/stores/store";

import { listKeys } from "./key-store";
import { chatCompletion, type OpenAIMessage, PROVIDER_LABEL } from "./providers";

/**
 * What the selection menu in the Markdown editors asks for:
 *
 * - `shorten` — a shorter version that replaces the selection
 * - `ideate` — the selection is an idea; the reply continues it and is
 *   inserted after the selection
 * - `custom` — the user's own instruction; the reply replaces the selection
 */
export type AssistAction = "shorten" | "ideate" | "custom";

/** How much of the surrounding document goes along as context. */
const MAX_CONTEXT_CHARS = 6000;

const SYSTEM = [
  "You are a writing assistant inside a Markdown notes editor.",
  "Reply with Markdown only: no preamble, no explanation, no surrounding quotes,",
  "and no code fence around the whole answer.",
  "Write in the same language as the selected text.",
].join(" ");

function task(action: AssistAction, instruction: string): string {
  switch (action) {
    case "shorten":
      return (
        "Shorten the selected text. Keep its meaning, tone and Markdown formatting. " +
        "Reply with only the shortened text; it replaces the selection."
      );
    case "ideate":
      return (
        "The selected text is the user's idea. Continue ideating: build on it with new, " +
        "concrete ideas that follow from it, without repeating it. Keep it concise and in " +
        "the document's style (a short list if the idea is a list item). Reply with only " +
        "the continuation; it is inserted right after the selection."
      );
    case "custom":
      return (
        `Apply this instruction to the selected text: ${instruction.trim()}\n` +
        "Reply with only the resulting text; it replaces the selection."
      );
  }
}

/** Drop a code fence the model wrapped the whole reply in despite the prompt. */
function unwrap(text: string): string {
  const m = /^```[\w-]*\n([\s\S]*?)\n```$/.exec(text.trim());
  return (m ? m[1] : text).trim();
}

/**
 * Run one selection-menu request with the chat's current model and key.
 * Returns the Markdown to insert; throws with a user-facing message.
 */
export async function runAssist(
  store: AppStore,
  args: {
    action: AssistAction;
    selection: string;
    /** The whole document, for context. */
    document: string;
    /** The user's instruction for `custom`. */
    instruction?: string;
    signal?: AbortSignal;
  },
): Promise<string> {
  // Keys load with the chat panel; fetch them here if that hasn't happened.
  if (store.getState().ai.keys.length === 0) {
    store.dispatch(setKeys(await listKeys().catch(() => [])));
  }
  const ai = store.getState().ai;
  const model = getAllModels(ai.openrouterModels).find((m) => m.id === ai.modelId);
  if (!model) {
    throw new Error("No AI model selected. Pick one in the AI chat.");
  }
  const apiKey = resolveKey(ai, model.provider)?.key;
  if (!apiKey) {
    throw new Error(`No ${PROVIDER_LABEL[model.provider]} API key. Add one under AI providers.`);
  }

  const doc =
    args.document.length > MAX_CONTEXT_CHARS
      ? `${args.document.slice(0, MAX_CONTEXT_CHARS)}\n…`
      : args.document;
  const messages: OpenAIMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `${task(args.action, args.instruction ?? "")}\n\n` +
        `Document (context only):\n"""\n${doc}\n"""\n\n` +
        `Selected text:\n"""\n${args.selection}\n"""`,
    },
  ];
  const res = await chatCompletion({
    provider: model.provider,
    model: model.id,
    apiKey,
    messages,
    signal: args.signal,
  });
  const text = unwrap(res.choices?.[0]?.message?.content ?? "");
  if (!text) {
    throw new Error("The model returned nothing. Try again.");
  }
  return text;
}
