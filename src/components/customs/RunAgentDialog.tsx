"use client";

import { ArrowLeft, Folder, FolderPlus, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { launchAgentRun } from "@/lib/agent-launch";
import {
  AGENT_PROVIDER_LABEL,
  type AgentProvider,
  type AgentServer,
  getServer,
} from "@/lib/agent-servers";
import { syncNow } from "@/lib/cloud-sync";
import { cn } from "@/lib/cn";
import { saveDrafts } from "@/lib/drafts";
import { planContext } from "@/lib/plan-api-url";
import { addPath, listPaths, pickFolder, type ProjectPath } from "@/lib/project-paths";
import * as ui from "@/lib/ui-styles";
import { useAppSelector } from "@/stores/hooks";
import type { AppStore } from "@/stores/store";

type Step = "project" | "details";
type Phase = "idle" | "syncing" | "starting";

const LAST_PROJECT_KEY = "runAgent.lastProjectId";

function readLastProject(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

function saveLastProject(id: string) {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch {
    // Private mode: just don't remember.
  }
}

/**
 * Step 1 — the question asked before any agent starts: which saved project
 * folder it works in. Folders are the Projects pane's (`project_paths`);
 * "Add folder" opens the OS picker and saves the choice. The last folder
 * used is pre-selected but still has to be confirmed with Continue.
 */
function ProjectQuestion({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: ProjectPath | null;
  onSelect: (p: ProjectPath) => void;
}) {
  const [paths, setPaths] = useState<ProjectPath[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    listPaths()
      .then((list) => {
        setPaths(list);
        const last = list.find((p) => p.id === readLastProject());
        if (last && !selected) {
          onSelect(last);
        }
      })
      .catch((e: Error) => setError(e.message));
    // Load once per open; `selected`/`onSelect` only seed the first pick.
  }, []);

  const add = async () => {
    setAdding(true);
    setError(null);
    try {
      const path = await pickFolder();
      if (path) {
        const existing = paths?.find((p) => p.path === path);
        const entry = existing ?? (await addPath(path));
        if (!existing) {
          setPaths((list) => [...(list ?? []), entry]);
        }
        onSelect(entry);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="run-agent-project-question">
      <p className="text-sm font-semibold text-app-text">Which project should {label} work in?</p>
      {paths === null && !error ? (
        <p className={ui.help}>Loading folders…</p>
      ) : paths?.length === 0 ? (
        <p className={ui.help} data-testid="run-agent-project-empty">
          No saved folders yet. Add the project&apos;s folder to continue.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Project folder"
          className="flex max-h-60 flex-col gap-1.5 overflow-y-auto"
        >
          {paths?.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected?.id === p.id}
              data-selected={selected?.id === p.id || undefined}
              onClick={() => onSelect(p)}
              className={ui.row}
              data-testid={`run-agent-project-${p.id}`}
            >
              <Folder className="size-3.5 shrink-0 text-app-dim" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold text-app-text">{p.name}</span>
                <span className={cn(ui.meta, "truncate")}>{p.path}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => void add()}
        disabled={adding}
        className={cn(ui.ghostBtn, "self-start")}
        data-testid="run-agent-project-add"
      >
        {adding ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FolderPlus className="size-3.5" />
        )}
        Add folder
      </button>
      {error && (
        <p className="rounded-md bg-app-error/10 p-2 text-xs text-app-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function RunAgentForm({
  provider,
  todoId,
  commentId,
  onClose,
}: {
  provider: AgentProvider;
  todoId: string;
  commentId?: string;
  onClose: () => void;
}) {
  const store = useStore() as AppStore;
  const fileId = useAppSelector((s) => s.todos.activeFileId);
  const [server, setServer] = useState<AgentServer | null | undefined>(undefined);
  const [step, setStep] = useState<Step>("project");
  const [project, setProject] = useState<ProjectPath | null>(null);
  const [extra, setExtra] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const context = planContext(todoId, fileId, commentId);
  const label = AGENT_PROVIDER_LABEL[provider];
  const busy = phase !== "idle";

  useEffect(() => {
    getServer(provider)
      .then(setServer)
      .catch((e: Error) => setLoadError(e.message));
  }, [provider]);

  const run = async () => {
    if (!server || !project) {
      return;
    }
    setRunError(null);
    setPhase("syncing");
    // Same as "Copy context": the agent reads the cloud copy, so save + sync first.
    saveDrafts(todoId);
    if (!(await syncNow(store))) {
      setRunError("Sync failed — nothing was sent. Try again.");
      setPhase("idle");
      return;
    }
    setPhase("starting");
    try {
      await launchAgentRun({
        server,
        fileId,
        todoId,
        commentId,
        projectPath: project.path,
        context,
        extraContext: extra,
      });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
      return;
    }
    saveLastProject(project.id);
    // The run goes on; its live progress shows under the task's comments.
    onClose();
  };

  const notReady = loadError ? (
    <p className="rounded-md bg-app-error/10 p-2 text-xs text-app-error" role="alert">
      {loadError}
    </p>
  ) : server === null ? (
    <p className={ui.help} data-testid="run-agent-no-server">
      No {label} server yet. Start <code className="font-mono">execute-cli/claude</code> and set its
      URL and token in Settings → API keys.
    </p>
  ) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Run {label}</DialogTitle>
        <DialogDescription>
          Runs the agent on your computer. What it does shows live under the task&apos;s comments,
          where you can stop it.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-3">
        {server === undefined && !loadError ? (
          <p className={ui.help}>Loading…</p>
        ) : (
          (notReady ??
          (step === "project" ? (
            <ProjectQuestion label={label} selected={project} onSelect={setProject} />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={ui.fieldLabel}>Project</span>
                <div className={cn(ui.card, "flex items-center gap-2 px-2.5 py-1.5")}>
                  <Folder className="size-3.5 shrink-0 text-app-dim" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-semibold text-app-text">
                      {project?.name}
                    </span>
                    <span className={cn(ui.meta, "truncate")}>{project?.path}</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={ui.fieldLabel}>1. Context</span>
                <pre
                  className="overflow-x-auto rounded-md border border-app-border bg-app-hover px-2.5 py-1.5 font-mono text-[11px] whitespace-pre-wrap text-app-dim"
                  data-testid="run-agent-context"
                >
                  {context}
                </pre>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={ui.fieldLabel} htmlFor="run-agent-extra">
                  2. Extra context (optional)
                </label>
                <Textarea
                  id="run-agent-extra"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  disabled={busy}
                  placeholder="Anything else the agent should know — constraints, files to look at…"
                  className="max-h-40"
                  data-testid="run-agent-extra"
                />
              </div>
            </>
          )))
        )}
        {runError && (
          <p
            className="rounded-md bg-app-error/10 p-2 text-xs whitespace-pre-wrap text-app-error"
            role="alert"
            data-testid="run-agent-error"
          >
            {runError}
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        {step === "details" && (
          <Button
            variant="outline"
            onClick={() => setStep("project")}
            disabled={busy}
            className="mr-auto"
            data-testid="run-agent-back"
          >
            <ArrowLeft />
            Project
          </Button>
        )}
        <Button variant="outline" onClick={onClose} data-testid="run-agent-close">
          Cancel
        </Button>
        {step === "project" ? (
          <Button
            onClick={() => setStep("details")}
            disabled={!!notReady || !server || !project}
            data-testid="run-agent-continue"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => void run()}
            disabled={busy || !server || !project}
            data-testid="run-agent-run"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play />}
            {phase === "syncing" ? "Syncing…" : phase === "starting" ? "Starting…" : "Run"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

/**
 * "Run agent" dialog. Before anything starts it asks which project the agent
 * works in (step 1: a saved folder from the Projects pane, or a new one from
 * the OS picker); then it shows what is sent — 1. the "Copy context" text
 * (`planContext`) and 2. optional extra context — and runs the agent through
 * the local server set in Settings → API keys (`execute-cli/claude` for
 * Claude Code).
 *
 * Like "Copy context", it saves open drafts and syncs before sending, since
 * the agent reads the task from the cloud copy. Once the server accepts the
 * run the dialog closes: the agent's live progress shows in
 * {@link AgentRunPanel} under the task's comments, the same as for a pasted
 * Copy context link, and Stop there ends it (`launchAgentRun`).
 *
 * @param provider - Agent to run; `null` keeps the dialog closed.
 * @param todoId - Task whose thought (or comment) is the context.
 * @param commentId - Comment id; omit to run on the thought.
 * @param onOpenChange - Close handler.
 */
export function RunAgentDialog({
  provider,
  todoId,
  commentId,
  onOpenChange,
}: {
  provider: AgentProvider | null;
  todoId: string;
  commentId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={provider !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(560px,94vw)]"
        data-testid="run-agent-dialog"
        // Keep typing in the dialog away from the row/table shortcuts behind it.
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {provider && (
          <RunAgentForm
            provider={provider}
            todoId={todoId}
            commentId={commentId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
