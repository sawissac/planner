"use client";

import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";

import { PromptDialog, type PromptState } from "@/components/customs/PromptDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addPriorityOption,
  DEFAULT_PRIORITY_OPTIONS,
  removePriorityOption,
  renamePriorityOption,
} from "@/stores/slices/settingsSlice";
import { renamePriorityValue, updateTodo } from "@/stores/slices/todoSlice";

const DEFAULTS = new Set<string>(DEFAULT_PRIORITY_OPTIONS);
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<string, string> = {
  highest: "bg-red-500/15 text-red-600 dark:text-red-400",
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
  must: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  deferred: "bg-muted text-muted-foreground",
};

function colorFor(p: string): string {
  return PRIORITY_COLOR[p.toLowerCase()] ?? "bg-blue-500/15 text-blue-600 dark:text-blue-400";
}

export function PriorityCell({ id, priority }: { id: string; priority: string | null }) {
  const dispatch = useAppDispatch();
  const options = useAppSelector((s) => s.settings.priorityOptions);
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState<PromptState>({ open: false, title: "" });

  const setPriority = (p: string | null) => {
    dispatch(updateTodo({ id, priority: p }));
  };

  const addNew = () => {
    const v = draft.trim();
    if (!v) {
      return;
    }
    dispatch(addPriorityOption(v));
    setPriority(v);
    setDraft("");
  };

  const openRename = (from: string) => {
    setPrompt({
      open: true,
      title: "Rename priority",
      placeholder: "Priority name",
      defaultValue: from,
      confirmLabel: "Rename",
      onConfirm: (to) => {
        const next = to.trim();
        if (!next || next === from) {
          return;
        }
        dispatch(renamePriorityOption({ from, to: next }));
        dispatch(renamePriorityValue({ from, to: next }));
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-full justify-between gap-1 px-2 text-xs font-normal"
            >
              {priority ? (
                <span className={cn("rounded-md px-1.5 py-0.5 capitalize", colorFor(priority))}>
                  {priority}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          {options.map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={() => setPriority(p)}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  "flex-1 rounded-md px-1.5 py-0.5 text-xs capitalize truncate",
                  colorFor(p),
                )}
              >
                {p}
              </span>
              {!DEFAULTS.has(p) && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(p);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Rename ${p}`}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(removePriorityOption(p));
                      if (priority === p) {
                        setPriority(null);
                      }
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${p}`}
                  >
                    <X className="size-3" />
                  </button>
                </>
              )}
            </DropdownMenuItem>
          ))}
          {priority && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPriority(null)}>Clear</DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <div className="flex items-center gap-1 px-1.5 py-1" onClick={(e) => e.stopPropagation()}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNew();
                }
                e.stopPropagation();
              }}
              placeholder="Add new..."
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button size="icon-sm" variant="ghost" onClick={addNew} aria-label="Add priority">
              <Plus className="size-3.5" />
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog state={prompt} onOpenChange={(open) => setPrompt((s) => ({ ...s, open }))} />
    </>
  );
}
