"use client";

import { useCallback, useEffect, useState } from "react";

import { readOpenThought, writeOpenThought } from "@/lib/thought-open";
import { useHydrated } from "@/providers/StoreProvider";
import { useAppSelector } from "@/stores/hooks";

/**
 * Open state of a task's thought side dialog that survives a reload: the
 * dialog that was open reopens once the store has loaded. Use in place of
 * `useState(false)` wherever `ThoughtDialog` is mounted.
 */
export function useThoughtDialogOpen(todoId: string): [boolean, (open: boolean) => void] {
  const hydrated = useHydrated();
  const fileId = useAppSelector((s) => s.todos.activeFileId);
  const [open, setOpenState] = useState(false);

  useEffect(() => {
    if (hydrated && fileId && readOpenThought("dialog", fileId)?.id === todoId) {
      setOpenState(true);
    }
  }, [hydrated, fileId, todoId]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (fileId) {
        writeOpenThought("dialog", fileId, next ? { id: todoId } : null);
      }
    },
    [fileId, todoId],
  );

  return [open, setOpen];
}
