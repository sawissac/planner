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
  ArrowDownZA,
  ArrowUp,
  ArrowUpAZ,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Avatar from "boring-avatars";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  addUser,
  deleteUser,
  reorderUser,
  updateUser,
  type User,
} from "@/lib/userSlice";
import { setUserColumnSizing } from "@/lib/settingsSlice";
import { cn } from "@/lib/utils";
import { UserRowActions } from "@/components/user-row-actions";

type RowMeta = {
  editingId: string | null;
  editingField: "name" | "agenda";
  draft: string;
  setEditing: (id: string | null, field?: "name" | "agenda") => void;
  setDraft: (v: string) => void;
  commit: () => void;
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

function NameCell({ user, meta }: { user: User; meta: RowMeta }) {
  const editing = meta.editingId === user.id && meta.editingField === "name";
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
          if (e.key === "Tab") {
            e.preventDefault();
            meta.commit();
            meta.setEditing(user.id, "agenda");
          }
          e.stopPropagation();
        }}
        onBlur={meta.commit}
        className="w-full bg-transparent p-0 outline-none"
      />
    );
  }
  return (
    <span
      className="truncate block leading-tight cursor-default"
      onDoubleClick={() => {
        meta.setDraft(user.name);
        meta.setEditing(user.id, "name");
      }}
    >
      {user.name || <span className="text-muted-foreground">Unnamed</span>}
    </span>
  );
}

function AgendaCell({ user, meta }: { user: User; meta: RowMeta }) {
  const editing = meta.editingId === user.id && meta.editingField === "agenda";
  if (editing) {
    return (
      <input
        autoFocus
        value={meta.draft}
        placeholder="Enter agenda…"
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
        className="w-full bg-transparent p-0 outline-none"
      />
    );
  }
  return (
    <span
      className="truncate block leading-tight cursor-default"
      onDoubleClick={() => {
        meta.setEditing(user.id, "agenda");
        meta.setDraft(user.agenda);
      }}
    >
      {user.agenda || <span className="text-muted-foreground">—</span>}
    </span>
  );
}

