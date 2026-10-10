/**
 * Which thought editor is open, per file, so reloading the page (or coming
 * back to the view) reopens it. One slot per surface:
 *
 * - `focus` — the inline panel under a task in focus mode
 * - `dialog` — the side dialog from a row's menu or a board card
 * - `thoughts` — the Thoughts view's selected task (`editor`: the editor
 *   pane, not the list, is showing — matters on narrow screens)
 *
 * Per browser in localStorage, not in settings: open panels are this
 * device's UI state and must not sync to other devices. Unsaved drafts are
 * not kept — only which editor was open.
 */
export type ThoughtSurface = "focus" | "dialog" | "thoughts";

export type OpenThought = { id: string; editor?: boolean };

const KEY = "planner:thoughtOpen";

type Saved = Partial<Record<ThoughtSurface, Record<string, OpenThought>>>;

function load(): Saved {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function readOpenThought(surface: ThoughtSurface, fileId: string): OpenThought | null {
  const v = load()[surface]?.[fileId];
  return v && typeof v.id === "string" ? v : null;
}

/** Remember `open` for this surface and file; `null` forgets it. */
export function writeOpenThought(
  surface: ThoughtSurface,
  fileId: string,
  open: OpenThought | null,
): void {
  const saved = load();
  const files = { ...saved[surface] };
  if (open) {
    files[fileId] = open;
  } else {
    delete files[fileId];
  }
  saved[surface] = files;
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the editor just won't reopen after a reload.
  }
}
