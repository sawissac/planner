"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";

import { CopyApiUrlButton } from "@/components/customs/CopyApiUrlButton";
import { RefreshThoughtButton } from "@/components/customs/RefreshThoughtButton";
import { RunAgentButton } from "@/components/customs/RunAgentButton";
import { ThoughtComments } from "@/components/customs/ThoughtComments";
import { TokenCount } from "@/components/customs/TokenCount";
import { Button } from "@/components/ui/button";
import { useDraftSaver } from "@/hooks/useDraftSaver";
import { useAppDispatch } from "@/stores/hooks";
import { type Todo, updateTodo } from "@/stores/slices/todoSlice";

const ThoughtEditor = dynamic(
  () => import("@/components/customs/ThoughtEditor").then((m) => m.ThoughtEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-40 px-3 py-2 text-sm text-app-dim">Loading editor…</div>,
  },
);

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Inline thought editor shown under its task's title in focus mode, so a
 * thought can be written without leaving the distraction-free view for the
 * side dialog.
 *
 * It renders inside the task's table row, so the draft is owned by the table
 * (`value` / `onChange`): a virtualized row can unmount while scrolled away,
 * and the draft has to survive that. Keyboard and drag events are stopped here
 * so typing never reaches the row's shortcuts and text drags never reorder.
 */
export function FocusThoughtPanel({
  todo,
  value,
  onChange,
  onClose,
  dirty,
  editorKey,
  rightInset,
}: {
  todo: Todo;
  value: string;
  onChange: (md: string) => void;
  /** Asks before discarding unsaved edits. */
  onClose: () => void;
  dirty: boolean;
  /** Remounts the editor when the table adopts a refreshed saved thought. */
  editorKey: number;
  rightInset: number;
}) {
  const dispatch = useAppDispatch();
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();

  // Fit the visible width of the task list, measured rather than derived
  // from column sizes: the fixed-layout table stretches its columns to fill
  // the scroller, so column offsets don't match where the title really sits.
  useLayoutEffect(() => {
    const el = rootRef.current;
    const scroller = el?.closest<HTMLElement>("[data-todo-scroller]");
    if (!el || !scroller) {
      return;
    }
    const fit = () => {
      const left =
        el.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft;
      setWidth(Math.max(240, scroller.clientWidth - left - rightInset));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [rightInset]);

  const save = () => {
    // Stays open: saving is a checkpoint, Close is how to leave.
    dispatch(updateTodo({ id: todo.id, thought: value }));
  };

  // "Copy context" saves the draft first, so the copy reads what is on screen.
  useDraftSaver(todo.id, () => {
    if (dirty) {
      save();
    }
  });

  return (
    <div
      ref={rootRef}
      data-testid="focus-thought-panel"
      style={{ width }}
      onClick={stop}
      onDoubleClick={stop}
      onKeyDown={stop}
      onDragStart={stop}
      onDragOver={stop}
      onDragLeave={stop}
      onDrop={stop}
      onDragEnd={stop}
      className="relative z-2 mt-2 flex max-w-none min-w-0 cursor-auto flex-col overflow-hidden rounded-md border border-app-border bg-app-bg whitespace-normal"
    >
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-app-border px-3 py-2">
        <RefreshThoughtButton showLabel data-testid="focus-thought-panel-refresh-button" />
        <CopyApiUrlButton todoId={todo.id} showLabel />
        <RunAgentButton todoId={todo.id} showLabel className="mr-auto" />
        <TokenCount text={value} data-testid="thought-token-count" />
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          data-testid="focus-thought-panel-close-button"
        >
          Close
        </Button>
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty}
          data-testid="focus-thought-panel-save-button"
        >
          Save
        </Button>
      </div>
      {/* Grows with its content; the task list around it does the scrolling. */}
      <div className="bg-app-bg">
        <ThoughtEditor key={editorKey} markdown={value} onChange={onChange} compact />
        <div className="border-t border-app-border">
          <ThoughtComments todo={todo} />
        </div>
      </div>
    </div>
  );
}
