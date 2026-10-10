"use client";

import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useState } from "react";

import { AgentRunPanel } from "@/components/customs/AgentRunPanel";
import { useConfirm } from "@/components/customs/ConfirmDialog";
import { CopyApiUrlButton } from "@/components/customs/CopyApiUrlButton";
import { RefreshThoughtButton } from "@/components/customs/RefreshThoughtButton";
import { TokenCount } from "@/components/customs/TokenCount";
import { Button } from "@/components/ui/button";
import { useDraftSaver } from "@/hooks/useDraftSaver";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";
import { useAppDispatch } from "@/stores/hooks";
import {
  addThoughtComment,
  deleteThoughtComment,
  type ThoughtComment,
  type Todo,
  updateThoughtComment,
} from "@/stores/slices/todoSlice";

const ThoughtEditor = dynamic(
  () => import("@/components/customs/ThoughtEditor").then((m) => m.ThoughtEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-10 px-3 py-2 text-sm text-app-dim">Loading editor…</div>,
  },
);

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CommentItem = memo(function CommentItem({
  todoId,
  comment,
  thought,
}: {
  todoId: string;
  comment: ThoughtComment;
  /** Saved thought, counted with the comment in its token usage. */
  thought: string;
}) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  const startEdit = () => {
    setDraft(comment.body);
    setEditing(true);
  };

  const commit = () => {
    if (draft.trim() && draft !== comment.body) {
      dispatch(updateThoughtComment({ todoId, id: comment.id, body: draft }));
    }
  };

  const save = () => {
    commit();
    setEditing(false);
  };

  // "Copy context" saves the edit first; the editor stays open.
  useDraftSaver(todoId, () => {
    if (editing) {
      commit();
    }
  });

  return (
    <li
      data-testid={`thought-comment-${comment.id}`}
      className="group rounded-md border border-app-border bg-app-bg"
    >
      <div className="flex items-center gap-2 border-b border-app-border px-3 py-1.5">
        <span className={cn(ui.meta, "flex-1 truncate")}>
          {fmtTime(comment.createdAt)}
          {comment.updatedAt > comment.createdAt && " · edited"}
        </span>
        {!editing && (
          <>
            <TokenCount
              text={comment.body}
              base={thought}
              brief
              data-testid={`thought-comment-${comment.id}-token-count`}
            />
            <CopyApiUrlButton todoId={todoId} commentId={comment.id} />
            <button
              type="button"
              aria-label="Edit comment"
              title="Edit comment"
              data-testid={`thought-comment-${comment.id}-edit-button`}
              onClick={startEdit}
              className={cn(ui.iconBtn, "size-6 [&_svg]:size-3.5")}
            >
              <Pencil />
            </button>
            <button
              type="button"
              aria-label="Delete comment"
              title="Delete comment"
              data-testid={`thought-comment-${comment.id}-delete-button`}
              onClick={() =>
                confirm({
                  title: "Delete comment?",
                  description: "This comment will be permanently removed.",
                  confirmLabel: "Delete",
                  destructive: true,
                  onConfirm: () => dispatch(deleteThoughtComment({ todoId, id: comment.id })),
                })
              }
              className={cn(ui.iconBtnDanger, "size-6 [&_svg]:size-3.5")}
            >
              <Trash2 />
            </button>
          </>
        )}
      </div>
      {editing ? (
        <>
          <ThoughtEditor markdown={draft} onChange={setDraft} compact />
          <div className="flex items-center justify-end gap-2 border-t border-app-border px-3 py-2">
            <TokenCount
              text={draft}
              base={thought}
              className="mr-auto truncate"
              data-testid={`thought-comment-${comment.id}-draft-token-count`}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              data-testid={`thought-comment-${comment.id}-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!draft.trim()}
              data-testid={`thought-comment-${comment.id}-save-button`}
            >
              Save
            </Button>
          </div>
        </>
      ) : (
        // Double-click the comment to edit it in place.
        <div onDoubleClick={startEdit} className="cursor-text">
          {/* Keyed on the edit time: a read-only MDXEditor only reads `markdown` on mount. */}
          <ThoughtEditor key={comment.updatedAt} markdown={comment.body} readOnly />
        </div>
      )}
    </li>
  );
});

/**
 * Comment thread under a task's thought. Posting, editing and deleting apply
 * immediately (and are undoable) — independent of the thought's own
 * Save/Cancel. Every comment is written and shown with the thought editor.
 * Live progress of an agent working on the task ({@link AgentRunPanel})
 * sits above the thread.
 *
 * The composer stays collapsed behind an "Add comment" button, so a thread
 * costs no editor until someone actually writes; Cancel collapses it again
 * and drops the draft. "Copy context" saves an open edit and posts a written
 * comment before it syncs (`useDraftSaver`). Memoized: typing in the thought
 * above re-renders the host, not this thread — so comment token counts add
 * the *saved* thought, which is also what a comment's "Copy context" request
 * returns.
 */
export const ThoughtComments = memo(function ThoughtComments({ todo }: { todo: Todo }) {
  const dispatch = useAppDispatch();
  const comments = todo.comments ?? [];
  const thought = todo.thought ?? "";
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const close = () => {
    setComposing(false);
    setDraft("");
  };

  const post = () => {
    if (!draft.trim()) {
      return;
    }
    dispatch(addThoughtComment(todo.id, draft));
    close();
  };

  // "Copy context" posts a written comment first, so the copy includes it.
  useDraftSaver(todo.id, () => {
    if (composing) {
      post();
    }
  });

  return (
    <section data-testid="thought-comments" className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center gap-2">
        <h3 className={cn(ui.label, "mr-auto")}>
          Comments{comments.length > 0 && ` (${comments.length})`}
        </h3>
        <RefreshThoughtButton data-testid="thought-comments-refresh-button" />
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className={ui.ghostBtn}
            data-testid="thought-comments-add-button"
          >
            <MessageSquarePlus className="size-3.5" />
            Add comment
          </button>
        )}
      </div>
      <AgentRunPanel todoId={todo.id} title={todo.title} />
      {comments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <CommentItem key={c.id} todoId={todo.id} comment={c} thought={thought} />
          ))}
        </ul>
      )}
      {composing && (
        <div
          className="rounded-md border border-app-border-accent bg-app-bg"
          data-testid="thought-comments-composer"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !draft.trim()) {
              e.stopPropagation();
              close();
            }
          }}
        >
          <ThoughtEditor markdown="" onChange={setDraft} compact autoFocus />
          <div className="flex items-center justify-end gap-2 border-t border-app-border px-3 py-2">
            <TokenCount
              text={draft}
              base={thought}
              className="mr-auto truncate"
              data-testid="thought-comments-token-count"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={close}
              data-testid="thought-comments-cancel-button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={post}
              disabled={!draft.trim()}
              data-testid="thought-comments-post-button"
            >
              Comment
            </Button>
          </div>
        </div>
      )}
    </section>
  );
});
