"use client";

import {
  CalendarClock,
  CalendarIcon,
  ChevronDown,
  Lightbulb,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useConfirm } from "@/components/customs/ConfirmDialog";
import { CopyApiUrlButton } from "@/components/customs/CopyApiUrlButton";
import { RefreshThoughtButton } from "@/components/customs/RefreshThoughtButton";
import { ThoughtComments } from "@/components/customs/ThoughtComments";
import { TokenCount } from "@/components/customs/TokenCount";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu-extras";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdoptSavedThought } from "@/hooks/useAdoptSavedThought";
import { useDraftSaver } from "@/hooks/useDraftSaver";
import { useThoughtDialogOpen } from "@/hooks/useThoughtDialogOpen";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { deleteTodo, type Todo, updateTodo } from "@/stores/slices/todoSlice";

const loadThoughtEditorModule = () => import("@/components/customs/ThoughtEditor");

export function preloadThoughtEditor() {
  void loadThoughtEditorModule();
}

const ThoughtEditor = dynamic(() => loadThoughtEditorModule().then((m) => m.ThoughtEditor), {
  ssr: false,
  loading: () => <div className="min-h-40 px-3 py-2 text-sm text-app-dim">Loading editor…</div>,
});

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function to12(h24: number): { h12: number; ampm: "AM" | "PM" } {
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return { h12, ampm };
}

function to24(h12: number, ampm: "AM" | "PM"): number {
  const h = h12 % 12;
  return ampm === "PM" ? h + 12 : h;
}

