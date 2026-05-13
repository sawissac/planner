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
  type Row,
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
  FolderPlus,
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
  renameGroup,
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
import { PriorityCell } from "@/components/priority-cell";
import { AssigneeCell } from "@/components/assignee-cell";
import { TodoRowActions } from "@/components/todo-row-actions";

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

export function TodoTable() {
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const tableFont = useAppSelector((s) => s.settings.tableFont);
  const titleFontSize = useAppSelector((s) => s.settings.titleFontSize);
  const titleFontWeight = useAppSelector((s) => s.settings.titleFontWeight);
  const persistedSizing = useAppSelector((s) => s.settings.columnSizing);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
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
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState("");
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const todos = activeFile?.todos ?? [];
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
    [dispatch],
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

  const groups = activeFile?.groups ?? [];

  type FlatItem = { type: "group"; group: Group } | { type: "todo"; row: Row<Todo> };

  const filteredRows = table.getFilteredRowModel().rows;

  const flatItems = useMemo<FlatItem[]>(() => {
    const byGroup = new Map<string | null, Row<Todo>[]>();
    byGroup.set(null, []);
    for (const g of groups) byGroup.set(g.id, []);
    for (const row of filteredRows) {
      const gid = row.original.groupId ?? null;
      byGroup.get(byGroup.has(gid) ? gid : null)!.push(row);
    }
    const items: FlatItem[] = [];
    for (const row of byGroup.get(null) ?? []) items.push({ type: "todo", row });
    for (const g of groups) {
      items.push({ type: "group", group: g });
      for (const row of byGroup.get(g.id) ?? []) items.push({ type: "todo", row });
    }
    return items;
  }, [filteredRows, groups]);

  const pageStart = pagination.pageIndex * pagination.pageSize;
  const pageEnd = pageStart + pagination.pageSize;
  const paginatedItems = useMemo(() => flatItems.slice(pageStart, pageEnd), [flatItems, pageStart, pageEnd]);
  const canPrev = pagination.pageIndex > 0;
  const canNext = pageEnd < flatItems.length;
  const todoCount = filteredRows.length;

  const rowVirtualizer = useVirtualizer({
    count: paginatedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (i) => paginatedItems[i]?.type === "group" ? 36 : 41,
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
    <div ref={scrollContainerRef} className="rounded-lg border border-border overflow-auto max-h-[calc(100vh-7rem)]">
      <table
        className="text-sm border-separate border-spacing-0 [&_th]:border-r [&_th]:border-b [&_th]:border-border [&_td]:border-r [&_td]:border-b [&_td]:border-border [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tbody_tr:last-child_td]:border-b-0"
        style={{ width: table.getTotalSize(), minWidth: "100%" }}
      >
        <thead className="bg-muted sticky top-0 z-10">
          <tr>
            <th colSpan={columns.length} className="px-3 py-1.5 border-b border-border font-normal">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="size-3.5 shrink-0" />
                <input
                  value={globalFilter}
                  onChange={(e) => { setGlobalFilter(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
                  placeholder="Search tasks…"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {globalFilter && <button type="button" onClick={() => setGlobalFilter("")} className="text-xs hover:text-foreground">✕</button>}
              </div>
            </th>
          </tr>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  style={{ width: h.getSize() }}
                  className={cn(
                    "relative text-left font-medium px-3 py-2 text-muted-foreground select-none transition-opacity",
                    focusMode && ["priority", "assignees", "completedIn"].includes(h.id) && "opacity-30",
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
            <td className="px-3 py-2 align-middle">
              <Plus className="size-4 text-muted-foreground" />
            </td>
            <td className="px-3 py-2 align-middle" />
            <td className="px-3 py-2 align-middle" colSpan={5}>
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

          {paginatedItems.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                Start typing and press Enter
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && <tr><td colSpan={columns.length} style={{ height: paddingTop }} /></tr>}
              {virtualItems.map((virtualRow) => {
                const item = paginatedItems[virtualRow.index];
                if (item.type === "group") {
                  const { group } = item;
                  const isEditingGroup = editingGroupId === group.id;
                  const gCount = flatItems.filter((i) => i.type === "todo" && i.row.original.groupId === group.id).length;
                  return (
                    <tr key={`group-${group.id}`}>
                      <td colSpan={columns.length} className="px-3 py-1.5 bg-muted/50 border-y border-border">
                        <div className="flex items-center gap-2 text-sm">
                          <Folder className="size-3.5 text-muted-foreground shrink-0" />
                          {isEditingGroup ? (
                            <input
                              autoFocus
                              value={groupDraft}
                              onChange={(e) => setGroupDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); if (groupDraft.trim()) dispatch(renameGroup({ id: group.id, name: groupDraft.trim() })); setEditingGroupId(null); }
                                if (e.key === "Escape") { e.preventDefault(); setEditingGroupId(null); }
                                e.stopPropagation();
                              }}
                              onBlur={() => { if (groupDraft.trim()) dispatch(renameGroup({ id: group.id, name: groupDraft.trim() })); setEditingGroupId(null); }}
                              className="flex-1 bg-transparent outline-none font-medium"
                            />
                          ) : (
                            <span className="font-medium cursor-text flex-1" onClick={() => { setGroupDraft(group.name); setEditingGroupId(group.id); }}>
                              {group.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{gCount}</span>
                          <div className="flex items-center gap-0.5">
                            <button type="button" title="Add task to group"
                              onClick={() => { const action = addTodo("New task", group.id); dispatch(action); setDraft("New task"); setEditingId(action.payload.id); }}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            ><Plus className="size-3.5" /></button>
                            <button type="button" title="Delete group"
                              onClick={() => dispatch(deleteGroup(group.id))}
                              className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            ><Trash2 className="size-3.5" /></button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const { row } = item;
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
                          focusMode && ["priority", "assignees", "completedIn"].includes(cell.column.id) && "opacity-30",
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
      <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted flex gap-3 flex-wrap items-center sticky bottom-0 z-10">
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
          <span>{pageStart + 1}–{Math.min(pageEnd, flatItems.length)} of {todoCount} tasks</span>
          <button type="button" onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={!canPrev} className="p-0.5 rounded disabled:opacity-30 hover:text-foreground">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={!canNext} className="p-0.5 rounded disabled:opacity-30 hover:text-foreground">
            <ChevronRight className="size-3.5" />
          </button>
          <button type="button" onClick={() => dispatch(createGroup("New group"))}
            className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5 hover:bg-background transition-colors"
            title="New group"
          >
            <FolderPlus className="size-3.5" /> Group
          </button>
        </div>
      </div>
    </div>
  );
}
