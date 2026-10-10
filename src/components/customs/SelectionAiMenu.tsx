"use client";

import {
  addComposerChild$,
  insertMarkdown$,
  markdown$,
  realmPlugin,
  rootEditor$,
  useCellValue,
  usePublisher,
  useRealm,
} from "@mdxeditor/editor";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type RangeSelection,
} from "lexical";
import { Lightbulb, Loader2, Scissors, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { type AssistAction, runAssist } from "@/lib/ai/assist";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/stores/hooks";

type Mode =
  | { kind: "menu" }
  | { kind: "custom" }
  | { kind: "loading"; action: AssistAction }
  | { kind: "error"; message: string };

type Position = { left: number; top: number; below: boolean };

/** Leave this much room above a selection before flipping the menu below it. */
const FLIP_MARGIN = 48;
/** Half the widest menu state (the custom input), for clamping to the editor. */
const HALF_WIDTH = 150;

const ACTION_LABEL: Record<AssistAction, string> = {
  shorten: "Shortening…",
  ideate: "Ideating…",
  custom: "Working…",
};

/** Keep the editor's selection when a menu button is pressed. */
const keepSelection = (e: React.MouseEvent) => e.preventDefault();

const btn =
  "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-app-dim transition-colors hover:bg-app-hover hover:text-app-bright disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5";

/**
 * Floating AI menu over selected text in an editable Markdown editor:
 * **Shorten** replaces the selection with a shorter version, **Ideate**
 * treats it as an idea and adds the model's continuation as new blocks after
 * it, **Custom** opens an input for any instruction and replaces the
 * selection with the result. Uses the AI chat's current model and key
 * (`runAssist`); the change is one undoable edit.
 *
 * Rendered into the editor's root (`.mdxeditor`, positioned `relative` by
 * `ThoughtEditor`) rather than `document.body`, so it works inside dialogs
 * that trap focus.
 */
function SelectionAiMenu() {
  const editor = useCellValue(rootEditor$);
  const realm = useRealm();
  const insertMarkdown = usePublisher(insertMarkdown$);
  const store = useAppStore();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "menu" });
  const [instruction, setInstruction] = useState("");
  const savedRef = useRef<{ selection: RangeSelection; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Custom input and pending requests hold the menu in place while the
  // browser selection moves (into the input) or the user scrolls.
  const locked = mode.kind === "custom" || mode.kind === "loading";
  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    savedRef.current = null;
    setPos(null);
    setMode({ kind: "menu" });
    setInstruction("");
  }, []);

  // Follow the browser selection: show the menu over any non-empty
  // selection inside this editor, hide it otherwise.
  useEffect(() => {
    if (!editor) {
      return;
    }
    const update = () => {
      if (lockedRef.current) {
        return;
      }
      const root = editor.getRootElement();
      const container = root?.closest<HTMLElement>(".mdxeditor") ?? null;
      const sel = window.getSelection();
      if (
        !root ||
        !container ||
        !sel ||
        sel.rangeCount === 0 ||
        sel.isCollapsed ||
        !root.contains(sel.anchorNode) ||
        !root.contains(sel.focusNode) ||
        !sel.toString().trim()
      ) {
        setPos(null);
        setMode({ kind: "menu" });
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const box = container.getBoundingClientRect();
      const below = r.top - box.top < FLIP_MARGIN;
      const center = r.left - box.left + r.width / 2;
      const left =
        box.width > HALF_WIDTH * 2
          ? Math.min(Math.max(center, HALF_WIDTH), box.width - HALF_WIDTH)
          : box.width / 2;
      setHost(container);
      setPos({ left, top: below ? r.bottom - box.top + 6 : r.top - box.top - 6, below });
      setMode({ kind: "menu" });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [editor]);

  // A click outside drops the custom input (a pending request keeps going).
  useEffect(() => {
    if (mode.kind !== "custom") {
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mode.kind, close]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Snapshot the editor selection the result will be applied to. */
  const capture = (): boolean => {
    savedRef.current =
      editor?.getEditorState().read(() => {
        const s = $getSelection();
        return $isRangeSelection(s) && !s.isCollapsed()
          ? { selection: s.clone(), text: s.getTextContent() }
          : null;
      }) ?? null;
    return savedRef.current !== null;
  };

  const apply = (selection: RangeSelection, text: string, after: boolean) => {
    if (!editor) {
      return;
    }
    editor.update(
      () => {
        if (after) {
          // Continue below the block the selection ends in.
          const end = selection.isBackward() ? selection.anchor : selection.focus;
          const block = end.getNode().getTopLevelElementOrThrow();
          const p = $createParagraphNode();
          block.insertAfter(p);
          p.select();
        } else {
          $setSelection(selection.clone());
        }
      },
      { discrete: true },
    );
    insertMarkdown(text);
  };

  const run = async (action: AssistAction) => {
    if (action !== "custom" && !capture()) {
      return;
    }
    const saved = savedRef.current;
    if (!saved) {
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMode({ kind: "loading", action });
    try {
      const text = await runAssist(store, {
        action,
        selection: saved.text,
        document: realm.getValue(markdown$),
        instruction,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) {
        return;
      }
      try {
        apply(saved.selection, text, action === "ideate");
      } catch {
        setMode({ kind: "error", message: "The text changed meanwhile. Select it and try again." });
        return;
      }
      close();
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setMode({ kind: "error", message: e instanceof Error ? e.message : "Request failed." });
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
      }
    }
  };

  const startCustom = () => {
    if (capture()) {
      setMode({ kind: "custom" });
    }
  };

  if (!pos || !host) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      role="toolbar"
      aria-label="AI suggestions"
      data-testid="selection-ai-menu"
      style={{ left: pos.left, top: pos.top }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
      className={cn(
        "absolute z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-app-border bg-app-panel p-1 shadow-lg",
        !pos.below && "-translate-y-full",
      )}
    >
      {mode.kind === "menu" && (
        <>
          <button
            type="button"
            className={btn}
            onMouseDown={keepSelection}
            onClick={() => void run("shorten")}
            data-testid="selection-ai-shorten-button"
          >
            <Scissors />
            Shorten
          </button>
          <button
            type="button"
            className={btn}
            onMouseDown={keepSelection}
            onClick={() => void run("ideate")}
            data-testid="selection-ai-ideate-button"
          >
            <Lightbulb />
            Ideate
          </button>
          <button
            type="button"
            className={btn}
            onMouseDown={keepSelection}
            onClick={startCustom}
            data-testid="selection-ai-custom-button"
          >
            <Sparkles />
            Custom
          </button>
        </>
      )}
      {mode.kind === "custom" && (
        <form
          className="flex w-72 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (instruction.trim()) {
              void run("custom");
            }
          }}
        >
          <input
            autoFocus
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Tell AI what to do with the selection…"
            aria-label="Instruction for the selected text"
            data-testid="selection-ai-custom-input"
            className="h-7 min-w-0 flex-1 rounded border border-app-border bg-app-bg px-2 text-xs outline-none focus:border-app-accent"
          />
          <button
            type="submit"
            aria-label="Send"
            title="Send"
            disabled={!instruction.trim()}
            className={cn(btn, "px-1.5 text-app-accent")}
            data-testid="selection-ai-custom-send-button"
          >
            <Send />
          </button>
        </form>
      )}
      {mode.kind === "loading" && (
        <>
          <span className="inline-flex h-7 items-center gap-1.5 px-2 text-xs text-app-dim [&_svg]:size-3.5">
            <Loader2 className="animate-spin" />
            {ACTION_LABEL[mode.action]}
          </span>
          <button
            type="button"
            aria-label="Stop"
            title="Stop"
            className={cn(btn, "px-1.5")}
            onMouseDown={keepSelection}
            onClick={close}
            data-testid="selection-ai-stop-button"
          >
            <X />
          </button>
        </>
      )}
      {mode.kind === "error" && (
        <>
          <span className="max-w-64 px-2 text-xs text-app-error">{mode.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            title="Dismiss"
            className={cn(btn, "px-1.5")}
            onMouseDown={keepSelection}
            onClick={() => setMode({ kind: "menu" })}
            data-testid="selection-ai-dismiss-button"
          >
            <X />
          </button>
        </>
      )}
    </div>,
    host,
  );
}

/** MDXEditor plugin that adds {@link SelectionAiMenu} to an editable editor. */
export const selectionAiPlugin = realmPlugin({
  init(realm) {
    realm.pub(addComposerChild$, SelectionAiMenu);
  },
});
