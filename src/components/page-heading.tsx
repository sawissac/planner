"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { renameFile, setFileIcon } from "@/lib/todoSlice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useHydrated } from "@/components/providers";

const EMOJI_GROUPS = [
  {
    label: "Smileys",
    emojis: [
      "😀",
      "😂",
      "😍",
      "🥰",
      "😎",
      "🤩",
      "😭",
      "😤",
      "🤔",
      "😴",
      "🥳",
      "😇",
      "🤯",
      "🥺",
      "😏",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌸",
      "🌿",
      "🌊",
      "🔥",
      "⭐",
      "🌙",
      "☀️",
      "🌈",
      "❄️",
      "🌵",
      "🍀",
      "🌻",
      "🍂",
      "🌺",
      "🦋",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍕",
      "🍔",
      "🍣",
      "🍜",
      "🍩",
      "🎂",
      "🍎",
      "🥑",
      "🍇",
      "☕",
      "🧃",
      "🍺",
      "🥗",
      "🌮",
      "🍓",
    ],
  },
  {
    label: "Activities",
    emojis: [
      "⚽",
      "🏀",
      "🎮",
      "🎵",
      "🎨",
      "📚",
      "✈️",
      "🚀",
      "🏆",
      "🎯",
      "🎲",
      "🧩",
      "🎸",
      "🏋️",
      "🤸",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "💡",
      "🔑",
      "💎",
      "📌",
      "🗂️",
      "📋",
      "🖊️",
      "🔧",
      "📦",
      "🛒",
      "💻",
      "📱",
      "🖥️",
      "⌚",
      "🎁",
    ],
  },
  {
    label: "Symbols",
    emojis: [
      "❤️",
      "💙",
      "💚",
      "💛",
      "🧡",
      "💜",
      "🖤",
      "🤍",
      "✅",
      "❌",
      "⚡",
      "💫",
      "🔔",
      "🏳️",
      "🎉",
    ],
  },
];

export function PageHeading() {
  const hydrated = useHydrated();
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
      </div>
    );
  }

  if (!activeFile) {
    return (
      <h1 className="text-2xl font-semibold text-muted-foreground">
        No Active File
      </h1>
    );
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
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="text-2xl font-semibold bg-transparent outline-none border-b border-primary"
        />
      ) : (
        <h1
          className="text-2xl font-semibold cursor-text hover:bg-muted/50 rounded px-1 -mx-1 max-w-[220px] truncate"
          onClick={() => {
            setDraft(activeFile.name);
            setEditing(true);
          }}
          title={activeFile.name}
        >
          {activeFile.name}
        </h1>
      )}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          className="text-xl leading-none rounded hover:bg-muted/60 px-1 py-0.5 transition-colors"
          title="Set icon"
        >
          {activeFile.icon ?? "📄"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="flex flex-col gap-3">
            {activeFile.icon && (
              <button
                type="button"
                onClick={() => {
                  dispatch(setFileIcon({ id: activeFile.id, icon: "" }));
                  setPickerOpen(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground text-left"
              >
                Remove icon
              </button>
            )}
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-xs text-muted-foreground mb-1">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        dispatch(
                          setFileIcon({ id: activeFile.id, icon: emoji }),
                        );
                        setPickerOpen(false);
                      }}
                      className="text-lg leading-none rounded hover:bg-muted p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
