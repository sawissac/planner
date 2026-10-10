"use client";

import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";

type Shortcut = { keys: string[]; desc: string };

const GROUPS: { label: string; items: Shortcut[] }[] = [
  {
    label: "Global",
    items: [
      { keys: ["?"], desc: "Open this shortcut help" },
      { keys: ["Shift", "F"], desc: "Toggle fullscreen" },
      { keys: ["Shift", "S"], desc: "Toggle sidebar" },
      { keys: ["Shift", "Z"], desc: "Toggle focus mode" },
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
    <kbd className="inline-flex items-center px-1.5 py-0.5 border border-app-border rounded text-[11px] leading-none font-mono bg-app-sidebar">
      {children}
    </kbd>
  );
}

/** Every keyboard shortcut, grouped — shared by the help dialog and Settings. */
export function ShortcutList() {
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className={cn(ui.label, "mb-2")}>{g.label}</div>
          <div className="flex flex-col gap-1.5">
            {g.items.map((s) => (
              <div key={s.desc} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-app-bright">{s.desc}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k, i) => (
                    <span key={k} className="flex items-center gap-1">
                      {i > 0 && <span className="text-app-dim text-xs">+</span>}
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
      <DialogContent className="w-[min(448px,92vw)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to reopen this help.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh]">
          <ShortcutList />
        </DialogBody>
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
  onToggleFocus,
}: {
  onToggleSidebar?: () => void;
  onToggleFullscreen?: () => void;
  onToggleFocus?: () => void;
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
        } else if (e.key === "Z" || e.key === "z") {
          e.preventDefault();
          onToggleFocus?.();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleSidebar, onToggleFullscreen, onToggleFocus]);
  return { open, setOpen };
}
