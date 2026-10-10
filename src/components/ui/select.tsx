"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Select root. Compose with {@link SelectTrigger} (wrapping a
 * {@link SelectValue}) and {@link SelectContent} full of {@link SelectItem}s.
 *
 * @example
 * ```tsx
 * <Select value={method} onValueChange={setMethod}>
 *   <SelectTrigger size="sm" aria-label="HTTP method">
 *     <SelectValue placeholder="Method" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="GET">GET</SelectItem>
 *     <SelectItem value="POST">POST</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 */
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/**
 * Groups related items. Required around a {@link SelectLabel}, and the thing
 * that gives the label its `aria` relationship to the items beneath it.
 */
function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

/**
 * Renders the chosen item's text inside the trigger.
 *
 * @param props.placeholder - Shown while nothing is selected.
 */
function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/**
 * The closed control. Deliberately the same box as the `input` recipe —
 * hairline `border-mid` on `app-bg`, accent border plus soft ring on focus —
 * so a select and a text field sitting in the same form read as one family.
 *
 * @param props.size - `"default"` is 36px, `"sm"` 32px for dense toolbars.
 * @param props.className - Extra classes merged onto the trigger; the usual
 *   reason is a width, since it sizes to content by default.
 */
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-app-border-mid bg-app-bg px-3 py-2 text-sm whitespace-nowrap text-app-text transition-colors duration-(--motion-duration-fast) outline-none hover:border-app-border-accent focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-app-error aria-invalid:ring-app-error/20 data-[placeholder]:text-app-dim data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-app-dim",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/**
 * The open list.
 *
 * @param props.position - `"item-aligned"` (default) lines the selected item up
 *   over the trigger, the way a native select does. `"popper"` anchors the list
 *   below the trigger instead — use it when the list is long enough that
 *   item alignment would push it off-screen.
 * @param props.className - Extra classes merged onto the list surface.
 */
function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-200 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border border-app-border-mid bg-app-panel text-app-text data-[state=open]:animate-[compacto-fade-up_0.15s_ease]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/**
 * Heading above a group of items.
 *
 * **Must be inside a {@link SelectGroup}** — Radix reads the group's context to
 * wire the label to its items, and throws at render time without it. Nothing
 * about the types says so, which is why it is said here.
 */
function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-app-dim", className)}
      {...props}
    />
  );
}

/**
 * One option. The check indicator sits on the right, so the label column stays
 * flush whether or not an item is selected.
 *
 * @param props.value - The value reported to the root's `onValueChange`.
 * @param props.className - Extra classes merged onto the row.
 */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-app-selected focus:text-app-bright data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-app-dim *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/** Divider between groups of items. */
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-app-border",
        className,
      )}
      {...props}
    />
  );
}

/** Scroll affordance at the top of a long list. Rendered by {@link SelectContent}. */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/** Scroll affordance at the bottom of a long list. Rendered by {@link SelectContent}. */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
