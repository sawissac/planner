"use client";

import type { UIMessage } from "ai";
import { type ComponentProps, type HTMLAttributes, memo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/cn";

/**
 * One chat turn. `from` places the bubble: user turns sit right on the
 * sidebar tone, assistant turns read as plain prose on the panel.
 */
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      data-slot="message"
      data-from={from}
      className={cn(
        "group flex w-full max-w-[95%] flex-col gap-2",
        from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-fit max-w-full min-w-0 flex-col gap-2 overflow-hidden text-[13px] leading-relaxed text-app-text",
        "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:border group-[.is-user]:border-app-border group-[.is-user]:bg-app-sidebar group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-app-bright",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

/** Markdown body of a turn, rendered by Streamdown; memoised on its text. */
export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

MessageResponse.displayName = "MessageResponse";
