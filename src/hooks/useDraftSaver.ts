"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { trackDraft } from "@/lib/drafts";

/**
 * Lets "Copy context" save this component's open draft of `todoId` before it
 * syncs (see `saveDrafts`). `save` should do nothing when there is nothing
 * unsaved. The latest `save` is kept in a layout effect, so a save run right
 * after `saveDrafts` flushes the editors sees the flushed text.
 */
export function useDraftSaver(todoId: string, save: () => void): void {
  const saveRef = useRef(save);

  useLayoutEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => trackDraft(todoId, () => saveRef.current()), [todoId]);
}
