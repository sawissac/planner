"use client";

import { useEffect, useRef, useState } from "react";

import { EmojiPicker } from "@/components/customs/EmojiPicker";
import { useHydrated } from "@/providers/StoreProvider";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { renameFile, setFileIcon } from "@/stores/slices/todoSlice";

export function PageHeading() {
  const hydrated = useHydrated();
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-7 w-36 rounded bg-app-sidebar" />
        <div className="h-7 w-7 rounded bg-app-sidebar" />
      </div>
    );
  }

  if (!activeFile) {
    return <h1 className="text-2xl font-semibold text-app-dim">No Active File</h1>;
  }

  const commit = () => {
    const n = draft.trim();
    if (n && n !== activeFile.name) {
      dispatch(renameFile({ id: activeFile.id, name: n }));
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          onBlur={commit}
          className="text-2xl font-semibold bg-transparent outline-none border-b border-app-accent"
        />
      ) : (
        <h1
          className="text-2xl font-semibold cursor-text hover:bg-app-sidebar/50 rounded px-1 -mx-1 max-w-[220px] truncate"
          onClick={() => {
            setDraft(activeFile.name);
            setEditing(true);
          }}
          title={activeFile.name}
        >
          {activeFile.name}
        </h1>
      )}

      <EmojiPicker
        align="start"
        value={activeFile.icon || undefined}
        onPick={(icon) => dispatch(setFileIcon({ id: activeFile.id, icon }))}
        onRemove={() => dispatch(setFileIcon({ id: activeFile.id, icon: "" }))}
        trigger={
          <button
            type="button"
            className="text-xl leading-none rounded hover:bg-app-sidebar/60 px-1 py-0.5 transition-colors"
            title="Set icon"
            aria-label="Set icon"
            data-testid="page-heading-icon"
          >
            {activeFile.icon || "📄"}
          </button>
        }
      />
    </div>
  );
}