function fmtTime12(d: Date): string {
  const { h12, ampm } = to12(d.getHours());
  return `${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

function withDate(base: Date, day: Date): Date {
  const x = new Date(base);
  x.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return x;
}

function withTimeParts(base: Date, h24: number, m: number): Date {
  const x = new Date(base);
  x.setHours(h24, m, 0, 0);
  return x;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function NumberDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        itemRefs.current.get(value)?.scrollIntoView({ block: "center" });
      });
    }
  }, [open, value]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={ariaLabel}
          className="h-8 w-16 justify-between gap-1 px-2 text-sm font-medium tabular-nums"
        >
          {pad(value)}
          <ChevronDown className="size-3 text-app-dim" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-56 w-16 min-w-0 overflow-y-auto p-1">
        {options.map((n) => (
          <DropdownMenuItem
            key={n}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(n, el);
              } else {
                itemRefs.current.delete(n);
              }
            }}
            onClick={() => onChange(n)}
            className={cn(
              "justify-center tabular-nums",
              n === value && "bg-app-hover text-app-bright",
            )}
          >
            {pad(n)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AmPmToggle({
  value,
  onChange,
}: {
  value: "AM" | "PM";
  onChange: (v: "AM" | "PM") => void;
}) {
  return (
    <div className="inline-flex h-8 overflow-hidden rounded-md border border-app-border text-xs font-medium">
      {(["AM", "PM"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "w-8 transition-colors",
            value === v
              ? "bg-app-accent text-app-on-solid"
              : "bg-app-bg text-app-dim hover:bg-app-sidebar",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function TimeDropdowns({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const { h12, ampm } = to12(value.getHours());
  const min = value.getMinutes();
  return (
    <div className="inline-flex items-center gap-1.5">
      <NumberDropdown
        ariaLabel="Hour"
        value={h12}
        options={HOURS}
        onChange={(v) => onChange(withTimeParts(value, to24(v, ampm), min))}
      />
      <span className="text-sm font-medium text-app-dim">:</span>
      <NumberDropdown
        ariaLabel="Minute"
        value={min}
        options={MINUTES}
        onChange={(v) => onChange(withTimeParts(value, value.getHours(), v))}
      />
      <AmPmToggle
        value={ampm}
        onChange={(v) => onChange(withTimeParts(value, to24(h12, v), min))}
      />
    </div>
  );
}

function DatePicker({
  label,
  value,
  onChange,
  clearable = false,
  placeholder = "Pick a date",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  clearable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value === null ? null : new Date(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-medium text-app-dim">
        <span>{label}</span>
        {clearable && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-app-dim hover:text-app-bright"
          >
            Clear
          </button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-full justify-start gap-2 px-3 font-normal",
              date === null && "text-app-dim",
            )}
          >
            <CalendarIcon className="size-4" />
            {date === null ? placeholder : `${fmtDate(date)} ${fmtTime12(date)}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={(d) => {
              if (!d) {
                return;
              }
              const base = date ?? new Date();
              onChange(withDate(base, d).getTime());
            }}
            defaultMonth={date ?? new Date()}
          />
          <div className="flex items-center justify-between gap-2 border-t border-app-border px-3 py-2.5">
            <span className="text-xs text-app-dim">Time</span>
            <TimeDropdowns
              value={date ?? new Date()}
              onChange={(next) => onChange(next.getTime())}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EditDatesDialog({
  todo,
  open,
  onOpenChange,
}: {
  todo: Todo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const [createdAt, setCreatedAt] = useState<number | null>(todo.createdAt);
  const [doneAt, setDoneAt] = useState<number | null>(todo.doneAt);
  const [completedFrom, setCompletedFrom] = useState<number | null>(todo.completedFrom);
  const [completedTo, setCompletedTo] = useState<number | null>(todo.completedTo);

  const reset = () => {
    setCreatedAt(todo.createdAt);
    setDoneAt(todo.doneAt);
    setCompletedFrom(todo.completedFrom);
    setCompletedTo(todo.completedTo);
  };

  const save = () => {
    if (createdAt === null || completedFrom === null || completedTo === null) {
      return;
    }
    dispatch(
      updateTodo({
        id: todo.id,
        createdAt,
        doneAt,
        completedFrom,
        completedTo,
      }),
    );
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent onClick={(e) => e.stopPropagation()} className="w-[min(448px,92vw)]">
        <DialogHeader>
          <DialogTitle>Edit dates</DialogTitle>
          <DialogDescription className="sr-only">Edit this task's dates</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DatePicker label="Created" value={createdAt} onChange={setCreatedAt} />
          <DatePicker
            label="Done at"
            value={doneAt}
            onChange={setDoneAt}
            clearable
            placeholder="Not done"
          />
          <DatePicker label="Complete from" value={completedFrom} onChange={setCompletedFrom} />
          <DatePicker label="Complete to" value={completedTo} onChange={setCompletedTo} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={createdAt === null || completedFrom === null || completedTo === null}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThoughtForm({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(todo.thought ?? "");
  const [editorReady, setEditorReady] = useState(false);
  const editorKey = useAdoptSavedThought(todo.id, todo.thought ?? "", value, setValue);

  useEffect(() => {
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(() => setEditorReady(true));
    }, 320);
    return () => {
      window.clearTimeout(timeoutId);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const save = () => {
    dispatch(updateTodo({ id: todo.id, thought: value }));
    onClose();
  };

  // "Copy context" saves the draft first (the dialog stays open), so the
  // copy reads what is on screen.
  useDraftSaver(todo.id, () => {
    if (value !== (todo.thought ?? "")) {
      dispatch(updateTodo({ id: todo.id, thought: value }));
    }
  });

  return (
    <>
      <DialogHeader showCloseButton={false}>
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="truncate">
            Thought on{" "}
            <span className="rounded bg-app-accent-faint px-1.5 py-0.5 text-app-accent">
              {todo.title?.trim() || "(untitled)"}
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <RefreshThoughtButton showLabel data-testid="thought-refresh-button" />
            <CopyApiUrlButton todoId={todo.id} showLabel />
            <TokenCount text={value} data-testid="thought-token-count" />
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
        <DialogDescription className="sr-only">Write a note for this task</DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-auto">
        <div className=" bg-app-bg">
          {editorReady ? (
            <>
              <ThoughtEditor key={editorKey} markdown={value} onChange={setValue} />
              <div className="border-t border-app-border">
                <ThoughtComments todo={todo} />
              </div>
            </>
          ) : (
            <div className="min-h-40 px-3 py-2 text-sm text-app-dim">Loading editor…</div>
          )}
        </div>
      </div>
    </>
  );
}

export function ThoughtDialog({
  todo,
  open,
  onOpenChange,
}: {
  todo: Todo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-[90vw] translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 sm:w-[min(960px,90vw)]"
      >
        {open && <ThoughtForm todo={todo} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export function TodoRowActions({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [thoughtOpen, setThoughtOpen] = useThoughtDialogOpen(id);
  const todo = useAppSelector((s) => {
    const f = s.todos.files.find((x) => x.id === s.todos.activeFileId);
    return f?.todos.find((t) => t.id === id) ?? null;
  });

  if (!todo) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => e.stopPropagation()}
            aria-label="Row options"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => setThoughtOpen(true)}
            onMouseEnter={preloadThoughtEditor}
            onFocus={preloadThoughtEditor}
            onPointerDown={preloadThoughtEditor}
          >
            <Lightbulb />
            Thought
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <CalendarClock />
            Edit dates
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              confirm({
                title: "Delete task?",
                description: `"${todo.title || "(untitled)"}" will be permanently removed.`,
                confirmLabel: "Delete",
                destructive: true,
                onConfirm: () => dispatch(deleteTodo(id)),
              })
            }
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditDatesDialog todo={todo} open={dialogOpen} onOpenChange={setDialogOpen} />
      <ThoughtDialog todo={todo} open={thoughtOpen} onOpenChange={setThoughtOpen} />
    </>
  );
}
