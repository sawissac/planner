"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database } from "lucide-react";
import { useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const SOFT_MAX_TODOS = 10000;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

type Estimate = { usage: number; quota: number };

function useStorageEstimate(dep: unknown): Estimate | null {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return;
    }
    let cancelled = false;
    navigator.storage.estimate().then((e) => {
      if (cancelled) return;
      setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [dep]);
  return estimate;
}

export function StorageMeter() {
  const totalTodos = useAppSelector((s) =>
    s.todos.files.reduce((acc, f) => acc + f.todos.length, 0),
  );
  const estimate = useStorageEstimate(totalTodos);

  const countPct = Math.min(100, (totalTodos / SOFT_MAX_TODOS) * 100);
  const bytePct =
    estimate && estimate.quota > 0
      ? Math.min(100, (estimate.usage / estimate.quota) * 100)
      : 0;
  const pct = Math.max(countPct, bytePct);

  const warn = pct >= 80;
  const crit = pct >= 95;

  return (
    <div className="flex flex-col gap-1 text-[11px]">
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        {crit ? (
          <AlertTriangle className="size-3 text-destructive shrink-0" />
        ) : (
          <Database className="size-3 shrink-0" />
        )}
        <span
          className={cn(
            "tabular-nums shrink-0",
            crit && "text-destructive font-medium",
          )}
        >
          {totalTodos.toLocaleString()}/{SOFT_MAX_TODOS.toLocaleString()}
        </span>
        {estimate && estimate.quota > 0 && (
          <span className="tabular-nums ml-auto truncate">
            {formatBytes(estimate.usage)}/{formatBytes(estimate.quota)}
          </span>
        )}
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            crit
              ? "bg-destructive"
              : warn
                ? "bg-amber-500"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {crit && (
        <span className="text-destructive text-[10px] leading-tight">
          Near storage limit. Export or delete files.
        </span>
      )}
    </div>
  );
}
