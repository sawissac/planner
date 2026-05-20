"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { updateTodo, type Todo } from "@/lib/todoSlice";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmState } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

const loadThoughtEditorModule = () => import("@/components/thought-editor");

const ThoughtEditor = dynamic(
  () => loadThoughtEditorModule().then((m) => m.ThoughtEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-40 px-3 py-2 text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

function stripMarkdown(md: string, limit = 80): string {
  const cleaned = md
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*]+\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_+([^_]+)_+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, limit).trimEnd() + "…";
}

export type ThoughtEditorPaneHandle = {
  save: () => void;
  cancel: () => void;
};

const ThoughtEditorPane = forwardRef<
  ThoughtEditorPaneHandle,
  {
    todo: Todo;
    onBack: () => void;
    onDirtyChange: (dirty: boolean) => void;
  }
>(function ThoughtEditorPane({ todo, onBack, onDirtyChange }, ref) {
  const dispatch = useAppDispatch();
  const initial = todo.thought ?? "";
  const [value, setValue] = useState(initial);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(() => setEditorReady(true));
    }, 320);
    return () => {
      window.clearTimeout(timeoutId);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    onDirtyChange(next !== initial);
  };

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        dispatch(updateTodo({ id: todo.id, thought: value }));
        onDirtyChange(false);
      },
      cancel: () => {
        setValue(initial);
        onDirtyChange(false);
      },
    }),
    [dispatch, todo.id, value, initial, onDirtyChange],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onBack}
          aria-label="Back to list"
          className="md:hidden"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex-1 truncate text-sm font-medium">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {todo.title?.trim() || "(untitled)"}
          </span>
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-background">
        {editorReady ? (
          <ThoughtEditor markdown={value} onChange={handleChange} />
        ) : (
          <div className="min-h-40 px-3 py-2 text-sm text-muted-foreground">
            Loading editor…
          </div>
        )}
      </div>
    </div>
  );
});

export function ThoughtsView() {
  const file = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });

  const todos = useMemo(() => file?.todos ?? [], [file?.todos]);

  const initialId = useMemo(() => {
    if (todos.length === 0) return null;
    const withThought = todos.find((t) => (t.thought ?? "").trim().length > 0);
    return (withThought ?? todos[0]).id;
  }, [todos]);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [view, setView] = useState<"list" | "editor">("list");
  const [dirty, setDirty] = useState(false);
  const paneRef = useRef<ThoughtEditorPaneHandle | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
  });

  const activeFileId = useAppSelector((s) => s.todos.activeFileId);
  const prevFileIdRef = useRef<string | null>(activeFileId);
  useEffect(() => {
    if (prevFileIdRef.current !== activeFileId) {
      prevFileIdRef.current = activeFileId;
      setSelectedId(initialId);
      setView("list");
      setDirty(false);
    }
  }, [activeFileId, initialId]);

  const effectiveSelectedId =
    selectedId && todos.some((t) => t.id === selectedId)
      ? selectedId
      : initialId;

  if (!file || todos.length === 0) {
    return (
      <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
        No tasks in this file.
      </div>
    );
  }

  const selected =
    todos.find((t) => t.id === effectiveSelectedId) ?? null;

  const requestSelect = (id: string, nextView: "list" | "editor") => {
    if (dirty && id !== effectiveSelectedId) {
      setConfirm({
        open: true,
        title: "Discard unsaved thought?",
        description: "Your edits to the current thought will be lost.",
        destructive: true,
        confirmLabel: "Discard",
        onConfirm: () => {
          paneRef.current?.cancel();
          setSelectedId(id);
          setView(nextView);
        },
      });
      return;
    }
    setSelectedId(id);
    setView(nextView);
  };

  const pickRow = (id: string) => requestSelect(id, "editor");

  const requestBack = () => {
    if (dirty) {
      setConfirm({
        open: true,
        title: "Discard unsaved thought?",
        description: "Your edits to the current thought will be lost.",
        destructive: true,
        confirmLabel: "Discard",
        onConfirm: () => {
          paneRef.current?.cancel();
          setView("list");
        },
      });
      return;
    }
    setView("list");
  };

  return (
    <div className="grid items-start gap-3 md:grid-cols-[minmax(240px,320px)_1fr]">
      <div
        className={cn(
          "min-w-0 rounded-md border border-border overflow-y-auto",
          "max-h-[calc(100vh-160px)] md:sticky md:top-2 md:max-h-[calc(100vh-140px)]",
          view === "editor" ? "hidden md:block" : "block",
        )}
      >
        <ul className="divide-y divide-border">
          {todos.map((t) => {
            const preview = stripMarkdown(t.thought ?? "");
            const isSelected = t.id === effectiveSelectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => pickRow(t.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="w-full truncate text-sm font-medium">
                    {t.title?.trim() || "(untitled)"}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-xs",
                      preview
                        ? "text-muted-foreground"
                        : "italic text-muted-foreground/70",
                    )}
                  >
                    {preview || "Empty"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div
        className={cn(
          "min-w-0 md:sticky md:top-2 md:self-start md:max-h-[calc(100vh-140px)]",
          view === "list" ? "hidden md:block" : "block",
        )}
      >
        {selected ? (
          <div className="flex flex-col gap-2 md:h-[calc(100vh-140px)]">
            <ThoughtEditorPane
              key={selected.id}
              ref={paneRef}
              todo={selected}
              onBack={requestBack}
              onDirtyChange={setDirty}
            />
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => paneRef.current?.cancel()}
                disabled={!dirty}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => paneRef.current?.save()}
                disabled={!dirty}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
            Select a task to edit its thought.
          </div>
        )}
      </div>
      <ConfirmDialog
        state={confirm}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
      />
    </div>
  );
}
