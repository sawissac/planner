"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowDown10,
  ArrowDownZA,
  ArrowUp,
  ArrowUp01,
  ArrowUpAZ,
  ArrowUpDown,
  CalendarArrowDown,
  CalendarArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  FileDown,
  Filter,
  Folder,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  addTodo,
  createGroup,
  deleteGroup,
  deleteTodo,
  renameGroup,
  reorder,
  toggleTodo,
  updateTodo,
  type Group,
  type Todo,
} from "@/lib/todoSlice";
import type { User } from "@/lib/userSlice";
import {
  FONT_VAR,
  setColumnSizing,
  setGlobalFilter as setPersistedGlobalFilter,
  setGroupFilter as setPersistedGroupFilter,
  setPageSize as setPersistedPageSize,
  setPriorityFilter as setPersistedPriorityFilter,
  setProgressFilter as setPersistedProgressFilter,
  setSorting as setPersistedSorting,
  type FontSize,
  type FontWeight,
} from "@/lib/settingsSlice";
import { cn } from "@/lib/utils";
import { useTouchRowDrag } from "@/lib/use-touch-row-drag";
import { DateRangeCell } from "@/components/date-range-cell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityCell } from "@/components/priority-cell";
import { ProgressCell } from "@/components/progress-cell";
import { AssigneeCell } from "@/components/assignee-cell";
import { TodoRowActions } from "@/components/todo-row-actions";
import { PromptDialog, type PromptState } from "@/components/prompt-dialog";

function fmtDateOnly(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function todosToMarkdownTable(
  rows: Todo[],
  groups: Group[],
  userNameById: (id: string) => string,
): string {
  const header = [
    "Done",
    "Task",
    "Priority",
    "Progress",
    "Group",
    "Assignees",
    "From",
    "To",
  ];
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
  ];
  for (const t of rows) {
    const g = groups.find((x) => x.id === t.groupId)?.name ?? "";
    const a = t.assignees.map(userNameById).filter(Boolean).join(", ");
    lines.push(
      `| ${t.done ? "x" : " "} | ${(t.title || "").replace(/\|/g, "\\|")} | ${t.priority ?? ""} | ${t.progress ?? ""} | ${g} | ${a} | ${fmtDateOnly(t.completedFrom)} | ${fmtDateOnly(t.completedTo)} |`,
    );
  }
  return lines.join("\n");
}

function todosToMarkdownChecklist(rows: Todo[]): string {
  return rows
    .map((t) => `- [${t.done ? "x" : " "}] ${t.title}`)
    .join("\n");
}

function todosToCsv(
  rows: Todo[],
  groups: Group[],
  userNameById: (id: string) => string,
): string {
  const header = [
    "done",
    "title",
    "priority",
    "progress",
    "group",
    "assignees",
    "completedFrom",
    "completedTo",
    "createdAt",
    "doneAt",
  ];
  const out = [header.join(",")];
  for (const t of rows) {
    const g = groups.find((x) => x.id === t.groupId)?.name ?? "";
    const a = t.assignees.map(userNameById).filter(Boolean).join("; ");
    out.push(
      [
        t.done ? "true" : "false",
        t.title,
        t.priority ?? "",
        t.progress ?? "",
        g,
        a,
        fmtDateOnly(t.completedFrom),
        fmtDateOnly(t.completedTo),
        fmtDateOnly(t.createdAt),
        fmtDateOnly(t.doneAt),
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  return out.join("\n");
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      ta.remove();
    }
  }
}

type RowMeta = {
  editingId: string | null;
  draft: string;
  setEditing: (id: string | null) => void;
  setDraft: (v: string) => void;
  commit: () => void;
  fontFamily: string;
  fontSize: FontSize;
  fontWeight: FontWeight;
  sorting: SortingState;
  setSort: (id: string, desc: boolean | null) => void;
  focusMode: boolean;
};

type SortOption = { label: string; desc: boolean; icon: React.ReactNode };

function SortDropdown({
  label,
  colId,
  options,
  sorting,
  setSort,
}: {
  label: string;
  colId: string;
  options: SortOption[];
  sorting: SortingState;
  setSort: (id: string, desc: boolean | null) => void;
}) {
  const active = sorting.find((s) => s.id === colId) ?? null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {label}
            {active ? (
              active.desc ? (
                <ArrowDown className="size-3" />
              ) : (
                <ArrowUp className="size-3" />
              )
            ) : (
              <ArrowUpDown className="size-3 opacity-40" />
            )}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem
            key={String(opt.desc)}
            onClick={() => setSort(colId, opt.desc)}
            className="flex items-center gap-2"
          >
            <span className="text-muted-foreground [&_svg]:size-3.5">
              {opt.icon}
            </span>
            <span className="flex-1">{opt.label}</span>
            {active?.desc === opt.desc && <Check className="size-3 ml-auto" />}
          </DropdownMenuItem>
        ))}
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSort(colId, null)}
              className="text-muted-foreground"
            >
              Clear sort
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TitleCell({ todo, meta }: { todo: Todo; meta: RowMeta }) {
  const editing = meta.editingId === todo.id;
  const style = {
    fontFamily: meta.fontFamily,
    fontSize: `${meta.fontSize}px`,
    fontWeight: meta.fontWeight,
  };
  if (editing) {
    return (
      <input
        autoFocus
        value={meta.draft}
        onChange={(e) => meta.setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            meta.commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            meta.setEditing(null);
          }
          e.stopPropagation();
        }}
        onBlur={meta.commit}
        style={style}
        className="w-full rounded-md border border-border bg-background p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    );
  }
  return (
    <span
      style={style}
      onDoubleClick={() => {
        meta.setDraft(todo.title);
        meta.setEditing(todo.id);
      }}
      className={cn(
        "block leading-tight cursor-default",
        meta.focusMode ? "whitespace-nowrap" : "truncate",
        todo.done && "text-muted-foreground line-through",
      )}
    >
      {todo.title}
    </span>
  );
}

