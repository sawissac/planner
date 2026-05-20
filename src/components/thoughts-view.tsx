"use client";

import { useAppSelector } from "@/lib/hooks";

export function ThoughtsView() {
  const file = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });

  if (!file || file.todos.length === 0) {
    return (
      <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
        No tasks in this file.
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      ThoughtsView placeholder — {file.todos.length} task(s)
    </div>
  );
}
