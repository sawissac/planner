"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CornerDownLeft,
  Delete,
  Folder,
  GripVertical,
  Plus,
  Search,
  Space,
  Trash2,
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
  reorder,
  toggleTodo,
  updateTodo,
  type Group,
  type Todo,
} from "@/lib/todoSlice";
import {
  FONT_VAR,
  setColumnSizing,
  type FontSize,
  type FontWeight,
} from "@/lib/settingsSlice";
import { cn } from "@/lib/utils";
import { DateRangeCell } from "@/components/date-range-cell";
import { Button } from "@/components/ui/button";
import { PriorityCell } from "@/components/priority-cell";
import { AssigneeCell } from "@/components/assignee-cell";
import { TodoRowActions } from "@/components/todo-row-actions";
import { PromptDialog, type PromptState } from "@/components/prompt-dialog";

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
      onClick={() => {
        meta.setDraft(todo.title);
        meta.setEditing(todo.id);
      }}
      className={cn(
        "truncate block leading-tight cursor-text",
        todo.done && "text-muted-foreground line-through",
      )}
    >
      {todo.title}
    </span>
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
              onClick={() => dispatch(updateTodo({ id: todo.id, groupId: g.id }))}
              className="flex items-center gap-2"
            >
              <Folder className="size-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{g.name}</span>
              {todo.groupId === g.id && <Check className="size-3 shrink-0" />}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); dispatch(deleteGroup(g.id)); }}
                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openNewGroup} className="flex items-center gap-2">
            <Plus className="size-3 shrink-0 text-muted-foreground" />
            <span>New group…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog state={prompt} onOpenChange={(open) => setPrompt((s) => ({ ...s, open }))} />
    </>
  );
}

