"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🫡","🤔","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","😮‍💨","🤥","😴","🤤","😪","😵","🤐","🥱","😷","🤒","🤕","🤢","🤮","🥶","🥵",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "👍","👎","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤛","🤜","✊","👊","💪","🦾",
    ],
  },
  {
    name: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","❤️‍🔥","❤️‍🩹","💖","💗","💓","💞","💕","💘","💝","💟","♥️","💔",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "💡","📌","📍","📎","✏️","✒️","🖋️","🖊️","🖍️","📝","📒","📕","📗","📘","📙","📚","📖","🔖","🔗","📅","📆","🗓️","📊","📈","📉","🗂️","📁","📂","🗃️","🗄️","📋","🧷","🔑","🔒","🔓","🔔","🔕","⏰","⏳","⌛",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "✅","❌","⭕","🚫","⚠️","❗","❓","‼️","⁉️","💯","🔥","✨","⭐","🌟","💫","💥","💢","💦","💨","🆗","🆙","🆒","🆕","🆓","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","◼️","◻️","▪️","▫️",
    ],
  },
  {
    name: "Tech",
    emojis: [
      "💻","🖥️","⌨️","🖱️","🖨️","🖲️","💾","💿","📀","📱","☎️","📞","📟","📠","🔌","🔋","🪫","🛰️","📡","🤖","🧠","⚙️","🛠️","🧰",
    ],
  },
  {
    name: "Time",
    emojis: [
      "⏰","⏱️","⏲️","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","📆","📅","🗓️","🌅","🌄","🌇","🌆","🌃",
    ],
  },
];

export function EmojiPicker({
  trigger,
  onPick,
  container,
}: {
  trigger: ReactElement;
  onPick: (emoji: string) => void;
  container?: HTMLElement | null | React.RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      name: c.name,
      emojis: c.emojis.filter(
        (e) => e.includes(query) || c.name.toLowerCase().includes(q),
      ),
    })).filter((c) => c.emojis.length > 0);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-72 p-2" container={container}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji…"
          className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="max-h-72 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matches
            </div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.name} className="mb-2">
                <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {cat.name}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((e, i) => (
                    <button
                      key={`${cat.name}-${i}`}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onPointerDown={(ev) => {
                        ev.preventDefault();
                        onPick(e);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded text-lg",
                        "hover:bg-muted transition-colors cursor-pointer",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
