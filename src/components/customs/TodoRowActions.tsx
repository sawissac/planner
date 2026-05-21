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

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { deleteTodo, type Todo, updateTodo } from "@/stores/slices/todoSlice";

const loadThoughtEditorModule = () => import("@/components/customs/ThoughtEditor");

export function preloadThoughtEditor() {
  void loadThoughtEditorModule();
}

const ThoughtEditor = dynamic(() => loadThoughtEditorModule().then((m) => m.ThoughtEditor), {
  ssr: false,
  loading: () => (
    <div className="min-h-40 px-3 py-2 text-sm text-muted-foreground">Loading editor…</div>
  ),
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
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className="h-8 w-16 justify-between gap-1 px-2 text-sm font-medium tabular-nums"
          >
            {pad(value)}
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        }
      />
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
              n === value && "bg-accent text-accent-foreground",
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
    <div className="inline-flex h-8 overflow-hidden rounded-md border border-border text-xs font-medium">
      {(["AM", "PM"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "w-8 transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
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
      <span className="text-sm font-medium text-muted-foreground">:</span>
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
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {clearable && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 w-full justify-start gap-2 px-3 font-normal",
                date === null && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-4" />
              {date === null ? placeholder : `${fmtDate(date)} ${fmtTime12(date)}`}
            </Button>
          }
        />
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
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Time</span>
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
      <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit dates</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
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

  return (
    <>
      <DrawerHeader className="flex flex-row items-center justify-between gap-2 border-b border-border">
        <DrawerTitle className="truncate">
          Thought on{" "}
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {todo.title?.trim() || "(untitled)"}
          </span>
        </DrawerTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </div>
      </DrawerHeader>
      <div className="flex-1 overflow-auto">
        <div className=" bg-background">
          {editorReady ? (
            <ThoughtEditor markdown={value} onChange={setValue} />
          ) : (
            <div className="min-h-40 px-3 py-2 text-sm text-muted-foreground">Loading editor…</div>
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
    <Drawer direction="right" open={open} onOpenChange={onOpenChange} handleOnly>
      <DrawerContent
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw]! max-w-[90vw]! sm:w-auto! sm:max-w-[min(960px,90vw)]!"
      >
        {open && <ThoughtForm todo={todo} onClose={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  );
}

export function TodoRowActions({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [thoughtOpen, setThoughtOpen] = useState(false);
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
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
              aria-label="Row options"
            >
              <MoreHorizontal />
            </Button>
          }
        />
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
          <DropdownMenuItem variant="destructive" onClick={() => dispatch(deleteTodo(id))}>
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