export function TodoTable() {
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const rawTableFont = useAppSelector((s) => s.settings.tableFont);
  const rawTitleFontSize = useAppSelector((s) => s.settings.titleFontSize);
  const rawTitleFontWeight = useAppSelector((s) => s.settings.titleFontWeight);
  const persistedSizing = useAppSelector((s) => s.settings.columnSizing);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const tableFont = focusMode ? "poppins" : rawTableFont;
  const titleFontSize: FontSize = focusMode ? 28 : rawTitleFontSize;
  const titleFontWeight: FontWeight = focusMode ? 500 : rawTitleFontWeight;
  const dispatch = useAppDispatch();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const setSort = useCallback((id: string, desc: boolean | null) => {
    setSorting((prev) => {
      if (desc === null) return prev.filter((s) => s.id !== id);
      const existing = prev.find((s) => s.id === id);
      if (existing) return prev.map((s) => (s.id === id ? { ...s, desc } : s));
      return [...prev, { id, desc }];
    });
  }, []);

  const sortedTodos = useMemo(() => {
    if (sorting.length === 0) return todos;
    return [...todos].sort((a, b) => {
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
  }, [todos, sorting]);

  const meta: RowMeta = {
    editingId,
    draft,
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
        size: 32,
        enableResizing: false,
        cell: () => (
          <GripVertical className="size-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        ),
      },
      {
        id: "done",
        header: "",
        size: 40,
        enableResizing: false,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.done}
            onChange={() => dispatch(toggleTodo(row.original.id))}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer accent-primary"
          />
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
        header: "Priority",
        size: 140,
        minSize: 100,
        cell: ({ row }) => (
          <PriorityCell id={row.original.id} priority={row.original.priority} />
        ),
      },
      {
        id: "group",
        header: "Group",
        size: 140,
        minSize: 80,
        cell: ({ row }) => (
          <GroupCell todo={row.original} groups={groups} />
        ),
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
        size: 160,
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
        size: 240,
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
    [dispatch, groups],
  );

  const table = useReactTable({
    data: sortedTodos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    state: { columnSizing: persistedSizing, pagination, globalFilter },
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
  const paginatedRows = useMemo(() => filteredRows.slice(pageStart, pageEnd), [filteredRows, pageStart, pageEnd]);
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
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
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

  return (
    <div className="rounded-lg border border-border flex flex-col max-h-[calc(100vh-7rem)] w-full">
      {/* Search bar — outside scroll, never clips */}
      <div className="bg-muted border-b border-border px-3 py-1.5 shrink-0 flex items-center gap-2 text-muted-foreground">
        <Search className="size-3.5 shrink-0" />
        <input
          value={globalFilter}
          onChange={(e) => { setGlobalFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          placeholder="Search tasks…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {globalFilter && <button type="button" onClick={() => setGlobalFilter("")} className="text-xs hover:text-foreground">✕</button>}
      </div>

      {/* Horizontal + vertical scroll area — only the table */}
      <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
        <table
          className="text-sm border-separate border-spacing-0 [&_th]:border-r [&_th]:border-b [&_th]:border-border [&_td]:border-r [&_td]:border-b [&_td]:border-border [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tbody_tr:last-child_td]:border-b-0"
          style={{ width: table.getTotalSize(), minWidth: "100%" }}
        >
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={cn(
                      "relative text-left font-medium px-3 py-2 text-muted-foreground select-none transition-opacity",
                      focusMode && ["priority", "group", "assignees", "completedIn"].includes(h.id) && "opacity-30",
                      h.id === "drag" && "sticky left-0 bg-muted z-20",
                      h.id === "done" && "sticky left-[32px] bg-muted z-20",
                      h.id === "actions" && "sticky right-0 bg-muted z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]",
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
            {/* Add-todo row */}
            <tr className="bg-muted/20">
              <td className="px-3 py-2 align-middle sticky left-0 bg-muted z-1">
                <Plus className="size-4 text-muted-foreground" />
              </td>
              <td className="px-3 py-2 align-middle sticky left-[32px] bg-muted z-1" />
              <td className="px-3 py-2 align-middle" colSpan={columns.length - 2}>
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
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  Start typing and press Enter
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && <tr><td colSpan={columns.length} style={{ height: paddingTop }} /></tr>}
                {virtualItems.map((virtualRow) => {
                  const row = paginatedRows[virtualRow.index];
                  const id = row.original.id;
                  const isFocused = focusedId === id;
                  return (
                    <tr
                      key={row.id}
                      ref={(el) => { if (el) rowRefs.current.set(id, el); else rowRefs.current.delete(id); }}
                      tabIndex={editingId === id ? -1 : 0}
                      onFocus={() => setFocusedId(id)}
                      onKeyDown={(e) => handleRowKey(e, row.original, todos.indexOf(row.original))}
                      draggable={editingId !== id && sorting.length === 0}
                      onDragStart={(e) => { if (sorting.length > 0) return; setDragId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }}
                      onDragOver={(e) => { if (sorting.length > 0) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overId !== id) setOverId(id); }}
                      onDragLeave={() => { if (overId === id) setOverId(null); }}
                      onDrop={(e) => { if (sorting.length > 0) return; e.preventDefault(); const fromId = e.dataTransfer.getData("text/plain") || dragId; if (fromId && fromId !== id) dispatch(reorder({ fromId, toId: id })); setDragId(null); setOverId(null); }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      className={cn("transition-colors outline-none", dragId === id && "opacity-40", overId === id && dragId !== id && "bg-primary/10", isFocused && "shadow-[inset_1.5px_0_0_#3b82f6]")}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} style={{ width: cell.column.getSize() }}
                          className={cn("px-3 py-2 align-middle truncate transition-opacity",
                            focusMode && ["priority", "group", "assignees", "completedIn"].includes(cell.column.id) && "opacity-30",
                            cell.column.id === "drag" && "sticky left-0 bg-background z-1",
                            cell.column.id === "done" && "sticky left-[32px] bg-background z-1",
                            cell.column.id === "actions" && "sticky right-0 bg-background z-1 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && <tr><td colSpan={columns.length} style={{ height: paddingBottom }} /></tr>}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom bar — outside scroll, never clips */}
      <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted flex gap-3 flex-wrap items-center shrink-0">
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1 border border-border rounded">
            <ArrowUpDown className="size-3" />
          </kbd>
          <span>move</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1 border border-border rounded">
            <CornerDownLeft className="size-3" />
          </kbd>
          <span>edit</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1 border border-border rounded">
            <Space className="size-3" />
          </kbd>
          <span>toggle</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1 border border-border rounded">
            <Delete className="size-3" />
          </kbd>
          <span>delete</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1 border border-border rounded text-[10px] leading-none py-0.5">
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
          <span>{pageStart + 1}–{Math.min(pageEnd, filteredRows.length)} of {todoCount} tasks</span>
          <button type="button" onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={!canPrev} className="p-0.5 rounded disabled:opacity-30 hover:text-foreground">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={!canNext} className="p-0.5 rounded disabled:opacity-30 hover:text-foreground">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
