"use client";

import { Bot, Terminal } from "lucide-react";
import { useState } from "react";

import { RunAgentDialog } from "@/components/customs/RunAgentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu-extras";
import { useSignedIn } from "@/hooks/useSignedIn";
import { AGENT_PROVIDER_LABEL, type AgentProvider } from "@/lib/agent-servers";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";

/**
 * "Run agent": a menu of agent providers (today only Claude Code) next to
 * "Copy context". Picking one opens {@link RunAgentDialog}, which first asks
 * which project folder the agent works in, then runs it there.
 * Hidden while signed out, like "Copy context": the agent reads the cloud copy.
 *
 * @param todoId - Task whose thought (or comment) is sent.
 * @param commentId - Comment id; omit to run on the thought.
 * @param showLabel - Render "Run agent" next to the icon instead of icon-only.
 */
export function RunAgentButton({
  todoId,
  commentId,
  showLabel = false,
  className,
}: {
  todoId: string;
  commentId?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const signed = useSignedIn();
  const [provider, setProvider] = useState<AgentProvider | null>(null);

  if (!signed) {
    return null;
  }

  const testId = commentId
    ? `thought-comment-${commentId}-run-agent-button`
    : `todo-${todoId}-thought-run-agent-button`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={commentId ? "Run agent on comment" : "Run agent on thought"}
            title="Run agent"
            data-testid={testId}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              showLabel
                ? "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-app-dim transition-colors hover:bg-app-hover hover:text-app-accent focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none aria-expanded:bg-app-hover aria-expanded:text-app-accent"
                : cn(ui.iconBtn, "size-6"),
              "[&_svg]:size-3.5",
              className,
            )}
          >
            <Bot />
            {showLabel && <span>Run agent</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Run with</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => setProvider("claude-code")}
            data-testid={`${testId}-claude-code`}
          >
            <Terminal />
            {AGENT_PROVIDER_LABEL["claude-code"]}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RunAgentDialog
        provider={provider}
        todoId={todoId}
        commentId={commentId}
        onOpenChange={(open) => {
          if (!open) {
            setProvider(null);
          }
        }}
      />
    </>
  );
}
