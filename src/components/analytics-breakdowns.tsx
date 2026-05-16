"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/hooks";
import type { TodoFile } from "@/lib/todoSlice";
import { UsersRound, Folder } from "lucide-react";

type Row = { id: string; label: string; count: number };

function startEndForRange(rangeDays: number) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime(), end: end.getTime() };
}

function BarList({
  rows,
  emptyLabel,
}: {
  rows: Row[];
  emptyLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = (r.count / max) * 100;
        return (
          <li key={r.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="truncate" title={r.label}>
                {r.label}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {r.count}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AssigneeBreakdown({
  files,
  rangeDays,
}: {
  files: TodoFile[];
  rangeDays: number;
}) {
  const users = useAppSelector((s) => s.users.users);

  const rows = useMemo<Row[]>(() => {
    const { start, end } = startEndForRange(rangeDays);
    const counts = new Map<string, number>();
    for (const file of files) {
      for (const t of file.todos) {
        if (t.completedFrom < start || t.completedFrom > end) continue;
        for (const uid of t.assignees) {
          counts.set(uid, (counts.get(uid) ?? 0) + 1);
        }
      }
    }
    const list: Row[] = [];
    for (const [id, count] of counts.entries()) {
      const u = users.find((x) => x.id === id);
      list.push({ id, label: u?.name ?? "Unknown user", count });
    }
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 8);
  }, [files, rangeDays, users]);

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-4 min-w-0 h-full">
      <div>
        <div className="text-base font-bold flex items-center gap-2">
          <UsersRound className="size-4" />
          Top Assignees
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          Tasks per assignee in the selected range
        </div>
      </div>
      <BarList rows={rows} emptyLabel="No assigned tasks in this range." />
    </div>
  );
}

export function GroupBreakdown({
  files,
  rangeDays,
}: {
  files: TodoFile[];
  rangeDays: number;
}) {
  const rows = useMemo<Row[]>(() => {
    const { start, end } = startEndForRange(rangeDays);
    const counts = new Map<string, number>();
    let ungrouped = 0;
    const nameOf = new Map<string, string>();
    for (const file of files) {
      for (const g of file.groups) nameOf.set(g.id, g.name);
      for (const t of file.todos) {
        if (t.completedFrom < start || t.completedFrom > end) continue;
        if (!t.groupId) {
          ungrouped++;
          continue;
        }
        counts.set(t.groupId, (counts.get(t.groupId) ?? 0) + 1);
      }
    }
    const list: Row[] = [];
    for (const [id, count] of counts.entries()) {
      list.push({ id, label: nameOf.get(id) ?? "Unknown group", count });
    }
    if (ungrouped > 0) {
      list.push({ id: "__ungrouped__", label: "Ungrouped", count: ungrouped });
    }
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 8);
  }, [files, rangeDays]);

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-4 min-w-0 h-full">
      <div>
        <div className="text-base font-bold flex items-center gap-2">
          <Folder className="size-4" />
          Top Groups
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          Tasks per group in the selected range
        </div>
      </div>
      <BarList rows={rows} emptyLabel="No grouped tasks in this range." />
    </div>
  );
}
