"use client";

import { useEffect, useState } from "react";

import { type AgentRun, claimFinishedNotice, isActive, watchAgentRun } from "@/lib/agent-runs";

type State = {
  key: string;
  run: AgentRun | null | undefined;
  error: string | null;
  /** A run seen going from active to an end state, until dismissed. */
  finished: AgentRun | null;
};

/**
 * Live view of a task's latest agent run (`@/lib/agent-runs`). `run` is
 * `undefined` while loading or disabled, `null` when there is none.
 * `finished` is set once when a run this hook watched while active
 * (`running`/`waiting`) reaches `done` or `failed` — the cue for the
 * "finished" toast — and only in one mounted hook per run.
 */
export function useAgentRun(fileId: string | null, todoId: string, enabled: boolean) {
  const key = `${fileId}/${todoId}`;
  const [state, setState] = useState<State>({ key, run: undefined, error: null, finished: null });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let activeId: string | null = null;
    return watchAgentRun(
      fileId,
      todoId,
      (run) => {
        let finished: AgentRun | null = null;
        if (run && isActive(run.status)) {
          activeId = run.runId;
        } else if (run?.runId === activeId) {
          activeId = null;
          finished = claimFinishedNotice(run.runId) ? run : null;
        }
        setState((s) => ({
          key,
          run,
          error: null,
          finished: finished ?? (s.key === key ? s.finished : null),
        }));
      },
      (e) => setState((s) => ({ ...s, key, error: e.message })),
    );
  }, [enabled, fileId, todoId, key]);

  const current = enabled && state.key === key;
  return {
    run: current ? state.run : undefined,
    error: current ? state.error : null,
    finished: current ? state.finished : null,
    dismissFinished: () => setState((s) => ({ ...s, finished: null })),
  };
}
