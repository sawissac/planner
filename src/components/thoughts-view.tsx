"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function stripMarkdown(md: string, limit = 80): string {
  const cleaned = md
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*]+\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_+([^_]+)_+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, limit).trimEnd() + "…";
}

export function ThoughtsView() {
  const file = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });

  const todos = file?.todos ?? [];

  const initialId = useMemo(() => {
    if (todos.length === 0) return null;
    const withThought = todos.find((t) => (t.thought ?? "").trim().length > 0);
    return (withThought ?? todos[0]).id;
  }, [todos]);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  if (!file || todos.length === 0) {
    return (
      <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
        No tasks in this file.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(240px,320px)_1fr]">
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto rounded-md border border-border">
        <ul className="divide-y divide-border">
          {todos.map((t) => {
            const preview = stripMarkdown(t.thought ?? "");
            const selected = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors",
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="w-full truncate text-sm font-medium">
                    {t.title?.trim() || "(untitled)"}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-xs",
                      preview
                        ? "text-muted-foreground"
                        : "italic text-muted-foreground/70",
                    )}
                  >
                    {preview || "Empty"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
        Editor placeholder — selected: {selectedId ?? "(none)"}
      </div>
    </div>
  );
}
