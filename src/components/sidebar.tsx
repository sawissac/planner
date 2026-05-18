"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleCheck,
  Download,
  Eraser,
  FileText,
  ListChecks,
  ListTodo,
  Maximize,
  Minimize,
  Moon,
  PanelRight,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
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
} from "@/lib/todoSlice";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type User } from "@/lib/userSlice";
import { setSidebarWidth, setDarkMode } from "@/lib/settingsSlice";
import { setOpen as setAiOpen } from "@/lib/aiSlice";
import { isTodoFile } from "@/lib/persistence";
import { cn } from "@/lib/utils";
import { nanoid } from "@reduxjs/toolkit";
import { ConfirmDialog, type ConfirmState } from "./confirm-dialog";
import { PromptDialog, type PromptState } from "./prompt-dialog";
import { DriveSyncButton } from "./drive-sync-button";

type ExportBundle = { file: TodoFile; users: User[] }

function isUser(v: unknown): v is User {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.agenda === "string";
}

function isExportBundle(v: unknown): v is ExportBundle {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return isTodoFile(o.file) && Array.isArray(o.users) && o.users.every(isUser);
}

function isTodo(v: unknown): v is Todo {
  if (!v || typeof v !== "object") return false;
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

export function Sidebar({
  open = true,
  onToggle,
  isMobile = false,
}: {
  open?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}) {
  const files = useAppSelector((s) => s.todos.files);
  const activeFileId = useAppSelector((s) => s.todos.activeFileId);
  const users = useAppSelector((s) => s.users.users);
  const width = useAppSelector((s) => s.settings.sidebarWidth);
  const darkMode = useAppSelector((s) => s.settings.darkMode);
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
  const totalDone = files.reduce(
    (acc, f) => acc + f.todos.filter((t) => t.done).length,
    0,
  );
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
    if (parsed.length > 0) dispatch(importFiles(parsed));
  };

  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startW: number; currentW: number } | null>(null);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = dragRef.current.startX - e.clientX;
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

  const toggleBtn = (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onToggle}
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      title={open ? "Close sidebar" : "Open sidebar"}
    >
      <PanelRight className={open ? "" : "rotate-180"} />
    </Button>
  );

  const darkToggleBtn = (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={() => dispatch(setDarkMode(!darkMode))}
      aria-label={darkMode ? "Light mode" : "Dark mode"}
      title={darkMode ? "Light mode" : "Dark mode"}
    >
      {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );

  const aiBtn = (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={() => dispatch(setAiOpen(true))}
      aria-label="AI chat"
      title="AI chat"
    >
      <Sparkles className="size-4" />
    </Button>
  );

  const fullscreenBtn = (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={toggleFs}
      aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFs ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </Button>
  );

  if (!open) {
    if (isMobile) return null;
    return (
      <aside
        style={{ width: 48 }}
        className="shrink-0 border-l border-border bg-sidebar text-sidebar-foreground hidden md:flex flex-col items-center py-3 gap-3 overflow-hidden transition-[width] duration-300 ease-in-out"
      >
        {toggleBtn}
        {aiBtn}
        {darkToggleBtn}
        {fullscreenBtn}
        <div className="w-px h-4 bg-border" />
        <span title={`${totalTodos} total`} className="flex flex-col items-center gap-0.5">
          <ListTodo className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold leading-none">{totalTodos}</span>
        </span>
        <span title={`${totalOpen} open`} className="flex flex-col items-center gap-0.5">
          <ListChecks className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold leading-none">{totalOpen}</span>
        </span>
        <span title={`${totalDone} done`} className="flex flex-col items-center gap-0.5">
          <CircleCheck className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold leading-none">{totalDone}</span>
        </span>
        <div className="w-px h-4 bg-border" />
        <TooltipProvider delay={150}>
          <AnimatePresence initial={false}>
            {files.map((f) => {
              const done = f.todos.filter((t) => t.done).length;
              const total = f.todos.length;
              return (
                <Tooltip key={f.id}>
                  <TooltipTrigger
                    render={
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        type="button"
                        onClick={() => dispatch(setActiveFile(f.id))}
                        aria-label={f.name}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          f.id === activeFileId
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <FileText className="size-4" />
                      </motion.button>
                    }
                  />
                  <TooltipContent side="left">
                    <span className="font-medium">{f.name}</span>
                    <span className="opacity-70 tabular-nums">
                      {done}/{total}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </AnimatePresence>
        </TooltipProvider>
        <ConfirmDialog
          state={confirmState}
          onOpenChange={(o) => setConfirmState((s) => ({ ...s, open: o }))}
        />
        <PromptDialog
          state={promptState}
          onOpenChange={(o) => setPromptState((s) => ({ ...s, open: o }))}
        />
      </aside>
    );
  }

  const mobileWidth = isMobile ? "min(85vw, 360px)" : undefined;

  return (
    <aside
      style={{ width: mobileWidth ?? (dragWidth ?? width) }}
      className={cn(
        "border-l border-border bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden",
        isMobile
          ? "fixed inset-y-0 right-0 z-50 shadow-2xl"
          : "shrink-0 relative",
        !isMobile && dragWidth === null && "transition-[width] duration-300 ease-in-out",
      )}
    >
      {!isMobile && (
        <div
          onMouseDown={startResize}
          className="absolute left-0 top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize group z-10 hidden md:flex items-center justify-center"
        >
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>
      )}
      <div className="flex items-center gap-1 px-2 pt-3 pb-1 shrink-0">
        {toggleBtn}
        <div className="flex-1" />
        {aiBtn}
        {fullscreenBtn}
        {darkToggleBtn}
      </div>

      <div className="flex-1 p-4 pt-1 flex flex-col gap-4 overflow-auto min-w-0">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <ListTodo className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalTodos}</span>
            <span className="text-muted-foreground text-xs">total</span>
          </span>
          <span className="flex items-center gap-1">
            <ListChecks className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalOpen}</span>
            <span className="text-muted-foreground text-xs">open</span>
          </span>
          <span className="flex items-center gap-1">
            <CircleCheck className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalDone}</span>
            <span className="text-muted-foreground text-xs">done</span>
          </span>
        </div>

        {/* Files */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Files</span>
            <div className="flex gap-0.5">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => fileRef.current?.click()}
                aria-label="Import files"
                title="Import JSON files"
              >
                <Upload />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
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
              >
                <Plus />
              </Button>
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
            </div>
          </div>

          {files.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <ListTodo className="size-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No files yet.<br />Create one to get started.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
          {files.map((f) => {
            const active = f.id === activeFileId;
            const renaming = renamingId === f.id;
            const done = f.todos.filter((t) => t.done).length;
            const total = f.todos.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="min-w-0"
              ><div
                onClick={() => !renaming && dispatch(setActiveFile(f.id))}
                draggable={!renaming}
                onDragStart={(e) => {
                  if (renaming) return;
                  setDragFileId(f.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", f.id);
                }}
                onDragOver={(e) => {
                  if (!dragFileId || dragFileId === f.id) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overFileId !== f.id) setOverFileId(f.id);
                }}
                onDragLeave={() => {
                  if (overFileId === f.id) setOverFileId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId =
                    e.dataTransfer.getData("text/plain") || dragFileId;
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
                  "group relative flex flex-col gap-0.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors min-w-0",
                  active ? "bg-primary/10" : "hover:bg-muted",
                  dragFileId === f.id && "opacity-40",
                  overFileId === f.id && dragFileId !== f.id && "ring-2 ring-primary/40",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-file-bar"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                  />
                )}
                {renaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => {
                      const n = renameDraft.trim();
                      if (n) dispatch(renameFile({ id: f.id, name: n }));
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = renameDraft.trim();
                        if (n) dispatch(renameFile({ id: f.id, name: n }));
                        setRenamingId(null);
                      }
                      if (e.key === "Escape") setRenamingId(null);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-7 rounded-md border border-border bg-background px-2 text-sm outline-none"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 h-6">
                      <FileText className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="flex-1 min-w-0 truncate text-sm">{f.name}</span>
                      <div className={cn(
                        "items-center gap-0.5 shrink-0",
                        isMobile
                          ? "flex"
                          : "hidden group-hover:flex [@media(hover:none)]:flex",
                      )}>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameDraft(f.name);
                            setRenamingId(f.id);
                          }}
                          aria-label="Rename"
                          title="Rename"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); exportFile(f, users); }}
                          aria-label="Export"
                          title="Export JSON"
                        >
                          <Download />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (f.todos.length === 0) return;
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
                            });
                          }}
                          disabled={f.todos.length === 0}
                          aria-label="Clear todos"
                          title="Clear todos"
                        >
                          <Eraser />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmState({
                              open: true,
                              title: "Delete file?",
                              description: `"${f.name}" will be removed permanently.`,
                              confirmLabel: "Delete",
                              destructive: true,
                              onConfirm: () => dispatch(deleteFile(f.id)),
                            });
                          }}
                          aria-label="Delete file"
                          title="Delete file"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <span className={cn(
                        "text-xs tabular-nums shrink-0",
                        active ? "text-primary font-medium" : "text-muted-foreground",
                        isMobile
                          ? "hidden"
                          : "group-hover:hidden [@media(hover:none)]:hidden",
                      )}>
                        {done}/{total}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden ml-5">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={false}
                        animate={{ width: `${pct}%`, opacity: total > 0 ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 30 }}
                      />
                    </div>
                  </>
                )}
              </div></motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>
      <div className="border-t border-border px-3 py-2 shrink-0 flex flex-col gap-2">
        <DriveSyncButton />
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/about" className="hover:text-foreground hover:underline">
            About
          </Link>
          <span className="opacity-40">·</span>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <span className="opacity-40">·</span>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
        </div>
      </div>
      <ConfirmDialog
        state={confirmState}
        onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}
      />
      <PromptDialog
        state={promptState}
        onOpenChange={(open) => setPromptState((s) => ({ ...s, open }))}
      />
    </aside>
  );
}
