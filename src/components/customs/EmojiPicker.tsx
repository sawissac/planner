"use client";

import {
  Apple,
  Clock,
  Hand,
  Heart,
  Laptop,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Plane,
  Search,
  Shuffle,
  Smile,
  Trophy,
} from "lucide-react";
import { type KeyboardEvent, type ReactElement, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  EMOJI_CATEGORIES,
  type EmojiCategory,
  type EmojiEntry,
  emojiEntry,
  loadRecentEmoji,
  pushRecentEmoji,
  searchEmoji,
} from "@/lib/emoji-data";
import * as ui from "@/lib/ui-styles";

const COLS = 8;

const CATEGORY_ICON: Record<string, LucideIcon> = {
  recent: Clock,
  smileys: Smile,
  people: Hand,
  nature: Leaf,
  food: Apple,
  activities: Trophy,
  travel: Plane,
  objects: Lightbulb,
  tech: Laptop,
  symbols: Heart,
};

const ALL_EMOJI = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

/**
 * Popover emoji picker: name/keyword search, category tabs with scroll-spy,
 * recently used (per browser), arrow-key navigation and a hover preview.
 *
 * Keyboard: type to search, `Enter` picks the first match, `↓` moves into the
 * grid, arrows move within it, `Enter`/`Space` picks, `↑` from the top row
 * returns to search.
 *
 * Picking never steals focus from the caller (mousedown is cancelled), so a
 * rich-text editor keeps its selection for the insert.
 *
 * @param props.trigger - Element that opens the picker; rendered `asChild`.
 * @param props.onPick - Receives the chosen emoji glyph.
 * @param props.value - Current emoji, highlighted in the grid and shown in the
 *   footer when nothing is hovered.
 * @param props.onRemove - When set and `value` is non-empty, the footer offers
 *   a Remove action.
 * @param props.align - Popover alignment against the trigger. Default `"end"`.
 */
export function EmojiPicker({
  trigger,
  onPick,
  value,
  onRemove,
  align = "end",
}: {
  trigger: ReactElement;
  onPick: (emoji: string) => void;
  value?: string;
  onRemove?: () => void;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [preview, setPreview] = useState<EmojiEntry | null>(null);
  const [activeSection, setActiveSection] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length > 0;

  const sections = useMemo<EmojiCategory[]>(() => {
    if (searching) {
      return [{ id: "results", label: "Results", emojis: searchEmoji(query) }];
    }
    const head =
      recent.length > 0 ? [{ id: "recent", label: "Recent", emojis: recent.map(emojiEntry) }] : [];
    return [...head, ...EMOJI_CATEGORIES];
  }, [query, recent, searching]);

  const currentSection = activeSection || sections[0]?.id;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setRecent(loadRecentEmoji());
      setQuery("");
      setPreview(null);
      setActiveSection("");
    }
  };

  const pick = (emoji: string) => {
    setRecent(pushRecentEmoji(emoji));
    onPick(emoji);
    setOpen(false);
  };

  const buttons = () =>
    Array.from(scrollRef.current?.querySelectorAll<HTMLButtonElement>("[data-emoji-btn]") ?? []);

  const focusButton = (index: number) => {
    const btn = buttons()[index];
    btn?.focus();
    btn?.scrollIntoView({ block: "nearest" });
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusButton(0);
    } else if (e.key === "Enter" && searching) {
      e.preventDefault();
      const first = sections[0]?.emojis[0];
      if (first) {
        pick(first.emoji);
      }
    }
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS }[e.key];
    if (delta === undefined) {
      return;
    }
    const list = buttons();
    const idx = list.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) {
      return;
    }
    e.preventDefault();
    const next = idx + delta;
    if (next < 0) {
      searchRef.current?.focus();
      return;
    }
    focusButton(Math.min(next, list.length - 1));
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || searching) {
      return;
    }
    let id = sections[0]?.id ?? "";
    for (const s of el.querySelectorAll<HTMLElement>("[data-section]")) {
      if (s.offsetTop <= el.scrollTop + 4) {
        id = s.dataset.section ?? id;
      }
    }
    setActiveSection(id);
  };

  const jumpTo = (id: string) => {
    const el = scrollRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (el && target) {
      el.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const shown = preview ?? (value ? emojiEntry(value) : null);
  let flatIndex = 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex w-76 max-h-none flex-col overflow-hidden p-0"
        data-testid="emoji-picker"
      >
        <div className="p-2 pb-1">
          <Input
            ref={searchRef}
            autoFocus
            icon={Search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={onSearchKeyDown}
            placeholder="Search emoji…"
            aria-label="Search emoji"
            data-testid="emoji-picker-search"
          />
        </div>

        <div
          role="tablist"
          aria-label="Emoji categories"
          className={cn(
            "flex items-center justify-between border-b border-app-border px-2 pb-1",
            searching && "pointer-events-none opacity-40",
          )}
        >
          {sections.map((s) => {
            const Icon = CATEGORY_ICON[s.id];
            if (!Icon) {
              return null;
            }
            const active = s.id === currentSection;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={s.label}
                title={s.label}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => jumpTo(s.id)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-app-accent-faint text-app-accent"
                    : "text-app-dim hover:bg-app-hover hover:text-app-bright",
                )}
                data-testid={`emoji-picker-tab-${s.id}`}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          onKeyDown={onGridKeyDown}
          className="relative h-64 overflow-y-auto px-2 pb-2"
        >
          {sections.every((s) => s.emojis.length === 0) ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-app-dim">
              <span className="text-2xl">🔍</span>
              No emoji for “{query.trim()}”
            </div>
          ) : (
            sections.map((s) => (
              <section key={s.id} data-section={s.id}>
                <div className={cn(ui.label, "sticky top-0 z-10 bg-app-panel px-1 pt-2 pb-1")}>
                  {s.label}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {s.emojis.map((e) => {
                    const index = flatIndex++;
                    const selected = e.emoji === value;
                    return (
                      <button
                        key={`${s.id}-${e.emoji}`}
                        type="button"
                        data-emoji-btn
                        tabIndex={-1}
                        title={e.name}
                        aria-label={e.name || e.emoji}
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => pick(e.emoji)}
                        onMouseEnter={() => setPreview(e)}
                        onFocus={() => setPreview(e)}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-md text-xl leading-none",
                          "transition-transform duration-100 hover:scale-110 hover:bg-app-hover",
                          "focus-visible:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent",
                          selected && "bg-app-accent-faint ring-1 ring-app-border-accent",
                        )}
                        data-testid={`emoji-picker-item-${index}`}
                      >
                        {e.emoji}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="flex h-12 items-center gap-2 border-t border-app-border px-3">
          {shown ? (
            <>
              <span className="text-2xl leading-none">{shown.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-xs capitalize text-app-text">
                {shown.name}
              </span>
            </>
          ) : (
            <span className="flex-1 text-xs text-app-dim">Pick an emoji</span>
          )}
          <button
            type="button"
            title="Random emoji"
            aria-label="Random emoji"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(ALL_EMOJI[Math.floor(Math.random() * ALL_EMOJI.length)].emoji)}
            className={ui.iconBtn}
            data-testid="emoji-picker-random"
          >
            <Shuffle className="size-4" />
          </button>
          {onRemove && value && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
              className={ui.ghostBtn}
              data-testid="emoji-picker-remove"
            >
              Remove
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
