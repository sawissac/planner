"use client";

import { Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog, type ConfirmState } from "@/components/customs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu-extras";
import { Input } from "@/components/ui/input";
import {
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTitle,
} from "@/components/ui/sidebar";
import { useSignedIn } from "@/hooks/useSignedIn";
import { cn } from "@/lib/cn";
import {
  addPath,
  listPaths,
  openPath,
  pickFolder,
  type ProjectPath,
  removePath,
  renamePath,
} from "@/lib/project-paths";
import * as ui from "@/lib/ui-styles";

/**
 * Sidebar pane (the rail's Projects tab) listing the user's saved project
 * folders (`project_paths`). The add button opens the OS folder picker and saves the
 * chosen path; clicking a row opens it in the OS file manager. Each row's
 * menu can open, rename (display name only — the folder on disk is left
 * alone) or remove it.
 *
 * Needs a signed-in user (rows live in Supabase) and the app running on
 * localhost (the picker and file manager are driven by `src/app/api/local/`).
 *
 * @param props.onClose - Leaves the pane (back to the file list).
 */
export function ProjectPaths({ onClose }: { onClose: () => void }) {
  const signedIn = useSignedIn();
  const [paths, setPaths] = useState<ProjectPath[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "" });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!signedIn) {
      setPaths([]);
      return;
    }
    void run(async () => setPaths(await listPaths()));
  }, [signedIn]);

  const add = () =>
    run(async () => {
      const path = await pickFolder();
      if (!path) {
        return;
      }
      const created = await addPath(path);
      setPaths((ps) => [...ps, created]);
    });

  const open = (p: ProjectPath) => run(() => openPath(p));

  const renameCommit = (p: ProjectPath) => {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name || name === p.name) {
      return;
    }
    setPaths((ps) => ps.map((x) => (x.id === p.id ? { ...x, name } : x)));
    void run(async () => {
      try {
        await renamePath(p.id, name);
      } catch (e) {
        setPaths((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: p.name } : x)));
        throw e;
      }
    });
  };

  const remove = (p: ProjectPath) =>
    run(async () => {
      await removePath(p.id);
      setPaths((ps) => ps.filter((x) => x.id !== p.id));
    });

  return (
    <>
      <SidebarHeader>
        <SidebarTitle>Projects</SidebarTitle>
        <ButtonGroup
          aria-label="Project actions"
          data-testid="sidebar-projects-actions"
          // Same treatment as the Files pane's action group.
          className="[&>button]:border-app-border-mid [&>button]:bg-app-panel [&>button]:text-app-text [&>button:hover]:bg-app-hover [&>button:hover]:text-app-bright"
        >
          <Button
            size="icon-sm"
            variant="outline"
            onClick={add}
            disabled={!signedIn || busy}
            aria-label="Add project folder"
            title={signedIn ? "Add project folder" : "Sign in to save project folders"}
            data-testid="sidebar-projects-add-button"
          >
            <FolderPlus />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onClose}
            aria-label="Back to files"
            title="Back to files"
            data-testid="sidebar-projects-back-button"
          >
            <X />
          </Button>
        </ButtonGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup data-testid="sidebar-projects">
          {!signedIn ? (
            <p className={cn(ui.help, "px-1")}>Sign in to save project folders.</p>
          ) : (
            paths.length === 0 &&
            !busy && (
              <p className={cn(ui.help, "px-1")}>No folders yet. Add one to open it from here.</p>
            )
          )}

          {error && (
            <p role="alert" className={cn(ui.help, "px-1 text-app-error")}>
              {error}
            </p>
          )}

          {paths.map((p) => {
            const renaming = renamingId === p.id;
            return (
              <SidebarItem key={p.id} asChild>
                <div
                  role="button"
                  tabIndex={0}
                  title={p.path}
                  data-testid={`sidebar-project-${p.id}`}
                  onClick={() => !renaming && open(p)}
                  onKeyDown={(e) => {
                    if (!renaming && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      open(p);
                    }
                  }}
                  className="cursor-pointer items-center gap-2"
                >
                  <Folder className="size-3.5 shrink-0 text-app-dim" />
                  {renaming ? (
                    <Input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => renameCommit(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameCommit(p);
                        }
                        if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Project name"
                      className="h-6 py-0"
                      data-testid={`sidebar-project-${p.id}-rename-input`}
                    />
                  ) : (
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-title font-semibold text-app-text">
                        {p.name}
                      </span>
                      <span className={cn(ui.meta, "truncate")}>{p.path}</span>
                    </span>
                  )}
                  {!renaming && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Options for ${p.name}`}
                          title="Project options"
                          data-testid={`sidebar-project-${p.id}-options`}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className={cn(
                            ui.iconBtn,
                            "size-6 [&_svg]:size-3.5",
                            "aria-expanded:bg-app-hover aria-expanded:text-app-accent",
                          )}
                        >
                          <MoreHorizontal />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48"
                        onClick={(e) => e.stopPropagation()}
                        // Keep focus on the rename field instead of the trigger.
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <DropdownMenuItem onSelect={() => open(p)}>
                          <FolderOpen />
                          Open in file manager
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenameDraft(p.name);
                            setRenamingId(p.id);
                          }}
                        >
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            setConfirmState({
                              open: true,
                              title: "Remove project?",
                              description: `"${p.name}" will be removed from the sidebar. The folder on disk is not touched.`,
                              confirmLabel: "Remove",
                              destructive: true,
                              onConfirm: () => remove(p),
                            })
                          }
                        >
                          <Trash2 />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </SidebarItem>
            );
          })}
        </SidebarGroup>
      </SidebarContent>
      <ConfirmDialog
        state={confirmState}
        onOpenChange={(o) => setConfirmState((s) => ({ ...s, open: o }))}
      />
    </>
  );
}