export function UserTable() {
  const users = useAppSelector((s) => s.users.users);
  const persistedSizing = useAppSelector((s) => s.settings.userColumnSizing);
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
  const [editingField, setEditingField] = useState<"name" | "agenda">("name");
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setEditing = (id: string | null, field: "name" | "agenda" = "name") => {
    setEditingId(id);
    setEditingField(field);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const t = draft.trim();
    const user = users.find((u) => u.id === editingId);
    if (!user) {
      setEditingId(null);
      return;
    }
    if (editingField === "name" && t && t !== user.name) {
      dispatch(updateUser({ id: editingId, name: t }));
    } else if (editingField === "agenda" && t !== user.agenda) {
      dispatch(updateUser({ id: editingId, agenda: t }));
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

  const sortedUsers = useMemo(() => {
    if (sorting.length === 0) return users;
    return [...users].sort((a, b) => {
      for (const { id, desc } of sorting) {
        let cmp = 0;
        if (id === "name") cmp = a.name.localeCompare(b.name);
        if (cmp !== 0) return desc ? -cmp : cmp;
      }
      return 0;
    });
  }, [users, sorting]);

  const meta: RowMeta = {
    editingId,
    editingField,
    draft,
    setEditing,
    setDraft,
    commit: commitEdit,
    sorting,
    setSort,
  };

  const columns = useMemo<ColumnDef<User>[]>(
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
        id: "avatar",
        header: "",
        size: 48,
        enableResizing: false,
        cell: ({ row }) => (
          <Avatar
            size={28}
            name={row.original.id}
            variant="beam"
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
          />
        ),
      },
      {
        accessorKey: "name",
        header: ({ table }) => {
          const m = table.options.meta as RowMeta;
          return (
            <SortDropdown
              label="Name"
              colId="name"
              options={[
                { label: "A to Z", desc: false, icon: <ArrowUpAZ /> },
                { label: "Z to A", desc: true, icon: <ArrowDownZA /> },
              ]}
              sorting={m.sorting}
              setSort={m.setSort}
            />
          );
        },
        size: 200,
        minSize: 100,
        enableSorting: false,
        cell: ({ row, table }) => (
          <NameCell user={row.original} meta={table.options.meta as RowMeta} />
        ),
      },
      {
        accessorKey: "agenda",
        header: "Agenda",
        size: 400,
        minSize: 160,
        cell: ({ row, table }) => (
          <AgendaCell
            user={row.original}
            meta={table.options.meta as RowMeta}
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
            <UserRowActions id={row.original.id} />
          </div>
        ),
      },
    ],
    [dispatch],
  );

  const table = useReactTable({
    data: sortedUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    state: { columnSizing: persistedSizing, pagination, globalFilter },
    meta,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnSizingChange: (updater) => {
      const next: ColumnSizingState =
        typeof updater === "function" ? updater(persistedSizing) : updater;
      dispatch(setUserColumnSizing(next));
    },
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 41,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  useEffect(() => {
    if (editingId === null && focusedId) {
      rowRefs.current.get(focusedId)?.focus();
    }
  }, [editingId, focusedId]);

  const handleRowKey = (e: React.KeyboardEvent, user: User, index: number) => {
    if (editingId) return;
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      setDraft(user.name);
      setEditing(user.id, "name");
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      dispatch(deleteUser(user.id));
      const next = users[index + 1] ?? users[index - 1];
      if (next) setFocusedId(next.id);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = users[index + 1];
      if (next) {
        setFocusedId(next.id);
        rowRefs.current.get(next.id)?.focus();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = users[index - 1];
      if (prev) {
        setFocusedId(prev.id);
        rowRefs.current.get(prev.id)?.focus();
      }
      return;
    }
  };

  const submitNew = () => {
    const n = newName.trim();
    if (!n) return;
    dispatch(addUser(n));
    setNewName("");
  };

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
                  placeholder="Search users…"
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
                    "relative text-left font-medium px-3 py-2 text-muted-foreground select-none overflow-hidden",
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
          <tr className="bg-muted/20">
            <td className="px-3 py-2 align-middle">
              <Plus className="size-4 text-muted-foreground" />
            </td>
            <td className="px-3 py-2 align-middle" />
            <td className="px-3 py-2 align-middle" colSpan={3}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitNew();
                  }
                }}
                placeholder="Add a user… (Press Enter)"
                className="w-full bg-transparent p-0 outline-none placeholder:text-muted-foreground"
              />
            </td>
          </tr>

          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                No users yet. Type a name and press Enter.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && <tr><td colSpan={columns.length} style={{ height: paddingTop }} /></tr>}
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                const id = row.original.id;
                const isFocused = focusedId === id;
                return (
                  <tr
                    key={row.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(id, el);
                      else rowRefs.current.delete(id);
                    }}
                    tabIndex={editingId === id ? -1 : 0}
                    onFocus={() => setFocusedId(id)}
                    onKeyDown={(e) => handleRowKey(e, row.original, virtualRow.index)}
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
                    onDragLeave={() => { if (overId === id) setOverId(null); }}
                    onDrop={(e) => {
                      if (sorting.length > 0) return;
                      e.preventDefault();
                      const fromId = e.dataTransfer.getData("text/plain") || dragId;
                      if (fromId && fromId !== id) dispatch(reorderUser({ fromId, toId: id }));
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    className={cn(
                      "transition-colors outline-none hover:bg-muted/50",
                      dragId === id && "opacity-40",
                      overId === id && dragId !== id && "bg-primary/10",
                      isFocused && "bg-primary/5 shadow-[inset_2px_0_0_var(--color-primary)]",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={cn(
                          "px-3 py-2 align-middle truncate",
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
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none font-mono">↑↓</kbd>
          <span>move</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none font-mono">↵</kbd>
          <span>edit name</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">Tab</kbd>
          <span>→ agenda</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">Del</kbd>
          <span>delete</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[10px] leading-none">Esc</kbd>
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
            {pagination.pageIndex * pagination.pageSize + 1}–
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              sortedUsers.length,
            )}{" "}
            of {sortedUsers.length}
          </span>
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-0.5 rounded disabled:opacity-30 hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-0.5 rounded disabled:opacity-30 hover:text-foreground"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
