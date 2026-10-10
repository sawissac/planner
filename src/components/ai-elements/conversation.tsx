"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Scroll container that sticks to the newest message while streaming. */
export type ConversationProps = ComponentProps<typeof StickToBottom>;

export function Conversation({ className, ...props }: ConversationProps) {
  return (
    <StickToBottom
      data-slot="conversation"
      className={cn("relative flex-1 overflow-y-hidden", className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export function ConversationContent({ className, ...props }: ConversationContentProps) {
  return (
    <StickToBottom.Content
      data-slot="conversation-content"
      className={cn("flex flex-col gap-8 p-4", className)}
      {...props}
    />
  );
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

/** Centered placeholder shown before the first message. */
export function ConversationEmptyState({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      data-slot="conversation-empty-state"
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-app-dim">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-title text-[12px] font-semibold text-app-bright">{title}</h3>
            {description && (
              <p className="font-description text-[12px] text-app-dim">{description}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

/** Floating "jump to latest" button, shown only when scrolled away from the bottom. */
export function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <Button
        data-slot="conversation-scroll-button"
        className={cn("absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full", className)}
        onClick={() => scrollToBottom()}
        size="icon-sm"
        type="button"
        variant="outline"
        aria-label="Scroll to latest"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
}
