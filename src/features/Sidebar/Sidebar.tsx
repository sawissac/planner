"use client";

import { nanoid } from "@reduxjs/toolkit";
import {
  BrainCircuit,
  CircleCheck,
  Download,
  Eraser,
  FileText,
  ListChecks,
  ListTodo,
  Maximize,
  Minimize,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { CloudSyncButton } from "@/components/customs/CloudSyncButton";
import { ConfirmDialog, type ConfirmState } from "@/components/customs/ConfirmDialog";
import { PromptDialog, type PromptState } from "@/components/customs/PromptDialog";
import { StorageMeter } from "@/components/customs/StorageMeter";
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
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarRail,
  SidebarRailButton,
  SidebarRailSpacer,
  SidebarRailTablist,
  SidebarSeparator,
  SidebarTitle,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AiProviderSettings } from "@/features/AiChat/AiProviderSettings";
import { cn } from "@/lib/cn";
import { isTodoFile } from "@/lib/persistence";
import * as ui from "@/lib/ui-styles";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setOpen as setAiOpen, setSidebarView, showAiProviders } from "@/stores/slices/aiSlice";
import { setSidebarWidth } from "@/stores/slices/settingsSlice";
import {
  clearAll,
  createFile,
  deleteFile,
  importFiles,
  renameFile,
  reorderFile,
  setActiveFile,
  type Todo,
  type TodoFile,
} from "@/stores/slices/todoSlice";
import { type User } from "@/stores/slices/userSlice";

type ExportBundle = { file: TodoFile; users: User[] };

function isUser(v: unknown): v is User {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.agenda === "string";
}

function isExportBundle(v: unknown): v is ExportBundle {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return isTodoFile(o.file) && Array.isArray(o.users) && o.users.every(isUser);
}

function isTodo(v: unknown): v is Todo {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.done === "boolean" &&
    typeof o.createdAt === "number"
  );
}

function fileNameFromPath(name: string): string {
  return name.replace(/\.(json|plan)$/i, "");
}

