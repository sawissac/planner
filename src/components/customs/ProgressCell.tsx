"use client";

import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";

import { useConfirm } from "@/components/customs/ConfirmDialog";
import { PromptDialog, type PromptState } from "@/components/customs/PromptDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu-extras";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
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
  done: "text-app-success border tint-current",
  inprogress: "text-app-accent border tint-current",
  "in progress": "text-app-accent border tint-current",
  "not started": "bg-app-sidebar text-app-dim",
};

function colorFor(p: string): string {
  return PROGRESS_COLOR[p.toLowerCase()] ?? "text-app-dim border tint-current";
}

export function ProgressCell({ id, progress }: { id: string; progress: string | null }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
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
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-full justify-between gap-1 px-2 text-xs font-normal"
          >
            {progress ? (
              <span className={cn("rounded-md px-1.5 py-0.5", colorFor(progress))}>{progress}</span>
            ) : (
              <span className="text-app-dim">—</span>
            )}
            <ChevronDown className="size-3 text-app-dim" />
          </Button>
        </DropdownMenuTrigger>
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
                    className="rounded p-0.5 text-app-dim hover:bg-app-hover hover:text-app-bright"
                    aria-label={`Rename ${p}`}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirm({
                        title: `Delete progress "${p}"?`,
                        description: "It will be removed from the progress options.",
                        confirmLabel: "Delete",
                        destructive: true,
                        onConfirm: () => {
                          dispatch(removeProgressOption(p));
                          if (progress === p) {
                            setProgress(null);
                          }
                        },
                      });
                    }}
                    className="rounded p-0.5 text-app-dim hover:bg-app-error/10 hover:text-app-error"
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
            <Input
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
