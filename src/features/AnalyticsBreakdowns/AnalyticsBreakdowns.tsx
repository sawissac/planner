"use client";

import { Folder, UsersRound } from "lucide-react";
import { useMemo } from "react";

import { useAppSelector } from "@/stores/hooks";
import type { TodoFile } from "@/stores/slices/todoSlice";

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

const BAR_PALETTE = [
  { from: "var(--chart-3)", to: "var(--primary)" },
  { from: "var(--chart-4)", to: "var(--chart-3)" },
  { from: "var(--primary)", to: "var(--chart-4)" },
  { from: "var(--chart-2)", to: "var(--chart-4)" },
  { from: "var(--chart-1)", to: "var(--chart-2)" },
  { from: "var(--chart-5)", to: "var(--primary)" },
];

function hashIndex(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function BarList({ rows, emptyLabel }: { rows: Row[]; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r, i) => {
        const pct = (r.count / max) * 100;
        const share = total > 0 ? (r.count / total) * 100 : 0;
        const palette = BAR_PALETTE[hashIndex(r.id, BAR_PALETTE.length)];
        const isTop = i === 0;
        return (
          <li key={r.id} className="group/row flex items-center gap-3 min-w-0">
            <div
              className="relative shrink-0 grid place-items-center size-9 rounded-full text-[11px] font-semibold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
              }}
              aria-hidden
            >
              {initials(r.label)}
              {isTop && (
                <span
                  className="absolute -top-1 -right-1 grid place-items-center size-4 rounded-full bg-amber-400 text-[9px] text-amber-950 ring-2 ring-card"
                  title="Top"
                >
                  ★
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 inline-flex items-baseline gap-1.5 tabular-nums">
                  <span className="font-semibold">{r.count}</span>
                  <span className="text-[11px] text-muted-foreground">{share.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1.5 relative h-2.5 rounded-full bg-muted/70 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full shadow-[0_0_8px_var(--ring)] transition-[width] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${palette.from}, ${palette.to})`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity"
                  style={{
                    width: `${pct}%`,
                    background:
                      "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AssigneeBreakdown({ files, rangeDays }: { files: TodoFile[]; rangeDays: number }) {
  const users = useAppSelector((s) => s.users.users);

  const rows = useMemo<Row[]>(() => {
    const { start, end } = startEndForRange(rangeDays);
    const counts = new Map<string, number>();
    for (const file of files) {
      for (const t of file.todos) {
        if (t.completedFrom < start || t.completedFrom > end) {
          continue;
        }
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

export function GroupBreakdown({ files, rangeDays }: { files: TodoFile[]; rangeDays: number }) {
  const rows = useMemo<Row[]>(() => {
    const { start, end } = startEndForRange(rangeDays);
    const counts = new Map<string, number>();
    let ungrouped = 0;
    const nameOf = new Map<string, string>();
    for (const file of files) {
      for (const g of file.groups) {
        nameOf.set(g.id, g.name);
      }
      for (const t of file.todos) {
        if (t.completedFrom < start || t.completedFrom > end) {
          continue;
        }
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
