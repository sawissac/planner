"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lightbulb, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDialog, type ConfirmState } from "@/components/customs/ConfirmDialog";
import { DateRangeCell } from "@/components/customs/DateRangeCell";
import { PriorityCell } from "@/components/customs/PriorityCell";
import { ProgressCell } from "@/components/customs/ProgressCell";
import { PromptDialog, type PromptState } from "@/components/customs/PromptDialog";
import { preloadThoughtEditor, ThoughtDialog } from "@/components/customs/TodoRowActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addProgressOption,
  DEFAULT_PROGRESS_OPTIONS,
  removeProgressOption,
  renameProgressOption,
  reorderProgressOption,
} from "@/stores/slices/settingsSlice";
import {
  addTodo,
  deleteTodo,
  renameProgressValue,
  type Todo,
  updateTodo,
} from "@/stores/slices/todoSlice";

const DEFAULTS = new Set<string>(DEFAULT_PROGRESS_OPTIONS);
const UNASSIGNED = "__unassigned__";

const PROGRESS_COLOR: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  inprogress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "in progress": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "not started": "bg-muted text-muted-foreground",
};

function colorFor(p: string): string {
  return PROGRESS_COLOR[p.toLowerCase()] ?? "bg-violet-500/15 text-violet-600 dark:text-violet-400";
}

function Card({
  todo,
  compact,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  compact: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    data: { type: "todo", progress: todo.progress },
  });
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group rounded-md border border-border bg-card text-sm shadow-sm",
        isDragging && "opacity-30",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-start justify-between gap-1 px-2 pt-2 touch-none cursor-grab active:cursor-grabbing"
      >
        <span className="line-clamp-3 wrap-break-word flex-1">
          {todo.title || <span className="text-muted-foreground">(untitled)</span>}
        </span>
        <div
          className="flex items-center opacity-0 group-hover:opacity-100 transition"
          onPointerDown={stop}
          onMouseDown={stop}
          onTouchStart={stop}
        >
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit task"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete task"
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      {compact ? (
        <div className="pb-2" />
      ) : (
        <div
          className="mt-1 flex flex-col gap-1 px-2 pb-2"
          onPointerDown={stop}
          onMouseDown={stop}
          onTouchStart={stop}
        >
          <div className="flex flex-wrap items-center gap-1">
            <PriorityCell id={todo.id} priority={todo.priority} />
            <ProgressCell id={todo.id} progress={todo.progress} />
          </div>
          <DateRangeCell id={todo.id} from={todo.completedFrom} to={todo.completedTo} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setThoughtOpen(true)}
            onMouseEnter={preloadThoughtEditor}
            onFocus={preloadThoughtEditor}
            onPointerDown={preloadThoughtEditor}
            className="h-7 w-full justify-start gap-1 px-2 text-xs font-normal text-muted-foreground"
          >
            <Lightbulb className="size-3.5" />
            {todo.thought ? "Thought" : "Add thought"}
          </Button>
        </div>
      )}
      <ThoughtDialog todo={todo} open={thoughtOpen} onOpenChange={setThoughtOpen} />
    </div>
  );
}

type DragHandle = {
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  listeners: ReturnType<typeof useSortable>["listeners"];
  attributes: ReturnType<typeof useSortable>["attributes"];
};

type ColumnProps = {
  id: string;
  label: string;
  todos: Todo[];
  isDefault: boolean;
  isOver: boolean;
  compact: boolean;
  dragHandle?: DragHandle;
  onAddCard: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onEditCard: (t: Todo) => void;
  onDeleteCard: (t: Todo) => void;
};

function DragHandleButton({ setActivatorNodeRef, listeners, attributes }: DragHandle) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag column"
      className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}

function ColumnBody({
  id,
  label,
  todos,
  isDefault,
  isOver,
  compact,
  dragHandle,
  onAddCard,
  onRename,
  onDelete,
  onEditCard,
  onDeleteCard,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({ id, data: { type: "column" } });
  return (
    <>
      <div className="flex items-center gap-1 px-2 py-1.5">
        {dragHandle && <DragHandleButton {...dragHandle} />}
        <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", colorFor(label))}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{todos.length}</span>
        <div className="flex-1" />
        {!isDefault && (onRename || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Column actions"
                  className="size-6"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem onClick={onRename}>
                  <Pencil className="size-3.5" /> Rename
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/40",
        )}
      >
        {todos.map((t) => (
          <Card
            key={t.id}
            todo={t}
            compact={compact}
            onEdit={() => onEditCard(t)}
            onDelete={() => onDeleteCard(t)}
          />
        ))}
      </div>
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddCard}
          className="w-full justify-start text-xs text-muted-foreground"
        >
          <Plus className="size-3.5" /> Add card
        </Button>
      </div>
    </>
  );
}