function GroupFilterHeader({
  groups,
  value,
  onChange,
}: {
  groups: Group[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const active = value !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Group
            <Filter
              className={cn("size-3", active ? "text-primary" : "opacity-40")}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-center gap-2"
        >
          <span className="flex-1">All groups</span>
          {value === null && <Check className="size-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("__none__")}
          className="flex items-center gap-2"
        >
          <span className="flex-1 text-muted-foreground">No group</span>
          {value === "__none__" && <Check className="size-3" />}
        </DropdownMenuItem>
        {groups.length > 0 && <DropdownMenuSeparator />}
        {groups.map((g) => (
          <DropdownMenuItem
            key={g.id}
            onClick={() => onChange(g.id)}
            className="flex items-center gap-2"
          >
            <Folder className="size-3 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">{g.name}</span>
            {value === g.id && <Check className="size-3 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityFilterHeader({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const active = value !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Priority
            <Filter
              className={cn("size-3", active ? "text-primary" : "opacity-40")}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-center gap-2"
        >
          <span className="flex-1">All priorities</span>
          {value === null && <Check className="size-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("__none__")}
          className="flex items-center gap-2"
        >
          <span className="flex-1 text-muted-foreground">No priority</span>
          {value === "__none__" && <Check className="size-3" />}
        </DropdownMenuItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onChange(p)}
            className="flex items-center gap-2"
          >
            <span className="flex-1 truncate">{p}</span>
            {value === p && <Check className="size-3 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProgressFilterHeader({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const active = value !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Progress
            <Filter
              className={cn("size-3", active ? "text-primary" : "opacity-40")}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-center gap-2"
        >
          <span className="flex-1">All progress</span>
          {value === null && <Check className="size-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange("__none__")}
          className="flex items-center gap-2"
        >
          <span className="flex-1 text-muted-foreground">No progress</span>
          {value === "__none__" && <Check className="size-3" />}
        </DropdownMenuItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onChange(p)}
            className="flex items-center gap-2"
          >
            <span className="flex-1 truncate">{p}</span>
            {value === p && <Check className="size-3 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupCell({ todo, groups }: { todo: Todo; groups: Group[] }) {
  const dispatch = useAppDispatch();
  const currentGroup = groups.find((g) => g.id === todo.groupId) ?? null;
  const [prompt, setPrompt] = useState<PromptState>({ open: false, title: "" });

  const openNewGroup = () =>
    setPrompt({
      open: true,
      title: "New group",
      placeholder: "Group name",
      confirmLabel: "Create",
      onConfirm: (name) => {
        const action = dispatch(createGroup(name));
        dispatch(updateTodo({ id: todo.id, groupId: action.payload.id }));
      },
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-full justify-between gap-1 px-2 text-xs font-normal"
            >
              {currentGroup ? (
                <span className="flex items-center gap-1 truncate">
                  <Folder className="size-3 shrink-0 text-muted-foreground" />
                  {currentGroup.name}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => dispatch(updateTodo({ id: todo.id, groupId: null }))}
            className="flex items-center gap-2"
          >
            <span className="flex-1 text-muted-foreground">No group</span>
            {!todo.groupId && <Check className="size-3" />}
          </DropdownMenuItem>
          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((g) => (
            <DropdownMenuItem
              key={g.id}
              onClick={() =>
                dispatch(updateTodo({ id: todo.id, groupId: g.id }))
              }
              className="flex items-center gap-2"
            >
              <Folder className="size-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{g.name}</span>
              {todo.groupId === g.id && <Check className="size-3 shrink-0" />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrompt({
                    open: true,
                    title: "Rename group",
                    placeholder: "Group name",
                    defaultValue: g.name,
                    confirmLabel: "Rename",
                    onConfirm: (name) => {
                      dispatch(renameGroup({ id: g.id, name }));
                    },
                  });
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Rename ${g.name}`}
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(deleteGroup(g.id));
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${g.name}`}
              >
                <Trash2 className="size-3" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={openNewGroup}
            className="flex items-center gap-2"
          >
            <Plus className="size-3 shrink-0 text-muted-foreground" />
            <span>New group…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog
        state={prompt}
        onOpenChange={(open) => setPrompt((s) => ({ ...s, open }))}
      />
    </>
  );
}

function BulkActionBar({
  count,
  total,
  groups,
  priorities,
  progressOptions,
  users,
  assigneeState,
  onClear,
  onSelectAll,
  onDelete,
  onMarkDone,
  onMarkUndone,
  onSetGroup,
  onSetPriority,
  onSetProgress,
  onToggleAssignee,
  onClearAssignees,
  onCopyMarkdown,
  onCopyChecklist,
  onCopyCsv,
}: {
  count: number;
  total: number;
  groups: Group[];
  priorities: string[];
  progressOptions: string[];
  users: User[];
  assigneeState: Record<string, "all" | "some" | "none">;
  onClear: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  onMarkDone: () => void;
  onMarkUndone: () => void;
  onSetGroup: (groupId: string | null) => void;
  onSetPriority: (priority: string | null) => void;
  onSetProgress: (progress: string | null) => void;
  onToggleAssignee: (userId: string) => void;
  onClearAssignees: () => void;
  onCopyMarkdown: () => void;
  onCopyChecklist: () => void;
  onCopyCsv: () => void;
}) {
  const allSelected = count >= total && total > 0;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full border border-border bg-popover/95 backdrop-blur px-1.5 py-1 shadow-lg max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={allSelected ? onClear : onSelectAll}
        className="rounded-full px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors tabular-nums"
        title={allSelected ? "Clear selection" : `Select all ${total}`}
      >
        <span className="text-primary">{count}</span>
        <span className="text-muted-foreground"> / {total}</span>
      </button>
      <div className="h-4 w-px bg-border mx-0.5" />
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onMarkDone}
        aria-label="Mark done"
        title="Mark done"
        className="rounded-full"
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onMarkUndone}
        aria-label="Reopen"
        title="Reopen"
        className="rounded-full"
      >
        <Check className="size-3.5 opacity-40" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete selected"
        className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
      <div className="h-4 w-px bg-border mx-0.5" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="More bulk actions"
              title="More actions"
              className="rounded-full"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem
            onClick={onSelectAll}
            disabled={allSelected}
          >
            <Check className="size-3.5" />
            Select all visible
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub label="Set group" icon={<Folder className="size-3.5" />}>
            <DropdownMenuItem onClick={() => onSetGroup(null)}>
              <span className="text-muted-foreground">No group</span>
            </DropdownMenuItem>
            {groups.length > 0 && <DropdownMenuSeparator />}
            {groups.map((g) => (
              <DropdownMenuItem key={g.id} onClick={() => onSetGroup(g.id)}>
                <Folder className="size-3.5 text-muted-foreground" />
                <span className="truncate">{g.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSub>
          <DropdownMenuSub label="Set priority" icon={<Filter className="size-3.5" />}>
            <DropdownMenuItem onClick={() => onSetPriority(null)}>
              <span className="text-muted-foreground">No priority</span>
            </DropdownMenuItem>
            {priorities.length > 0 && <DropdownMenuSeparator />}
            {priorities.map((p) => (
              <DropdownMenuItem key={p} onClick={() => onSetPriority(p)}>
                {p}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSub>
          <DropdownMenuSub label="Set progress" icon={<Filter className="size-3.5" />}>
            <DropdownMenuItem onClick={() => onSetProgress(null)}>
              <span className="text-muted-foreground">No progress</span>
            </DropdownMenuItem>
            {progressOptions.length > 0 && <DropdownMenuSeparator />}
            {progressOptions.map((p) => (
              <DropdownMenuItem key={p} onClick={() => onSetProgress(p)}>
                {p}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSub>
          <DropdownMenuSub label="Assign" icon={<Users className="size-3.5" />}>
            {users.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">No users</span>
              </DropdownMenuItem>
            ) : (
              users.map((u) => {
                const state = assigneeState[u.id] ?? "none";
                return (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleAssignee(u.id);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-3.5",
                        state === "all"
                          ? "opacity-100"
                          : state === "some"
                            ? "opacity-50"
                            : "opacity-0",
                      )}
                    />
                    <span className="truncate">{u.name || "Unnamed"}</span>
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearAssignees}>
              <X className="size-3.5" />
              Clear assignees
            </DropdownMenuItem>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCopyChecklist}>
            <ClipboardCopy className="size-3.5" />
            Copy tasks as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyMarkdown}>
            <ClipboardCopy className="size-3.5" />
            Copy as Markdown table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyCsv}>
            <FileDown className="size-3.5" />
            Copy as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection"
        className="rounded-full"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function DropdownMenuSub({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="flex w-full select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            <ChevronRight className="size-3.5 opacity-60" />
          </button>
        }
      />
      <DropdownMenuContent side="right" align="start" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TodoTable() {
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const usersList = useAppSelector((s) => s.users.users);
  const tableFont = useAppSelector((s) => s.settings.tableFont);
  const titleFontSize = useAppSelector((s) => s.settings.titleFontSize);
  const titleFontWeight = useAppSelector((s) => s.settings.titleFontWeight);
  const persistedSizing = useAppSelector((s) => s.settings.columnSizing);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const globalFilter = useAppSelector((s) => s.settings.globalFilter);
  const groupFilter = useAppSelector((s) => s.settings.groupFilter);
  const priorityFilter = useAppSelector((s) => s.settings.priorityFilter);
  const priorityOptions = useAppSelector((s) => s.settings.priorityOptions);
  const progressFilter = useAppSelector((s) => s.settings.progressFilter);
  const progressOptions = useAppSelector((s) => s.settings.progressOptions);
  const sorting = useAppSelector((s) => s.settings.sorting) as SortingState;
  const persistedPageSize = useAppSelector((s) => s.settings.pageSize);
  const dispatch = useAppDispatch();
  const setGlobalFilter = useCallback(
    (updater: string | ((prev: string) => string)) => {
      const next =
        typeof updater === "function" ? updater(globalFilter) : updater;
      dispatch(setPersistedGlobalFilter(next));
    },
    [dispatch, globalFilter],
  );
  const setSorting = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      dispatch(setPersistedSorting(next));
    },
    [dispatch, sorting],
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: persistedPageSize,
  });
  useEffect(() => {
    if (pagination.pageSize !== persistedPageSize) {
      dispatch(setPersistedPageSize(pagination.pageSize));
    }
  }, [pagination.pageSize, persistedPageSize, dispatch]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const {
    touchDragId,
    touchOverId,
    start: startTouchDrag,
  } = useTouchRowDrag((from, to) =>
    dispatch(reorder({ fromId: from, toId: to })),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (focusMode && selected.size > 0) setSelected(new Set());
  }, [focusMode, selected.size]);
  const [draft, setDraft] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const todos = useMemo(() => activeFile?.todos ?? [], [activeFile]);
  const groups = useMemo(() => activeFile?.groups ?? [], [activeFile]);
  const fontFamily = FONT_VAR[tableFont];

  const commitEdit = () => {
    if (!editingId) return;
    const t = draft.trim();
    const current = todos.find((x) => x.id === editingId);
    if (t && current && t !== current.title) {
      dispatch(updateTodo({ id: editingId, title: t }));
    }
    setEditingId(null);
  };

  const setSort = useCallback(
    (id: string, desc: boolean | null) => {
      setSorting((prev) => {
        if (desc === null) return prev.filter((s) => s.id !== id);
        const existing = prev.find((s) => s.id === id);
        if (existing)
          return prev.map((s) => (s.id === id ? { ...s, desc } : s));
        return [...prev, { id, desc }];
      });
    },
    [setSorting],
  );

  const filteredByGroup = useMemo(() => {
    if (groupFilter === null) return todos;
    if (groupFilter === "__none__") return todos.filter((t) => !t.groupId);
    return todos.filter((t) => t.groupId === groupFilter);
  }, [todos, groupFilter]);

  const filteredByPriority = useMemo(() => {
    if (priorityFilter === null) return filteredByGroup;
    if (priorityFilter === "__none__")
      return filteredByGroup.filter((t) => !t.priority);
    return filteredByGroup.filter((t) => t.priority === priorityFilter);
  }, [filteredByGroup, priorityFilter]);

  const filteredByProgress = useMemo(() => {
    if (progressFilter === null) return filteredByPriority;
    if (progressFilter === "__none__")
      return filteredByPriority.filter((t) => !t.progress);
    return filteredByPriority.filter((t) => t.progress === progressFilter);
  }, [filteredByPriority, progressFilter]);

  const sortedTodos = useMemo(() => {
    if (sorting.length === 0) return filteredByProgress;
    return [...filteredByProgress].sort((a, b) => {
      for (const { id, desc } of sorting) {
        let cmp = 0;
        if (id === "title") cmp = a.title.localeCompare(b.title);
        else if (id === "assignees")
          cmp = a.assignees.length - b.assignees.length;
        else if (id === "completedIn") cmp = a.completedFrom - b.completedFrom;
        if (cmp !== 0) return desc ? -cmp : cmp;
      }
      return 0;
    });
  }, [filteredByProgress, sorting]);

  const meta: RowMeta = {
    editingId,
    draft,
    focusMode,
    setEditing: setEditingId,
    setDraft,
    commit: commitEdit,
    fontFamily,
    fontSize: titleFontSize,
    fontWeight: titleFontWeight,
    sorting,
    setSort,
  };

  const columns = useMemo<ColumnDef<Todo>[]>(
    () => [
      {
        id: "drag",
        header: "",
        size: 40,
        enableResizing: false,
        cell: () => (
          <GripVertical className="size-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        ),
      },
      {
        id: "select",
        header: () => {
          const ids = sortedTodos.map((t) => t.id);
          const allSelected =
            ids.length > 0 && ids.every((id) => selected.has(id));
          const someSelected =
            !allSelected && ids.some((id) => selected.has(id));
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={(checked) => {
                  setSelected(() =>
                    checked === true ? new Set(ids) : new Set(),
                  );
                }}
                aria-label="Select all"
              />
            </div>
          );
        },
        size: 40,
        enableResizing: false,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex">
            <Checkbox
              checked={selected.has(row.original.id)}
              onCheckedChange={(checked) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (checked === true) next.add(row.original.id);
                  else next.delete(row.original.id);
                  return next;
                });
              }}
              aria-label="Select row"
            />
          </div>
        ),
      },
      {
        id: "done",
        header: "",
        size: 40,
        enableResizing: false,
        cell: ({ row }) => (
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              dispatch(toggleTodo(row.original.id));
            }}
            className={cn(
              "size-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 cursor-pointer",
              row.original.done
                ? "bg-primary border-primary"
                : "border-muted-foreground/40 hover:border-primary",
            )}
          >
            <AnimatePresence initial={false}>
              {row.original.done && (
                <motion.span
                  key="check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -45 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                  className="flex items-center justify-center"
                >
                  <Check
                    className="size-3 text-primary-foreground"
                    strokeWidth={3}
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ),
      },
      {
        accessorKey: "title",
        header: ({ table }) => {
          const m = table.options.meta as RowMeta;
          return (
            <SortDropdown
              label="Tasks"
              colId="title"
              options={[
                { label: "A to Z", desc: false, icon: <ArrowUpAZ /> },
                { label: "Z to A", desc: true, icon: <ArrowDownZA /> },
              ]}
              sorting={m.sorting}
              setSort={m.setSort}
            />
          );
        },
        size: 400,
        minSize: 100,
        enableSorting: false,
        cell: ({ row, table }) => {
          const m = table.options.meta as RowMeta;
          return <TitleCell todo={row.original} meta={m} />;
        },
      },
      {
        id: "priority",
        header: () => (
          <PriorityFilterHeader
            options={priorityOptions}
            value={priorityFilter}
            onChange={(v) => {
              dispatch(setPersistedPriorityFilter(v));
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
        ),
        size: 200,
        minSize: 100,
        cell: ({ row }) => (
          <PriorityCell id={row.original.id} priority={row.original.priority} />
        ),
      },
      {
        id: "progress",
        header: () => (
          <ProgressFilterHeader
            options={progressOptions}
            value={progressFilter}
            onChange={(v) => {
              dispatch(setPersistedProgressFilter(v));
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
        ),
        size: 200,
        minSize: 100,
        cell: ({ row }) => (
          <ProgressCell id={row.original.id} progress={row.original.progress} />
        ),
      },
      {
        id: "group",
        header: () => (
          <GroupFilterHeader
            groups={groups}
            value={groupFilter}
            onChange={(v) => {
              dispatch(setPersistedGroupFilter(v));
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          />
        ),
        size: 200,
        minSize: 80,
        cell: ({ row }) => <GroupCell todo={row.original} groups={groups} />,
      },
      {
        id: "assignees",
        header: ({ table }) => {
          const m = table.options.meta as RowMeta;
          return (
            <SortDropdown
              label="Assignee"
              colId="assignees"
              options={[
                { label: "Fewest first", desc: false, icon: <ArrowUp01 /> },
                { label: "Most first", desc: true, icon: <ArrowDown10 /> },
              ]}
              sorting={m.sorting}
              setSort={m.setSort}
            />
          );
        },
        size: 200,
        minSize: 100,
        cell: ({ row }) => (
          <AssigneeCell
            id={row.original.id}
            assignees={row.original.assignees}
          />
        ),
      },
      {
        id: "completedIn",
        header: ({ table }) => {
          const m = table.options.meta as RowMeta;
          return (
            <SortDropdown
              label="Complete In"
              colId="completedIn"
              options={[
                {
                  label: "Oldest first",
                  desc: false,
                  icon: <CalendarArrowUp />,
                },
                {
                  label: "Newest first",
                  desc: true,
                  icon: <CalendarArrowDown />,
                },
              ]}
              sorting={m.sorting}
              setSort={m.setSort}
            />
          );
        },
        size: 330,
        minSize: 160,
        cell: ({ row }) => (
          <DateRangeCell
            id={row.original.id}
            from={row.original.completedFrom}
            to={row.original.completedTo}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <TodoRowActions id={row.original.id} />
          </div>
        ),
      },
    ],
    [
      dispatch,
      groups,
      groupFilter,
      priorityFilter,
      priorityOptions,
      progressFilter,
      progressOptions,
      selected,
      sortedTodos,
    ],
  );

  const table = useReactTable({
    data: sortedTodos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnSizing: persistedSizing,
      pagination,
      globalFilter,
      columnVisibility: { select: !focusMode },
    },
    onGlobalFilterChange: setGlobalFilter,
    meta,
    onPaginationChange: setPagination,
    onColumnSizingChange: (updater) => {
      const next: ColumnSizingState =
        typeof updater === "function" ? updater(persistedSizing) : updater;
      dispatch(setColumnSizing(next));
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;

  const pageStart = pagination.pageIndex * pagination.pageSize;
  const pageEnd = pageStart + pagination.pageSize;
  const paginatedRows = useMemo(
    () => filteredRows.slice(pageStart, pageEnd),
    [filteredRows, pageStart, pageEnd],
  );
  const canPrev = pagination.pageIndex > 0;
  const canNext = pageEnd < filteredRows.length;
  const todoCount = filteredRows.length;

  const rowVirtualizer = useVirtualizer({
    count: paginatedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 41,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        virtualItems[virtualItems.length - 1].end
      : 0;

  // Refocus row when editing exits
  useEffect(() => {
    if (editingId === null && focusedId) {
      rowRefs.current.get(focusedId)?.focus();
    }
  }, [editingId, focusedId]);

  const handleRowKey = (e: React.KeyboardEvent, todo: Todo, index: number) => {
    if (editingId) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      setDraft(todo.title);
      setEditingId(todo.id);
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      dispatch(toggleTodo(todo.id));
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      dispatch(deleteTodo(todo.id));
      const next = todos[index + 1] ?? todos[index - 1];
      if (next) setFocusedId(next.id);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = todos[index + 1];
      if (next) {
        setFocusedId(next.id);
        rowRefs.current.get(next.id)?.focus();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = todos[index - 1];
      if (prev) {
        setFocusedId(prev.id);
        rowRefs.current.get(prev.id)?.focus();
      }
      return;
    }
  };

  const submitNew = () => {
    const t = newTitle.trim();
    if (!t) return;
    dispatch(addTodo(t));
    setNewTitle("");
  };

  if (!activeFile) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        No file selected. Create or import one from the sidebar.
      </div>
    );
  }

  const bulkDelete = () => {
    for (const id of selected) dispatch(deleteTodo(id));
    setSelected(new Set());
  };
  const bulkSetDone = (done: boolean) => {
    for (const id of selected) dispatch(updateTodo({ id, done }));
  };
  const bulkSetGroup = (groupId: string | null) => {
    for (const id of selected) dispatch(updateTodo({ id, groupId }));
  };
  const bulkSetPriority = (priority: string | null) => {
    for (const id of selected) dispatch(updateTodo({ id, priority }));
  };
  const bulkSetProgress = (progress: string | null) => {
    for (const id of selected) dispatch(updateTodo({ id, progress }));
  };
  const selectedTodos = sortedTodos.filter((t) => selected.has(t.id));
  const assigneeState: Record<string, "all" | "some" | "none"> = {};
  for (const u of usersList) {
    let n = 0;
    for (const t of selectedTodos) if (t.assignees.includes(u.id)) n++;
    assigneeState[u.id] =
      n === 0 ? "none" : n === selectedTodos.length ? "all" : "some";
  }
  const bulkToggleAssignee = (userId: string) => {
    const state = assigneeState[userId] ?? "none";
    const shouldRemove = state === "all";
    for (const t of selectedTodos) {
      const has = t.assignees.includes(userId);
      let next: string[];
      if (shouldRemove) {
        if (!has) continue;
        next = t.assignees.filter((a) => a !== userId);
      } else {
        if (has) continue;
        next = [...t.assignees, userId];
      }
      dispatch(updateTodo({ id: t.id, assignees: next }));
    }
  };
  const bulkClearAssignees = () => {
    for (const t of selectedTodos) {
      if (t.assignees.length === 0) continue;
      dispatch(updateTodo({ id: t.id, assignees: [] }));
    }
  };
  const userNameById = (id: string) =>
    usersList.find((u) => u.id === id)?.name ?? "";
  const bulkCopyMarkdown = () =>
    copyText(todosToMarkdownTable(selectedTodos, groups, userNameById));
  const bulkCopyChecklist = () =>
    copyText(todosToMarkdownChecklist(selectedTodos));
  const bulkCopyCsv = () =>
    copyText(todosToCsv(selectedTodos, groups, userNameById));

  return (
    <div
      className={cn(
        "rounded-lg border flex flex-col max-h-[calc(100vh-10rem)] w-full transition-colors relative",
        focusMode ? "border-transparent" : "border-border",
      )}
    >
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          total={sortedTodos.length}
          groups={groups}
          priorities={priorityOptions}
          progressOptions={progressOptions}
          onClear={() => setSelected(new Set())}
          onSelectAll={() =>
            setSelected(new Set(sortedTodos.map((t) => t.id)))
          }
          onDelete={bulkDelete}
          onMarkDone={() => bulkSetDone(true)}
          onMarkUndone={() => bulkSetDone(false)}
          onSetGroup={bulkSetGroup}
          onSetPriority={bulkSetPriority}
          onSetProgress={bulkSetProgress}
          users={usersList}
          assigneeState={assigneeState}
          onToggleAssignee={bulkToggleAssignee}
          onClearAssignees={bulkClearAssignees}
          onCopyMarkdown={bulkCopyMarkdown}
          onCopyChecklist={bulkCopyChecklist}
          onCopyCsv={bulkCopyCsv}
        />
      )}
      {/* Search bar — outside scroll, never clips */}
      <div
        className={cn(
          "bg-muted border-b border-border px-3 py-1.5 shrink-0 flex items-center gap-2 text-muted-foreground transition-opacity",
          focusMode && "opacity-0 pointer-events-none",
        )}
      >
        <Search className="size-3.5 shrink-0" />
        <input
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder="Search tasks…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {globalFilter && (
          <button
            type="button"
            onClick={() => setGlobalFilter("")}
            className="text-xs hover:text-foreground"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="rounded p-1 hover:bg-background hover:text-foreground transition-colors"
                aria-label="Task list options"
                title="Task list options"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() =>
                copyText(
                  todosToMarkdownChecklist(
                    table.getFilteredRowModel().rows.map((r) => r.original),
                  ),
                )
              }
            >
              <ClipboardCopy className="size-3" />
              Copy tasks as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                copyText(
                  todosToMarkdownTable(
                    table.getFilteredRowModel().rows.map((r) => r.original),
                    groups,
                    (id) =>
                      usersList.find((u) => u.id === id)?.name ?? "",
                  ),
                )
              }
            >
              <ClipboardCopy className="size-3" />
              Copy as Markdown table
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                copyText(
                  todosToCsv(
                    table.getFilteredRowModel().rows.map((r) => r.original),
                    groups,
                    (id) =>
                      usersList.find((u) => u.id === id)?.name ?? "",
                  ),
                )
              }
            >
              <FileDown className="size-3" />
              Copy as CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                setSelected(
                  new Set(
                    table
                      .getFilteredRowModel()
                      .rows.map((r) => r.original.id),
                  ),
                )
              }
            >
              <Check className="size-3" />
              Select all visible
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Horizontal + vertical scroll area — only the table */}
      <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
        <table
          className={cn(
            "text-sm border-separate border-spacing-0 [&_th]:border-r [&_th]:border-b [&_td]:border-r [&_td]:border-b [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tbody_tr:last-child_td]:border-b-0",
            focusMode
              ? "[&_th]:border-transparent [&_td]:border-transparent"
              : "[&_th]:border-border [&_td]:border-border",
          )}
          style={{
            width: table.getTotalSize(),
            minWidth: "100%",
            tableLayout: "fixed",
          }}
        >
          <thead
            className={cn(
              "bg-muted sticky top-0 z-10",
              focusMode && "opacity-0 pointer-events-none",
            )}
          >
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={cn(
                      "relative text-left font-medium px-3 py-2 text-muted-foreground select-none transition-opacity",
                      h.id === "drag" && "sticky left-0 bg-muted z-20",
                      h.id === "done" && "sticky left-[32px] bg-muted z-20",
                      h.id === "actions" &&
                        "sticky right-0 bg-muted z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]",
                    )}
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getCanResize() && (
                      <div
                        onMouseDown={h.getResizeHandler()}
                        onTouchStart={h.getResizeHandler()}
                        className={cn(
                          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none",
                          h.column.getIsResizing()
                            ? "bg-primary"
                            : "hover:bg-primary/30",
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {/* Add-todo row — sticky at top */}
            <tr className={cn("transition-opacity")}>
              <td className="px-3 py-2 align-middle sticky left-0 top-0 bg-background border-b border-border z-30">
                <Plus
                  className={cn(
                    "size-4 text-muted-foreground",
                    focusMode && "opacity-0 pointer-events-none",
                  )}
                />
              </td>
              <td className="px-3 py-2 align-middle  bg-background text-muted-foreground border-b border-border z-30" />
              {!focusMode && (
                <td className="px-3 py-2 align-middle sticky left-[32px] top-0 bg-background text-muted-foreground border-b border-border z-30" />
              )}
              <td
                className="px-3 py-2 align-middle sticky top-0 bg-background text-muted-foreground border-b border-border z-20"
                colSpan={columns.length - (focusMode ? 2 : 3)}
              >
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitNew();
                    }
                  }}
                  placeholder="Add a task… (Press Enter)"
                  style={{
                    fontFamily,
                    fontSize: `${titleFontSize}px`,
                    fontWeight: titleFontWeight,
                  }}
                  className="w-full bg-transparent p-0 outline-none placeholder:text-muted-foreground placeholder:font-normal"
                />
              </td>
            </tr>

            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Start typing above and press Enter
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: paddingTop }}
                    />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = paginatedRows[virtualRow.index];
                  const id = row.original.id;
                  const isFocused = focusedId === id;
                  return (
                    <tr
                      key={row.id}
                      data-row-id={id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(id, el);
                        else rowRefs.current.delete(id);
                      }}
                      tabIndex={editingId === id ? -1 : 0}
                      onFocus={() => setFocusedId(id)}
                      onKeyDown={(e) =>
                        handleRowKey(
                          e,
                          row.original,
                          todos.indexOf(row.original),
                        )
                      }
                      draggable={editingId !== id && sorting.length === 0}
                      onDragStart={(e) => {
                        if (sorting.length > 0) return;
                        setDragId(id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", id);
                      }}
                      onDragOver={(e) => {
                        if (sorting.length > 0) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overId !== id) setOverId(id);
                      }}
                      onDragLeave={() => {
                        if (overId === id) setOverId(null);
                      }}
                      onDrop={(e) => {
                        if (sorting.length > 0) return;
                        e.preventDefault();
                        const fromId =
                          e.dataTransfer.getData("text/plain") || dragId;
                        if (fromId && fromId !== id)
                          dispatch(reorder({ fromId, toId: id }));
                        setDragId(null);
                        setOverId(null);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                      className={cn(
                        "transition-colors outline-none hover:bg-muted/50",
                        (dragId === id || touchDragId === id) && "opacity-40",
                        ((overId === id && dragId !== id) ||
                          (touchOverId === id && touchDragId !== id)) &&
                          "bg-primary/20",
                        isFocused && "bg-primary/2",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          onTouchStart={
                            cell.column.id === "drag" &&
                            sorting.length === 0 &&
                            editingId !== id
                              ? (e) => {
                                  e.stopPropagation();
                                  startTouchDrag(id);
                                }
                              : undefined
                          }
                          className={cn(
                            "px-3 py-2 align-middle transition-opacity",
                            cell.column.id === "drag" && "touch-none",
                            !(focusMode && cell.column.id === "title") &&
                              "truncate",
                            focusMode &&
                              [
                                "priority",
                                "progress",
                                "group",
                                "assignees",
                                "completedIn",
                                "actions",
                              ].includes(cell.column.id) &&
                              "opacity-0 pointer-events-none",
                            cell.column.id === "drag" &&
                              cn(
                                "sticky left-0 z-1",
                                isFocused
                                  ? "shadow-[inset_2px_0_0_var(--color-primary)] bg-background"
                                  : "bg-background",
                              ),
                            cell.column.id === "done" &&
                              cn("sticky left-[32px] z-1", "bg-background"),
                            cell.column.id === "actions" &&
                              cn(
                                "sticky right-0 z-1 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]",
                                "bg-background",
                              ),
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: paddingBottom }}
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom bar — outside scroll, never clips */}
      <div
        className={cn(
          "border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted flex gap-3 flex-wrap items-center shrink-0 transition-opacity",
          focusMode && "opacity-0 pointer-events-none",
        )}
      >
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none font-mono">
            ↑↓
          </kbd>
          <span>move</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none font-mono">
            ↵
          </kbd>
          <span>edit</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">
            Space
          </kbd>
          <span>toggle</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">
            Del
          </kbd>
          <span>delete</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">
            Esc
          </kbd>
          <span>cancel</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
                >
                  {pagination.pageSize} / page{" "}
                  <ChevronDown className="size-3 opacity-60" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-32">
              {[30, 100, 200, 300].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setPagination({ pageIndex: 0, pageSize: s })}
                >
                  {s} / page
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span>
            {pageStart + 1}–{Math.min(pageEnd, filteredRows.length)} of{" "}
            {todoCount} tasks
          </span>
          <button
            type="button"
            onClick={() =>
              setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
            }
            disabled={!canPrev}
            className="p-0.5 rounded disabled:opacity-30 hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
            }
            disabled={!canNext}
            className="p-0.5 rounded disabled:opacity-30 hover:text-foreground"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
