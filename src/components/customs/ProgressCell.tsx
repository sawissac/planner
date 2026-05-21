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
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addProgressOption,
  DEFAULT_PROGRESS_OPTIONS,
  removeProgressOption,
  renameProgressOption,
} from "@/stores/slices/settingsSlice";
import { renameProgressValue, updateTodo } from "@/stores/slices/todoSlice";

const DEFAULTS = new Set<string>(DEFAULT_PROGRESS_OPTIONS);

const PROGRESS_COLOR: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  inprogress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "in progress": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "not started": "bg-muted text-muted-foreground",
};

function colorFor(p: string): string {
  return PROGRESS_COLOR[p.toLowerCase()] ?? "bg-violet-500/15 text-violet-600 dark:text-violet-400";
}

export function ProgressCell({ id, progress }: { id: string; progress: string | null }) {
  const dispatch = useAppDispatch();
  const options = useAppSelector((s) => s.settings.progressOptions);
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState<PromptState>({ open: false, title: "" });

  const setProgress = (p: string | null) => {
    dispatch(updateTodo({ id, progress: p }));
  };

  const addNew = () => {
    const v = draft.trim();
    if (!v) {
      return;
    }
    dispatch(addProgressOption(v));
    setProgress(v);
    setDraft("");
  };

  const openRename = (from: string) => {
    setPrompt({
      open: true,
      title: "Rename progress",
      placeholder: "Progress name",
      defaultValue: from,
      confirmLabel: "Rename",
      onConfirm: (to) => {
        const next = to.trim();
        if (!next || next === from) {
          return;
        }
        dispatch(renameProgressOption({ from, to: next }));
        dispatch(renameProgressValue({ from, to: next }));
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
              {progress ? (
                <span className={cn("rounded-md px-1.5 py-0.5", colorFor(progress))}>
                  {progress}
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
              onClick={() => setProgress(p)}
              className="flex items-center gap-2"
            >
              <span className={cn("flex-1 rounded-md px-1.5 py-0.5 text-xs truncate", colorFor(p))}>
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
                      dispatch(removeProgressOption(p));
                      if (progress === p) {
                        setProgress(null);
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
          {progress && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProgress(null)}>Clear</DropdownMenuItem>
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
            <Button size="icon-sm" variant="ghost" onClick={addNew} aria-label="Add progress">
              <Plus className="size-3.5" />
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog state={prompt} onOpenChange={(open) => setPrompt((s) => ({ ...s, open }))} />
    </>
  );
}