function StaticColumn(props: ColumnProps) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-md border border-border bg-muted/30">
      <ColumnBody {...props} />
    </div>
  );
}

function SortableColumn(props: ColumnProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id, data: { type: "column" } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-md border border-border bg-muted/30",
        isDragging && "opacity-50",
      )}
    >
      <ColumnBody {...props} dragHandle={{ setActivatorNodeRef, listeners, attributes }} />
    </div>
  );
}

export function BoardView({ from, to }: { from?: number; to?: number } = {}) {
  const dispatch = useAppDispatch();
  const options = useAppSelector((s) => s.settings.progressOptions);
  const compact = useAppSelector((s) => s.settings.boardCompact);
  const file = useAppSelector((s) => s.todos.files.find((f) => f.id === s.todos.activeFileId));
  const allTodos = useMemo(() => file?.todos ?? [], [file]);
  const todos = useMemo(() => {
    if (from === undefined || to === undefined) {
      return allTodos;
    }
    return allTodos.filter((t) => t.completedFrom <= to && t.completedTo >= from);
  }, [allTodos, from, to]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"todo" | "column" | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState>({ open: false, title: "" });
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const groups = useMemo(() => {
    const map = new Map<string, Todo[]>();
    map.set(UNASSIGNED, []);
    for (const p of options) {
      map.set(p, []);
    }
    for (const t of todos) {
      const key = t.progress && map.has(t.progress) ? t.progress : UNASSIGNED;
      map.get(key)!.push(t);
    }
    return map;
  }, [options, todos]);

  const activeTodo =
    activeType === "todo" && activeId ? todos.find((t) => t.id === activeId) : null;
  const activeColumnLabel = activeType === "column" && activeId ? activeId : null;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const type = (e.active.data.current?.type as "todo" | "column" | undefined) ?? null;
    setActiveId(id);
    setActiveType(type);
  };
  const onDragOver = (e: DragOverEvent) => {
    if (activeType === "column") {
      return;
    }
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) {
      setOverColId(null);
      return;
    }
    if (groups.has(overId)) {
      setOverColId(overId);
    } else {
      const todo = todos.find((t) => t.id === overId);
      setOverColId(todo ? (todo.progress ?? UNASSIGNED) : null);
    }
  };
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    const type = activeType;
    setActiveId(null);
    setActiveType(null);
    setOverColId(null);
    if (!overId) {
      return;
    }

    if (type === "column") {
      if (overId === UNASSIGNED || id === overId) {
        return;
      }
      if (!options.includes(id) || !options.includes(overId)) {
        return;
      }
      dispatch(reorderProgressOption({ from: id, to: overId }));
      return;
    }

    let targetCol: string;
    if (groups.has(overId)) {
      targetCol = overId;
    } else {
      const overTodo = todos.find((t) => t.id === overId);
      if (!overTodo) {
        return;
      }
      targetCol = overTodo.progress ?? UNASSIGNED;
    }
    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return;
    }
    const currentCol = todo.progress && groups.has(todo.progress) ? todo.progress : UNASSIGNED;
    if (currentCol === targetCol) {
      return;
    }
    const nextProgress = targetCol === UNASSIGNED ? null : targetCol;
    dispatch(updateTodo({ id, progress: nextProgress }));
  };

  const addCard = (progress: string | null) => {
    setPrompt({
      open: true,
      title: "Add card",
      placeholder: "Task title",
      confirmLabel: "Add",
      onConfirm: (title) => {
        const t = title.trim();
        if (!t) {
          return;
        }
        const action = addTodo(t, null);
        dispatch(action);
        if (progress !== null) {
          dispatch(updateTodo({ id: action.payload.id, progress }));
        }
      },
    });
  };

  const editCard = (todo: Todo) => {
    setPrompt({
      open: true,
      title: "Rename task",
      placeholder: "Task title",
      defaultValue: todo.title,
      confirmLabel: "Save",
      onConfirm: (title) => {
        const t = title.trim();
        if (!t || t === todo.title) {
          return;
        }
        dispatch(updateTodo({ id: todo.id, title: t }));
      },
    });
  };

  const deleteCard = (todo: Todo) => {
    setConfirm({
      open: true,
      title: "Delete task?",
      description: `"${todo.title || "(untitled)"}" will be permanently removed.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => dispatch(deleteTodo(todo.id)),
    });
  };

  const addColumn = () => {
    setPrompt({
      open: true,
      title: "Add column",
      placeholder: "Progress name",
      confirmLabel: "Add",
      onConfirm: (name) => {
        const v = name.trim();
        if (!v) {
          return;
        }
        dispatch(addProgressOption(v));
      },
    });
  };

  const renameColumn = (from: string) => {
    setPrompt({
      open: true,
      title: "Rename column",
      placeholder: "Progress name",
      defaultValue: from,
      confirmLabel: "Rename",
      onConfirm: (to) => {
        const next = to.trim();
        if (!next || next === from) {
          return;
        }
        dispatch(renameProgressOption({ from, to: next }));
        dispatch(renameProgressValue({ from, to: next }));
      },
    });
  };

  const deleteColumn = (name: string) => {
    const count = (groups.get(name) ?? []).length;
    setConfirm({
      open: true,
      title: `Delete column "${name}"?`,
      description:
        count > 0 ? `${count} task(s) will move to Unassigned.` : "This column will be removed.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        const colTodos = todos.filter((t) => t.progress === name);
        for (const t of colTodos) {
          dispatch(updateTodo({ id: t.id, progress: null }));
        }
        dispatch(removeProgressOption(name));
      },
    });
  };

  if (!file) {
    return <div className="text-sm text-muted-foreground">No active file.</div>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setActiveType(null);
          setOverColId(null);
        }}
      >
        <div className="-mx-3 overflow-x-auto px-3 pb-2">
          <div className="flex h-[calc(100vh-150px)] min-h-[420px] items-stretch gap-3 w-max">
            <StaticColumn
              id={UNASSIGNED}
              label="Unassigned"
              todos={groups.get(UNASSIGNED) ?? []}
              isDefault
              isOver={overColId === UNASSIGNED}
              compact={compact}
              onAddCard={() => addCard(null)}
              onEditCard={editCard}
              onDeleteCard={deleteCard}
            />
            <SortableContext items={options} strategy={horizontalListSortingStrategy}>
              {options.map((p) => {
                const isDef = DEFAULTS.has(p);
                return (
                  <SortableColumn
                    key={p}
                    id={p}
                    label={p}
                    todos={groups.get(p) ?? []}
                    isDefault={isDef}
                    isOver={overColId === p}
                    compact={compact}
                    onAddCard={() => addCard(p)}
                    onRename={isDef ? undefined : () => renameColumn(p)}
                    onDelete={isDef ? undefined : () => deleteColumn(p)}
                    onEditCard={editCard}
                    onDeleteCard={deleteCard}
                  />
                );
              })}
            </SortableContext>
            <Button
              variant="outline"
              size="sm"
              onClick={addColumn}
              className="h-9 shrink-0 text-xs"
            >
              <Plus className="size-3.5" /> Add column
            </Button>
          </div>
        </div>
        <DragOverlay>
          {activeTodo ? (
            <div className="w-72 rounded-md border border-border bg-card p-2 text-sm shadow-lg">
              <span className="line-clamp-3 wrap-break-word">
                {activeTodo.title || <span className="text-muted-foreground">(untitled)</span>}
              </span>
            </div>
          ) : null}
          {activeColumnLabel ? (
            <div className="w-72 rounded-md border border-border bg-muted/60 p-2 text-xs font-medium shadow-lg">
              <span className={cn("rounded-md px-1.5 py-0.5", colorFor(activeColumnLabel))}>
                {activeColumnLabel}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <PromptDialog state={prompt} onOpenChange={(open) => setPrompt((s) => ({ ...s, open }))} />
      <ConfirmDialog state={confirm} onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))} />
    </>
  );
}
