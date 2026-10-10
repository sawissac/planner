import { flushSync } from "react-dom";

/**
 * Registry of open, unsaved thought/comment drafts, so "Copy context" can
 * save them before it syncs (`saveDrafts`).
 *
 * Two layers: every editable `ThoughtEditor` registers the flush for its
 * debounced `onChange` (`trackEditor`), and every host that owns a draft —
 * a thought pane, a comment being edited, the new-comment composer —
 * registers how to save it, keyed by task (`trackDraft`).
 */
const editorFlushes = new Set<() => void>();
const draftSavers = new Map<string, Set<() => void>>();

/** Register an editor's pending-change flush; returns the unregister. */
export function trackEditor(flush: () => void): () => void {
  editorFlushes.add(flush);
  return () => {
    editorFlushes.delete(flush);
  };
}

/** Register how to save a task's open draft; returns the unregister. */
export function trackDraft(todoId: string, save: () => void): () => void {
  let set = draftSavers.get(todoId);
  if (!set) {
    set = new Set();
    draftSavers.set(todoId, set);
  }
  set.add(save);
  return () => {
    set.delete(save);
    if (set.size === 0 && draftSavers.get(todoId) === set) {
      draftSavers.delete(todoId);
    }
  };
}

/**
 * Save every open draft of `todoId` into the store, synchronously. Editors
 * flush their last keystrokes first, inside `flushSync`, so the savers run
 * against the committed text rather than state from before the debounce.
 */
export function saveDrafts(todoId: string): void {
  flushSync(() => {
    for (const flush of editorFlushes) {
      flush();
    }
  });
  for (const save of [...(draftSavers.get(todoId) ?? [])]) {
    save();
  }
}
