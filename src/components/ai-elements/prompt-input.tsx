"use client";

import type { ChatStatus } from "ai";
import { CornerDownLeftIcon, Loader2Icon, SquareIcon, XIcon } from "lucide-react";
import {
  type ComponentProps,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEventHandler,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

/**
 * Chat composer: a form framed like a compacto `ui.input` field, holding an
 * auto-growing textarea and a footer row of tools + submit. Enter submits,
 * Shift+Enter breaks the line, IME composition is respected.
 */
export type PromptInputMessage = {
  text: string;
};

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = (new FormData(event.currentTarget).get("message") as string) || "";
    void onSubmit({ text }, event);
  };

  return (
    <form
      data-slot="prompt-input"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md border border-app-border-mid bg-app-bg transition-colors duration-200",
        "focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/30",
        className,
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputBody({ className, ...props }: PromptInputBodyProps) {
  return <div data-slot="prompt-input-body" className={cn("contents", className)} {...props} />;
}

export type PromptInputTextareaProps = ComponentProps<typeof Textarea>;

export function PromptInputTextarea({
  className,
  placeholder = "What would you like to know?",
  onKeyDown,
  ...props
}: PromptInputTextareaProps) {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.key !== "Enter" || e.shiftKey) {
      return;
    }
    if (isComposing || e.nativeEvent.isComposing) {
      return;
    }
    e.preventDefault();
    const form = e.currentTarget.form;
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit?.disabled) {
      return;
    }
    form?.requestSubmit();
  };

  return (
    <Textarea
      data-slot="prompt-input-textarea"
      name="message"
      className={cn(
        "max-h-48 min-h-16 rounded-none border-0 bg-transparent px-3 py-2 focus:ring-0 hover:border-0",
        className,
      )}
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
}

export type PromptInputFooterProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputFooter({ className, ...props }: PromptInputFooterProps) {
  return (
    <div
      data-slot="prompt-input-footer"
      className={cn("flex items-center justify-between gap-1 px-1.5 pb-1.5", className)}
      {...props}
    />
  );
}

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return (
    <div
      data-slot="prompt-input-tools"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
  submitLabel?: string;
};

/** Submit button whose glyph follows the chat status. */
export function PromptInputSubmit({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  submitLabel = "Submit",
  children,
  ...props
}: PromptInputSubmitProps) {
  let icon = <CornerDownLeftIcon className="size-4" />;
  if (status === "submitted") {
    icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === "streaming") {
    icon = <SquareIcon className="size-4" />;
  } else if (status === "error") {
    icon = <XIcon className="size-4" />;
  }

  return (
    <Button
      data-slot="prompt-input-submit"
      aria-label={submitLabel}
      className={className}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? icon}
    </Button>
  );
}
