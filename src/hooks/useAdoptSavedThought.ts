"use client";

import { useState } from "react";

/**
 * Keeps a thought draft in step with its saved thought: when the saved text
 * changes under an untouched draft (a refresh pulled Plan API edits, an
 * undo), the draft takes the new text. A draft with unsaved edits is left
 * alone. Must be called by the component that owns `draft`.
 *
 * Returns a counter that bumps on every adoption — key the editor on it,
 * since `ThoughtEditor` only reads `markdown` on mount.
 */
export function useAdoptSavedThought(
  todoId: string | null,
  saved: string,
  draft: string,
  setDraft: (md: string) => void,
): number {
  const [prev, setPrev] = useState({ todoId, saved });
  const [version, setVersion] = useState(0);

  // Adjusting state while rendering (not in an effect), so the editor never
  // paints the stale text first.
  if (prev.todoId !== todoId || prev.saved !== saved) {
    setPrev({ todoId, saved });
    if (prev.todoId === todoId && draft === prev.saved && draft !== saved) {
      setDraft(saved);
      setVersion((v) => v + 1);
    }
  }

  return version;
}
