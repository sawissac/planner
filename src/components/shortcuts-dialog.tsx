"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

type Shortcut = { keys: string[]; desc: string };

const GROUPS: { label: string; items: Shortcut[] }[] = [
  {
    label: "Global",
    items: [
      { keys: ["?"], desc: "Open this shortcut help" },
      { keys: ["Shift", "F"], desc: "Toggle fullscreen" },
      { keys: ["Shift", "S"], desc: "Toggle sidebar" },
      { keys: ["Shift", "D"], desc: "Toggle dark mode" },
      { keys: ["Esc"], desc: "Close dialog / cancel edit" },
    ],
  },
  {
    label: "Todo table",
    items: [
      { keys: ["↑", "↓"], desc: "Move between rows" },
      { keys: ["Enter"], desc: "Edit focused row" },
      { keys: ["Space"], desc: "Toggle done" },
      { keys: ["Del"], desc: "Delete row" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 border border-border rounded text-[11px] leading-none font-mono bg-muted">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to reopen this help.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2 max-h-[60vh] overflow-auto">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {g.label}
              </div>
              <div className="flex flex-col gap-1.5">
                {g.items.map((s) => (
                  <div
                    key={s.desc}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <span className="text-foreground">{s.desc}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground text-xs">+</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onOpen}
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
    >
      <Keyboard className="size-4" />
    </Button>
  );
}

export function useShortcutsController({
  onToggleSidebar,
  onToggleFullscreen,
  onToggleDark,
}: {
  onToggleSidebar?: () => void;
  onToggleFullscreen?: () => void;
  onToggleDark?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "F" || e.key === "f") {
          e.preventDefault();
          onToggleFullscreen?.();
        } else if (e.key === "S" || e.key === "s") {
          e.preventDefault();
          onToggleSidebar?.();
        } else if (e.key === "D" || e.key === "d") {
          e.preventDefault();
          onToggleDark?.();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleSidebar, onToggleFullscreen, onToggleDark]);
  return { open, setOpen };
}