function exportFile(file: TodoFile, users: User[]) {
  const bundle: ExportBundle = { file, users };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${file.name}.plan`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function useFullscreen() {
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };
  return { isFs, toggle };
}

/**
 * App navigation, built on compacto-ui's sidebar: an always-present icon
 * `SidebarRail` (pane toggle, one tab per file, AI chat,
 * fullscreen, settings) next to a resizable `Sidebar` pane listing the files
 * with totals, per-file progress, and storage / sync in the footer.
 *
 * @param props.open - Whether the file pane is shown; the rail always is.
 * @param props.onToggle - Opens / closes the pane.
 * @param props.onOpenSettings - Opens the settings dialog.
 * @param props.isMobile - Overlay layout; nothing renders while closed.
 */
export function AppSidebar({
  open = true,
  onToggle,
  onOpenSettings,
  isMobile = false,
}: {
  open?: boolean;
  onToggle?: () => void;
  onOpenSettings?: () => void;
  isMobile?: boolean;
}) {
  const files = useAppSelector((s) => s.todos.files);
  const activeFileId = useAppSelector((s) => s.todos.activeFileId);
  const users = useAppSelector((s) => s.users.users);
  const width = useAppSelector((s) => s.settings.sidebarWidth);
  const view = useAppSelector((s) => s.ai.sidebarView);
  const dispatch = useAppDispatch();
  const { isFs, toggle: toggleFs } = useFullscreen();
  const fileRef = useRef<HTMLInputElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [dragFileId, setDragFileId] = useState<string | null>(null);
  const [overFileId, setOverFileId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
  });
  const [promptState, setPromptState] = useState<PromptState>({
    open: false,
    title: "",
  });

  const totalTodos = files.reduce((acc, f) => acc + f.todos.length, 0);
  const totalDone = files.reduce((acc, f) => acc + f.todos.filter((t) => t.done).length, 0);
  const totalOpen = totalTodos - totalDone;

  const onImport = async (fileList: FileList) => {
    const parsed: TodoFile[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        if (isExportBundle(data)) {
          parsed.push({ ...data.file, id: nanoid() });
          for (const u of data.users) {
            if (!users.some((x) => x.id === u.id)) {
              dispatch({ type: "users/addUser", payload: u });
            }
          }
        } else if (isTodoFile(data)) {
          parsed.push({ ...data, id: nanoid() });
        } else if (Array.isArray(data) && data.every(isTodo)) {
          parsed.push({
            id: nanoid(),
            name: fileNameFromPath(file.name),
            groups: [],
            todos: data,
          });
        } else {
          alert(`Skipped ${file.name}: invalid format`);
        }
      } catch (e) {
        alert(`Failed ${file.name}: ${(e as Error).message}`);
      }
    }
    if (parsed.length > 0) {
      dispatch(importFiles(parsed));
    }
  };

  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startW: number; currentW: number } | null>(null);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) {
        return;
      }
      const dx = e.clientX - dragRef.current.startX;
      const clamped = Math.max(200, Math.min(640, dragRef.current.startW + dx));
      dragRef.current.currentW = clamped;
      setDragWidth(clamped);
    }
    function onUp() {
      if (dragRef.current) {
        dispatch(setSidebarWidth(dragRef.current.currentW));
      }
      dragRef.current = null;
      setDragWidth(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dispatch]);

  const startResize = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startW: width, currentW: width };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const renameCommit = (id: string) => {
    const n = renameDraft.trim();
    if (n) {
      dispatch(renameFile({ id, name: n }));
    }
    setRenamingId(null);
  };

  const rail = (
    <SidebarRail data-testid="sidebar-rail" aria-label="App">
      <RailButton
        label={open ? "Close sidebar" : "Open sidebar"}
        onClick={onToggle}
        testId="sidebar-rail-toggle"
      >
        <PanelLeft className={open ? "" : "rotate-180"} />
      </RailButton>
      <SidebarSeparator className="my-1 w-6" />
      <SidebarRailTablist aria-label="Files" className="min-h-0 overflow-y-auto">
        {files.map((f) => {
          const done = f.todos.filter((t) => t.done).length;
          return (
            <RailButton
              key={f.id}
              label={`${f.name} · ${done}/${f.todos.length}`}
              role="tab"
              aria-selected={view === "files" && f.id === activeFileId}
              data-active={(view === "files" && f.id === activeFileId) || undefined}
              onClick={() => {
                dispatch(setActiveFile(f.id));
                dispatch(setSidebarView("files"));
              }}
              testId={`sidebar-rail-file-${f.id}`}
            >
              <FileText />
            </RailButton>
          );
        })}
      </SidebarRailTablist>
      <SidebarRailSpacer />
      <RailButton
        label="AI chat"
        onClick={() => dispatch(setAiOpen(true))}
        testId="sidebar-rail-ai"
      >
        <Sparkles />
      </RailButton>
      <RailButton
        label="AI providers"
        data-active={(open && view === "ai") || undefined}
        onClick={() =>
          dispatch(open && view === "ai" ? setSidebarView("files") : showAiProviders())
        }
        testId="sidebar-rail-ai-providers"
      >
        <BrainCircuit />
      </RailButton>
      <RailButton
        label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
        onClick={toggleFs}
        testId="sidebar-rail-fullscreen"
      >
        {isFs ? <Minimize /> : <Maximize />}
      </RailButton>
      <RailButton label="Settings" onClick={onOpenSettings} testId="sidebar-rail-settings">
        <Settings />
      </RailButton>
    </SidebarRail>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        state={confirmState}
        onOpenChange={(o) => setConfirmState((s) => ({ ...s, open: o }))}
      />
      <PromptDialog
        state={promptState}
        onOpenChange={(o) => setPromptState((s) => ({ ...s, open: o }))}
      />
    </>
  );

  if (!open) {
    if (isMobile) {
      return null;
    }
    return (
      <aside data-testid="sidebar" className="hidden h-full shrink-0 md:flex">
        {rail}
        {dialogs}
      </aside>
    );
  }

  const mobileWidth = isMobile ? "min(85vw, 360px)" : undefined;

  return (
    <aside
      data-testid="sidebar"
      className={cn("flex h-full", isMobile ? "fixed inset-y-0 left-0 z-50" : "relative shrink-0")}
    >
      {rail}
      <Sidebar
        data-testid="sidebar-pane"
        style={{ width: mobileWidth ?? dragWidth ?? width }}
        className={cn(
          "relative border-r border-app-border",
          !isMobile && dragWidth === null && "transition-[width] duration-300 ease-in-out",
        )}
      >
        {!isMobile && (
          <div
            onMouseDown={startResize}
            aria-hidden
            className="group absolute top-0 right-0 z-10 hidden h-full w-3 translate-x-1/2 cursor-ew-resize items-center justify-center md:flex"
          >
            <div className="h-8 w-0.5 rounded-full bg-app-border transition-colors group-hover:bg-app-accent/50" />
          </div>
        )}

        {view === "ai" ? (
          <>
            <SidebarHeader>
              <SidebarTitle>AI providers</SidebarTitle>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => dispatch(setSidebarView("files"))}
                aria-label="Back to files"
                title="Back to files"
                data-testid="sidebar-ai-back-button"
              >
                <X />
              </Button>
            </SidebarHeader>
            <SidebarContent>
              <AiProviderSettings />
            </SidebarContent>
          </>
        ) : (
          <>
            <SidebarHeader>
              <SidebarTitle>Files</SidebarTitle>
              <ButtonGroup
                aria-label="File actions"
                data-testid="sidebar-file-actions"
                // Same panel tone + stronger edge as the totals strip, so the pair
                // reads as one control on every palette.
                className="[&>button]:border-app-border-mid [&>button]:bg-app-panel [&>button]:text-app-text [&>button:hover]:bg-app-hover [&>button:hover]:text-app-bright"
              >
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Import files"
                  title="Import JSON files"
                  data-testid="sidebar-import-button"
                >
                  <Upload />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => {
                    setPromptState({
                      open: true,
                      title: "New file",
                      description: "Name the new file.",
                      defaultValue: "Untitled",
                      placeholder: "File name",
                      confirmLabel: "Create",
                      onConfirm: (name) => dispatch(createFile(name)),
                    });
                  }}
                  aria-label="New file"
                  title="New file"
                  data-testid="sidebar-new-file-button"
                >
                  <Plus />
                </Button>
              </ButtonGroup>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.plan,application/json,text/plain,*/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onImport(e.target.files);
                  }
                  e.target.value = "";
                }}
              />
            </SidebarHeader>

            <SidebarContent>
              {/* Totals across every file */}
              <SidebarGroup>
                <div
                  role="group"
                  aria-label="Totals"
                  data-testid="sidebar-totals"
                  className="grid grid-cols-3 divide-x divide-app-border overflow-hidden rounded-md border border-app-border bg-app-panel"
                >
                  {[
                    { icon: ListTodo, value: totalTodos, label: "total" },
                    { icon: ListChecks, value: totalOpen, label: "open" },
                    { icon: CircleCheck, value: totalDone, label: "done" },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="flex flex-col gap-0.5 px-2.5 py-1.5">
                      <span className="flex items-center gap-1 text-app-dim">
                        <Icon className="size-3" />
                        <span className={ui.label}>{label}</span>
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-app-bright tabular-nums">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup>
                {files.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <ListTodo className="size-8 text-app-dim/40" />
                    <p className={ui.help}>
                      No files yet.
                      <br />
                      Create one to get started.
                    </p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {files.map((f) => {
                    const active = f.id === activeFileId;
                    const renaming = renamingId === f.id;
                    const done = f.todos.filter((t) => t.done).length;
                    const total = f.todos.length;
                    return (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        className="min-w-0"
                      >
                        <SidebarItem asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            data-selected={active || undefined}
                            data-testid={`sidebar-file-${f.id}`}
                            onClick={() => !renaming && dispatch(setActiveFile(f.id))}
                            onKeyDown={(e) => {
                              if (!renaming && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                dispatch(setActiveFile(f.id));
                              }
                            }}
                            draggable={!renaming}
                            onDragStart={(e) => {
                              if (renaming) {
                                return;
                              }
                              setDragFileId(f.id);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", f.id);
                            }}
                            onDragOver={(e) => {
                              if (!dragFileId || dragFileId === f.id) {
                                return;
                              }
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (overFileId !== f.id) {
                                setOverFileId(f.id);
                              }
                            }}
                            onDragLeave={() => {
                              if (overFileId === f.id) {
                                setOverFileId(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const fromId = e.dataTransfer.getData("text/plain") || dragFileId;
                              if (fromId && fromId !== f.id) {
                                dispatch(reorderFile({ fromId, toId: f.id }));
                              }
                              setDragFileId(null);
                              setOverFileId(null);
                            }}
                            onDragEnd={() => {
                              setDragFileId(null);
                              setOverFileId(null);
                            }}
                            className={cn(
                              "cursor-pointer flex-col items-stretch gap-1.5",
                              dragFileId === f.id && "opacity-40",
                              overFileId === f.id &&
                                dragFileId !== f.id &&
                                "ring-2 ring-app-accent/40",
                            )}
                          >
                            <div className="flex h-6 min-w-0 items-center gap-2">
                              <FileText
                                className={cn(
                                  "size-3.5 shrink-0",
                                  active ? "text-app-accent" : "text-app-dim",
                                )}
                              />
                              {renaming ? (
                                <Input
                                  autoFocus
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  onBlur={() => renameCommit(f.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      renameCommit(f.id);
                                    }
                                    if (e.key === "Escape") {
                                      setRenamingId(null);
                                    }
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="File name"
                                  className="h-6 py-0"
                                  data-testid={`sidebar-file-${f.id}-rename-input`}
                                />
                              ) : (
                                <span
                                  className={cn(
                                    "min-w-0 flex-1 truncate font-title font-semibold",
                                    active ? "text-app-bright" : "text-app-text",
                                  )}
                                >
                                  {f.name}
                                </span>
                              )}
                              {!renaming && (
                                <>
                                  <span
                                    className={cn(
                                      ui.meta,
                                      "shrink-0 tabular-nums",
                                      active && "text-app-accent",
                                    )}
                                  >
                                    {done}/{total}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        aria-label={`Options for ${f.name}`}
                                        title="File options"
                                        data-testid={`sidebar-file-${f.id}-options`}
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
                                      className="w-44"
                                      onClick={(e) => e.stopPropagation()}
                                      // Keep focus where the action put it (the
                                      // rename field) instead of back on the trigger.
                                      onCloseAutoFocus={(e) => e.preventDefault()}
                                    >
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          setRenameDraft(f.name);
                                          setRenamingId(f.id);
                                        }}
                                      >
                                        <Pencil />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => exportFile(f, users)}>
                                        <Download />
                                        Export
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={f.todos.length === 0}
                                        className="data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        onSelect={() =>
                                          setConfirmState({
                                            open: true,
                                            title: "Clear todos?",
                                            description: `Remove all todos in "${f.name}".`,
                                            confirmLabel: "Clear",
                                            destructive: true,
                                            onConfirm: () => {
                                              dispatch(setActiveFile(f.id));
                                              dispatch(clearAll());
                                            },
                                          })
                                        }
                                      >
                                        <Eraser />
                                        Clear todos
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() =>
                                          setConfirmState({
                                            open: true,
                                            title: "Delete file?",
                                            description: `"${f.name}" will be removed permanently.`,
                                            confirmLabel: "Delete",
                                            destructive: true,
                                            onConfirm: () => dispatch(deleteFile(f.id)),
                                          })
                                        }
                                      >
                                        <Trash2 />
                                        Delete file
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                            </div>
                            {total > 0 && (
                              <Progress
                                size="sm"
                                value={done}
                                max={total}
                                aria-label={`${f.name}: ${done} of ${total} done`}
                                className="pl-5"
                              />
                            )}
                          </div>
                        </SidebarItem>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </SidebarGroup>
            </SidebarContent>
          </>
        )}

        <SidebarFooter className="flex-col items-stretch">
          <StorageMeter />
          <CloudSyncButton />
        </SidebarFooter>
      </Sidebar>
      {dialogs}
    </aside>
  );
}

/** Icon button on the rail, with its label as a right-side tooltip. */
function RailButton({
  label,
  testId,
  children,
  ...props
}: React.ComponentProps<typeof SidebarRailButton> & { label: string; testId?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarRailButton aria-label={label} data-testid={testId} {...props}>
          {children}
        </SidebarRailButton>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
